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

export async function test_api_article_snapshot_chronological_history(
  connection: api.IConnection,
): Promise<void> {
  // 1. Administrator setup - create section for article categorization
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
    {
      body: {
        name: RandomGenerator.name(),
        description: RandomGenerator.paragraph({ sentences: 2 }),
      } satisfies IDiscussionBoardSection.ICreate,
    },
  );
  typia.assert(section);
  // 3. Member setup - create article author
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
  // 4. Create initial article - generates first snapshot
  const initialTitle = RandomGenerator.paragraph({
    sentences: 1,
    wordMin: 3,
    wordMax: 5,
  });
  const initialContent = RandomGenerator.content({
    paragraphs: 2,
    sentenceMin: 5,
    sentenceMax: 10,
  });
  const article = await generate_random_discussion_board_member_articles_create(
    memberConnection,
    {
      body: {
        title: initialTitle,
        content: initialContent,
        sectionId: section.id,
      } satisfies IDiscussionBoardArticle.ICreate,
    },
  );
  typia.assert(article);
  // 5. Update article multiple times to generate additional snapshots
  const updateCount = 3;
  const updateTitles: string[] = [initialTitle];
  for (let i = 0; i < updateCount; i++) {
    const updatedTitle = RandomGenerator.paragraph({
      sentences: 1,
      wordMin: 3,
      wordMax: 5,
    });
    const updatedContent = RandomGenerator.content({
      paragraphs: 2,
      sentenceMin: 5,
      sentenceMax: 10,
    });
    const updatedArticle =
      await api.functional.discussionBoard.member.articles.update(
        memberConnection,
        {
          articleId: article.id,
          body: {
            title: updatedTitle,
            content: updatedContent,
          } satisfies IDiscussionBoardArticle.IUpdate,
        },
      );
    typia.assert(updatedArticle);
    updateTitles.push(updatedTitle);
  }
  // 6. Retrieve snapshot history as administrator
  const snapshotResponse =
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
  typia.assert(snapshotResponse);
  // 7. Validate pagination metadata
  TestValidator.equals("current page", snapshotResponse.pagination.current, 1);
  TestValidator.predicate(
    "limit is set",
    snapshotResponse.pagination.limit > 0,
  );
  TestValidator.equals(
    "total records",
    snapshotResponse.pagination.records,
    updateTitles.length,
  );
  TestValidator.predicate(
    "pages calculated",
    snapshotResponse.pagination.pages > 0,
  );
  // 8. Validate snapshot count matches updates + initial creation
  TestValidator.equals(
    "snapshot count",
    snapshotResponse.data.length,
    updateTitles.length,
  );
  // 9. Validate snapshots are in chronological order (oldest first)
  for (let i = 1; i < snapshotResponse.data.length; i++) {
    const prevSnapshot = snapshotResponse.data[i - 1];
    const currSnapshot = snapshotResponse.data[i];
    TestValidator.predicate(
      `snapshot ${i} is after snapshot ${i - 1}`,
      new Date(prevSnapshot.created_at).getTime() <=
        new Date(currSnapshot.created_at).getTime(),
    );
  }
  // 10. Validate first snapshot matches original article creation state
  const firstSnapshot = snapshotResponse.data[0];
  TestValidator.equals(
    "first snapshot title matches initial",
    firstSnapshot.title,
    initialTitle,
  );
  // 11. Validate subsequent snapshots reflect modifications
  for (let i = 1; i < snapshotResponse.data.length; i++) {
    const snapshot = snapshotResponse.data[i];
    TestValidator.notEquals(
      `snapshot ${i} title differs from initial`,
      snapshot.title,
      initialTitle,
    );
  }
}
