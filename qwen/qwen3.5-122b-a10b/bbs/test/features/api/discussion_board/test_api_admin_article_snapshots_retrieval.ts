import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdmin";
import type { IDiscussionBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticle";
import type { IDiscussionBoardArticleSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticleSnapshot";
import type { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";
import type { IDiscussionBoardSection } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSection";
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
import { generate_random_discussion_board_member_articles_create } from "../../../generate/generate_random_discussion_board_member_articles_create";
import { prepare_random_discussion_board_article } from "../../../prepare/prepare_random_discussion_board_article";

export async function test_api_admin_article_snapshots_retrieval(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create admin and authenticate
  const adminConnection: api.IConnection = { host: connection.host };
  const adminAuth = await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IDiscussionBoardAdmin.IJoin,
  });
  typia.assert(adminAuth);
  // 2. Create member and authenticate
  const memberConnection: api.IConnection = { host: connection.host };
  const memberAuth = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      displayName: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IDiscussionBoardMember.IJoin,
  });
  typia.assert(memberAuth);
  // 3. Create article as member
  const article = await generate_random_discussion_board_member_articles_create(
    memberConnection,
    {
      body: {
        title: RandomGenerator.paragraph({ sentences: 3 }),
        body: RandomGenerator.content({ paragraphs: 2 }),
        discussion_board_section_id: typia.random<
          string & tags.Format<"uuid">
        >(),
      } satisfies IDiscussionBoardArticle.ICreate,
    },
  );
  typia.assert(article);
  // 4. Retrieve snapshots as admin
  const snapshots =
    await api.functional.discussionBoard.admin.articles.snapshots.index(
      adminConnection,
      {
        articleId: article.id,
        body: {
          page: 1,
          limit: 10,
          order: "desc",
        } satisfies IDiscussionBoardArticleSnapshot.IRequest,
      },
    );
  typia.assert(snapshots);
  // 5. Validate pagination metadata
  TestValidator.equals(
    "pagination current page",
    snapshots.pagination.current,
    1,
  );
  TestValidator.predicate(
    "pagination limit positive",
    snapshots.pagination.limit > 0,
  );
  TestValidator.predicate(
    "pagination records non-negative",
    snapshots.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination pages non-negative",
    snapshots.pagination.pages >= 0,
  );
  // 6. Validate snapshot structure
  if (snapshots.data.length > 0) {
    const snapshot = snapshots.data[0];
    TestValidator.equals("snapshot has id", snapshot.id !== undefined, true);
    TestValidator.equals(
      "snapshot has title",
      typeof snapshot.title === "string",
      true,
    );
    TestValidator.equals("snapshot has author", snapshot.author !== undefined, true);
    TestValidator.equals(
      "snapshot has section",
      snapshot.section !== undefined,
      true,
    );
    TestValidator.predicate(
      "snapshot has file_count",
      typeof snapshot.file_count === "number",
    );
    TestValidator.predicate(
      "snapshot has image_count",
      typeof snapshot.image_count === "number",
    );
    TestValidator.predicate(
      "snapshot has created_at",
      typeof snapshot.created_at === "string",
    );
    // Validate author structure
    TestValidator.equals(
      "author has id",
      typeof snapshot.author.id === "string",
      true,
    );
    TestValidator.equals(
      "author has display_name",
      typeof snapshot.author.display_name === "string",
      true,
    );
    TestValidator.equals(
      "author has ban_status",
      typeof snapshot.author.ban_status === "string",
      true,
    );
    TestValidator.equals(
      "author has created_at",
      typeof snapshot.author.created_at === "string",
      true,
    );
    // Validate section structure
    TestValidator.equals(
      "section has id",
      typeof snapshot.section.id === "string",
      true,
    );
    TestValidator.equals(
      "section has name",
      typeof snapshot.section.name === "string",
      true,
    );
  }
  // 7. Validate non-existent article returns error
  await TestValidator.httpError("non-existent article", 404, async () => {
    await api.functional.discussionBoard.admin.articles.snapshots.index(
      adminConnection,
      {
        articleId: typia.random<string & tags.Format<"uuid">>(),
        body: {} satisfies IDiscussionBoardArticleSnapshot.IRequest,
      },
    );
  });
  // 8. Validate invalid UUID format
  await TestValidator.error("invalid UUID format", async () => {
    await api.functional.discussionBoard.admin.articles.snapshots.index(
      adminConnection,
      {
        articleId: "not-a-uuid" as any,
        body: {} satisfies IDiscussionBoardArticleSnapshot.IRequest,
      },
    );
  });
}