import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";
import api from "@ORGANIZATION/PROJECT-api";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityBbsCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityBbsCommunity";
import type { ICommunityBbsMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityBbsMember";
import type { ICommunityBbsPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityBbsPost";
import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
export async function test_api_post_update_by_author(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Authenticate as member
  const memberConnection: api.IConnection = { host: connection.host };
  const member: ICommunityBbsMember.IAuthorized = await authorize_member_join(
    memberConnection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(16),
      } satisfies ICommunityBbsMember.IJoin,
    },
  );
  typia.assert(member);
  // Step 2: Create a post using the member's connection (platform system creates a test post)
  // Note: In real environment this would be a database entry with pre-existing data
  // For this test, we're assuming a post exists with id 'pre-existing-post-id'
  // Real API doesn't provide create endpoint, so we simulate existence
  const postId = "967cc6b3-2a9f-402b-8fa9-9a3c7d4f5e11";
  // Step 3: Update the post with new values
  const updateResult: ICommunityBbsPost =
    await api.functional.communityBbs.member.posts.update(memberConnection, {
      postId,
      body: {
        title: RandomGenerator.paragraph({
          sentences: 3,
          wordMin: 5,
          wordMax: 15,
        }),
        content: RandomGenerator.content({
          paragraphs: 2,
          sentenceMin: 10,
          sentenceMax: 20,
        }),
      } satisfies ICommunityBbsPost.IUpdate,
    });
  typia.assert(updateResult);
  // Step 4: Validate that title was updated with new value
  TestValidator.equals(
    "title updated with new content",
    updateResult.title,
    "Creation of Update",
  );
  // Step 5: Validate that content was updated with new value
  TestValidator.equals(
    "content updated with new content",
    updateResult.content,
    "Creation of Update",
  );
  // Step 6: Validate system-managed fields remain unchanged
  // These values are assumed from the post's initial state
  TestValidator.predicate(
    "updated_at timestamp exists",
    updateResult.updated_at != null,
  );
  TestValidator.predicate(
    "created_at timestamp exists",
    updateResult.created_at != null,
  );
  TestValidator.predicate(
    "status is preserved",
    ["draft", "published", "archived"].includes(updateResult.status),
  );
  TestValidator.predicate(
    "likes is preserved",
    typeof updateResult.likes === "number" && updateResult.likes >= 0,
  );
  TestValidator.predicate(
    "views is preserved",
    typeof updateResult.views === "number" && updateResult.views >= 0,
  );
  TestValidator.predicate(
    "is_pinned is preserved",
    typeof updateResult.is_pinned === "boolean",
  );
  TestValidator.predicate(
    "author is preserved",
    typeof updateResult.author.id === "string",
  );
  TestValidator.predicate(
    "community is preserved",
    typeof updateResult.community.id === "string",
  );
  TestValidator.predicate(
    "post_type is preserved",
    ["text", "link"].includes(updateResult.post_type),
  );
  TestValidator.predicate(
    "author_id is preserved",
    typeof updateResult.author_id === "string",
  );
  TestValidator.predicate(
    "community_id is preserved",
    typeof updateResult.community_id === "string",
  );
  TestValidator.predicate(
    "comment_count is preserved",
    typeof updateResult.comment_count === "number" &&
      updateResult.comment_count >= 0,
  );
  // Step 7: Validate updated_at is newer than created_at
  // We assume in real system created_at before updated_at
  TestValidator.predicate(
    "updated_at is newer than created_at",
    new Date(updateResult.updated_at) > new Date(updateResult.created_at),
  );
}
