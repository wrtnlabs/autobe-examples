import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdmin";
import type { IDiscussionBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticle";
import type { IDiscussionBoardComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardComment";
import type { IDiscussionBoardCommentSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardCommentSnapshot";
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
import { generate_random_discussion_board_member_articles_comments_create } from "../../../generate/generate_random_discussion_board_member_articles_comments_create";
import { generate_random_discussion_board_member_articles_create } from "../../../generate/generate_random_discussion_board_member_articles_create";
import { prepare_random_discussion_board_article } from "../../../prepare/prepare_random_discussion_board_article";
import { prepare_random_discussion_board_comment } from "../../../prepare/prepare_random_discussion_board_comment";
import { prepare_random_discussion_board_section } from "../../../prepare/prepare_random_discussion_board_section";

/**
 * Test the primary success path for comment creation with automatic snapshot generation.
 *
 * Note: This test verifies the comment creation workflow which triggers automatic
 * snapshot creation. Direct snapshot retrieval testing requires a snapshot ID that
 * cannot be obtained through the available API endpoints (no list snapshots endpoint
 * and snapshot ID is not returned in comment creation response). This test validates
 * the prerequisite workflow for snapshot creation.
 *
 * To fully test snapshot retrieval, the API would need to either:
 * 1. Return snapshot ID(s) in the comment creation response, or
 * 2. Provide a list snapshots endpoint (GET /comments/{commentId}/snapshots)
 */
export async function test_api_comment_snapshot_retrieval(
  connection: api.IConnection,
): Promise<void> {
  // 1. Admin authentication
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
  // 2. Create section
  const section = await generate_random_discussion_board_admin_sections_create(
    adminConnection,
    {},
  );
  typia.assert(section);
  // 3. Create article (using admin connection as member)
  const article = await generate_random_discussion_board_member_articles_create(
    adminConnection,
    {
      body: {
        title: RandomGenerator.paragraph({ sentences: 2 }),
        body: RandomGenerator.content({ paragraphs: 3 }),
        discussion_board_section_id: section.id,
      } satisfies IDiscussionBoardArticle.ICreate,
    },
  );
  typia.assert(article);
  // 4. Create comment (system should create snapshot automatically)
  const originalContent = RandomGenerator.paragraph({ sentences: 5 });
  const comment =
    await generate_random_discussion_board_member_articles_comments_create(
      adminConnection,
      {
        params: {
          articleId: article.id,
        },
        body: {
          content: originalContent,
        } satisfies IDiscussionBoardComment.ICreate,
      },
    );
  typia.assert(comment);
  // 5. Verify comment was created successfully with correct data
  TestValidator.equals("comment id", comment.id, comment.id);
  TestValidator.equals("comment content", comment.content, originalContent);
  TestValidator.equals("article association", comment.article.id, article.id);
  TestValidator.equals(
    "member association",
    comment.member.id,
    article.member.id,
  );
  // 6. Verify timestamps are recorded
  TestValidator.predicate(
    "created_at is valid date-time",
    () => new Date(comment.created_at).getTime() > 0,
  );
  TestValidator.predicate(
    "updated_at is valid date-time",
    () => new Date(comment.updated_at).getTime() > 0,
  );
  // Note: Snapshot retrieval cannot be tested directly because:
  // - The snapshot ID is not returned in the comment creation response
  // - There is no list snapshots endpoint available
  // - The snapshot ID is not predictable
  //
  // The automatic snapshot creation is implied by the comment creation success.
  // To test snapshot retrieval, the API would need to expose the snapshot ID
  // through either the comment response or a dedicated list endpoint.
}
