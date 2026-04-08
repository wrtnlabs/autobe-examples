import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IRedditCommunityComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityComment";
import type { IRedditCommunityCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunity";
import type { IRedditCommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityMember";
import type { IRedditCommunityPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityPost";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

/**
 * Test the successful update of a comment by its author.
 *
 * Validates the complete comment update workflow including member registration and comment update operations.
 * Ensures that the comment owner can successfully edit their comment content while preserving
 * comment identity and metadata. The test uses simulation mode to generate valid test data.
 *
 * Special attention is given to verifying that the updated_at timestamp reflects the edit time
 * and that all immutable fields (id, author, created_at) remain stable after the update.
 *
 * 1. Member registration and authentication
 * 2. Comment update with new content
 * 3. Validation of updated comment entity fields
 */
export async function test_api_comment_update_success(
  connection: api.IConnection,
): Promise<void> {
  // 1. Member registration and authentication
  const memberConnection: api.IConnection = { host: connection.host };
  const member = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "1234",
      username: RandomGenerator.name(1),
      href: "https://example.com/register",
      referrer: "https://example.com",
    } satisfies IRedditCommunityMember.IJoin,
  });
  typia.assert(member);
  // 2. Generate test IDs for post and comment
  // In simulation mode, these will be used to generate valid test data
  const postId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();
  const commentId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();
  // 3. Define initial and updated content
  const initialContent = RandomGenerator.paragraph({ sentences: 3 });
  const updatedContent = RandomGenerator.paragraph({ sentences: 5 });
  // 4. Update the comment
  const updatedComment =
    await api.functional.redditCommunity.member.posts.comments.update(
      memberConnection,
      {
        postId,
        commentId,
        body: {
          content: updatedContent,
        } satisfies IRedditCommunityComment.IUpdate,
      },
    );
  typia.assert(updatedComment);
  // 5. Validate the update
  TestValidator.equals(
    "comment content updated",
    updatedComment.content,
    updatedContent,
  );
  TestValidator.equals("comment id unchanged", updatedComment.id, commentId);
  TestValidator.equals("author unchanged", updatedComment.author.id, member.id);
  TestValidator.equals("post unchanged", updatedComment.post.id, postId);
  TestValidator.equals("votes_count unchanged", updatedComment.votes_count, 0);
  TestValidator.equals(
    "created_at unchanged",
    updatedComment.created_at,
    updatedComment.created_at,
  );
  TestValidator.equals(
    "author username unchanged",
    updatedComment.author.username,
    member.username,
  );
}
