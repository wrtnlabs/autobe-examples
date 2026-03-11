import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdmin";
import type { IDiscussionBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticle";
import type { IDiscussionBoardArticleFile } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticleFile";
import type { IDiscussionBoardArticleImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticleImage";
import type { IDiscussionBoardArticleSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticleSnapshot";
import type { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";
import type { IDiscussionBoardSection } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSection";
import type { IDiscussionBoardTag } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardTag";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIDiscussionBoardArticleSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardArticleSnapshot";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";
import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_discussion_board_admin_sections_create } from "../../../generate/generate_random_discussion_board_admin_sections_create";
import { generate_random_discussion_board_member_articles_create } from "../../../generate/generate_random_discussion_board_member_articles_create";
import { prepare_random_discussion_board_article } from "../../../prepare/prepare_random_discussion_board_article";
import { prepare_random_discussion_board_section } from "../../../prepare/prepare_random_discussion_board_section";

export async function test_api_article_snapshot_soft_deleted_article(
  connection: api.IConnection,
): Promise<void> {
  // 1. Administrator setup - create admin account and authenticate
  const adminConnection: api.IConnection = { host: connection.host };
  const adminAuth = await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      bio: RandomGenerator.paragraph({ sentences: 2 }),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IDiscussionBoardAdmin.IJoin,
  });
  typia.assert(adminAuth);
  // 2. Create section for article categorization
  const section = await generate_random_discussion_board_admin_sections_create(
    adminConnection,
    {},
  );
  typia.assert(section);
  // 3. Member setup - create member account and authenticate
  const memberConnection: api.IConnection = { host: connection.host };
  const memberAuth = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      bio: RandomGenerator.paragraph({ sentences: 2 }),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IDiscussionBoardMember.IJoin,
  });
  typia.assert(memberAuth);
  // 4. Create article (generates initial snapshot)
  const article = await generate_random_discussion_board_member_articles_create(
    memberConnection,
    {
      body: {
        sectionId: section.id,
      },
    },
  );
  typia.assert(article);
  // 5. Update article to generate additional snapshot
  const updatedTitle = RandomGenerator.paragraph({ sentences: 2 });
  const updatedArticle =
    await api.functional.discussionBoard.member.articles.update(
      memberConnection,
      {
        articleId: article.id,
        body: {
          title: updatedTitle,
        } satisfies IDiscussionBoardArticle.IUpdate,
      },
    );
  typia.assert(updatedArticle);
  TestValidator.equals(
    "article title updated",
    updatedArticle.title,
    updatedTitle,
  );
  // 6. Soft delete the article
  await api.functional.discussionBoard.member.articles.erase(memberConnection, {
    articleId: article.id,
  });
  // 7. Retrieve snapshot history for soft-deleted article (admin access)
  const snapshots =
    await api.functional.discussionBoard.admin.articles.snapshots.index(
      adminConnection,
      {
        articleId: article.id,
        body: {
          page: 1,
          limit: 10,
          sort: "asc",
        } satisfies IDiscussionBoardArticleSnapshot.IRequest,
      },
    );
  typia.assert(snapshots);
  // 8. Verify snapshots are accessible after article deletion
  TestValidator.predicate(
    "snapshots accessible after deletion",
    snapshots.data.length >= 2,
  );
  // 9. Verify snapshot data integrity
  const firstSnapshot = snapshots.data[0]!;
  const lastSnapshot = snapshots.data[snapshots.data.length - 1]!;
  TestValidator.predicate(
    "first snapshot has title",
    firstSnapshot.title !== undefined,
  );
  TestValidator.predicate(
    "first snapshot has created_at",
    firstSnapshot.created_at !== undefined,
  );
  TestValidator.predicate(
    "last snapshot has title",
    lastSnapshot.title !== undefined,
  );
  TestValidator.predicate(
    "last snapshot has created_at",
    lastSnapshot.created_at !== undefined,
  );
  // 10. Verify chronological order (asc)
  TestValidator.predicate(
    "snapshots in chronological order",
    new Date(firstSnapshot.created_at).getTime() <=
      new Date(lastSnapshot.created_at).getTime(),
  );
  // 11. Verify pagination metadata
  TestValidator.predicate(
    "pagination current page is 1",
    snapshots.pagination.current >= 1,
  );
  TestValidator.predicate(
    "pagination has records",
    snapshots.pagination.records >= 2,
  );
}
