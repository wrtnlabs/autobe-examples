import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardComment";
import type { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_discussion_board_member_articles_comments_create } from "../../../generate/generate_random_discussion_board_member_articles_comments_create";
import { prepare_random_discussion_board_comment } from "../../../prepare/prepare_random_discussion_board_comment";

/**
 * Test comment owner update workflow.
 * Since there's no articles.create endpoint available, this test demonstrates
 * the comment update functionality structure with available API endpoints.
 *
 * Note: This test requires an existing article and comment in the database.
 * In production, you would first create an article and comment through
 * test setup fixtures or existing test data.
 */
export async function test_api_comment_owner_update(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as member to get valid access token
  const memberConnection: api.IConnection = { host: connection.host };
  const memberData = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      displayName: RandomGenerator.name(),
      passwordConfirmation: RandomGenerator.alphaNumeric(16),
    } satisfies IDiscussionBoardMember.IJoin,
  });
  typia.assert(memberData);
  // 2. Create a comment using the member connection
  // Since there's no articles.create endpoint, we need to use an existing article
  // In a real test scenario, this would be a real article ID from the database
  // For this test, we'll use a placeholder that assumes an existing article exists
  const articleId = "a1b2c3d4-e5f6-7890-abcd-ef1234567890";
  const comment =
    await api.functional.discussionBoard.member.articles.comments.create(
      memberConnection,
      {
        articleId,
        body: {
          content: RandomGenerator.paragraph({ sentences: 2 }),
        } satisfies IDiscussionBoardComment.ICreate,
      },
    );
  typia.assert(comment);
  // 3. Update the comment with new content (owner only)
  const updatedComment =
    await api.functional.discussionBoard.member.comments.update(
      memberConnection,
      {
        commentId: comment.id,
        body: {
          content: RandomGenerator.paragraph({ sentences: 3 }),
        } satisfies IDiscussionBoardComment.IUpdate,
      },
    );
  typia.assert(updatedComment);
  // 4. Validate the update - content should have changed
  TestValidator.notEquals(
    "content changed",
    updatedComment.content,
    comment.content,
  );
  // 5. Validate that updated_at timestamp was refreshed
  TestValidator.predicate(
    "updated_at refreshed",
    updatedComment.updated_at > comment.updated_at,
  );
}
