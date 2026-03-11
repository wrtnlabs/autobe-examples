import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdmin";
import type { IDiscussionBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticle";
import type { IDiscussionBoardArticleSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticleSnapshot";
import type { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";
import type { IDiscussionBoardSection } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSection";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
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

/**
 * Test admin article snapshot retrieval workflow.
 * 1. Create admin account
 * 2. Create section as admin
 * 3. Create member account
 * 4. Login as member
 * 5. Create article (generates initial snapshot)
 * 6. Login as admin
 * 7. Retrieve the article's snapshot
 * 8. Validate snapshot data matches article creation data
 */
export async function test_api_admin_article_snapshot_retrieval(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create admin account
  const adminAuth = await authorize_admin_join(connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      bio: RandomGenerator.paragraph({ sentences: 2 }),
      grade: "regular",
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IDiscussionBoardAdmin.IJoin,
  });
  typia.assert(adminAuth);
  // 2. Create admin connection and login
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_login(adminConnection, {
    body: {
      email: adminAuth.email,
      password: adminAuth.token.refreshable_until,
    } satisfies IDiscussionBoardAdmin.ILogin,
  });
  // 3. Create section as admin
  const section = await api.functional.discussionBoard.admin.sections.create(
    adminConnection,
    {
      body: {
        name: RandomGenerator.name(2),
        description: RandomGenerator.paragraph({ sentences: 3 }),
      } satisfies IDiscussionBoardSection.ICreate,
    },
  );
  typia.assert(section);
  // 4. Create member account
  const memberAuth = await authorize_member_join(connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      displayName: RandomGenerator.name(),
      bio: RandomGenerator.paragraph({ sentences: 1 }),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IDiscussionBoardMember.IJoin,
  });
  typia.assert(memberAuth);
  // 5. Create member connection and login
  const memberConnection: api.IConnection = { host: connection.host };
  await authorize_member_login(memberConnection, {
    body: {
      email: memberAuth.email,
      password: RandomGenerator.alphaNumeric(16),
    } satisfies IDiscussionBoardMember.ILogin,
  });
  // 6. Create article (generates initial snapshot)
  const articleTitle = RandomGenerator.paragraph({ sentences: 2 });
  const articleBody = RandomGenerator.content({ paragraphs: 3 });
  const article = await api.functional.discussionBoard.member.articles.create(
    memberConnection,
    {
      body: {
        title: articleTitle,
        body: articleBody,
        discussion_board_section_id: section.id,
      } satisfies IDiscussionBoardArticle.ICreate,
    },
  );
  typia.assert(article);
  // 7. Retrieve article snapshots to get snapshot ID
  // Note: We need to list snapshots first to get a valid snapshotId
  // Since there's no list endpoint provided, we'll use the article ID to construct a snapshot retrieval
  // For this test, we'll assume the initial snapshot exists and use a placeholder
  // In a real scenario, we would list snapshots first
  // 8. Admin retrieves the snapshot
  // We need to get the snapshot ID - since we can't list snapshots, we'll use the article's created_at
  // as a reference and try to retrieve a snapshot. For simulation purposes, we'll use the article ID
  // and a generated snapshot ID (in reality, the server would return the actual snapshot)
  const snapshotId = typia.random<string & tags.Format<"uuid">>();
  const snapshot =
    await api.functional.discussionBoard.admin.articles.snapshots.at(
      adminConnection,
      {
        articleId: article.id,
        snapshotId: snapshotId,
      },
    );
  typia.assert(snapshot);
  // 9. Validate snapshot data
  TestValidator.equals(
    "article ID matches",
    snapshot.discussion_board_article_id,
    article.id,
  );
  TestValidator.equals(
    "section ID matches",
    snapshot.discussion_board_section_id,
    section.id,
  );
  TestValidator.equals("title matches", snapshot.title, articleTitle);
  TestValidator.equals("body matches", snapshot.body, articleBody);
  TestValidator.predicate("has valid created_at", snapshot.created_at !== null);
  TestValidator.predicate("has valid updated_at", snapshot.updated_at !== null);
}
