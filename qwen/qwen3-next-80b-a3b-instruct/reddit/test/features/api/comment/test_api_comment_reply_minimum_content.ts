import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";
import api from "@ORGANIZATION/PROJECT-api";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { ICommunityPlatformAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAuthorizationToken";
import type { ICommunityPlatformComment } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformComment";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import { prepare_random_community_platform_comment } from "../../../prepare/prepare_random_community_platform_comment";
import { generate_random_community_platform_member_comments_replies_create } from "../../../generate/generate_random_community_platform_member_comments_replies_create";
import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
export async function test_api_comment_reply_minimum_content(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Create a new connection for member authentication
  const memberConnection: api.IConnection = { host: connection.host };
  // Step 2: Authenticate as member using join (creates account)
  const memberAuth: ICommunityPlatformMember.IAuthorized =
    await authorize_member_join(memberConnection, {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(16),
      } satisfies ICommunityPlatformMember.IJoin,
    });
  // memberConnection.headers is now updated with authorization token
  // Step 3: Create parent comment that will receive the reply
  const parentComment: ICommunityPlatformComment =
    await api.functional.communityPlatform.member.comments.replies.create(
      memberConnection, // Use member-specific connection, NOT base connection
      {
        commentId: typia.random<string & tags.Format<"uuid">>(), // Temporary parent comment ID is not used for the root comment
        body: {
          content: "This is a parent comment for testing replies.", // Valid content for parent comment
        } satisfies ICommunityPlatformComment.ICreate,
      },
    );
  typia.assert(parentComment);
  // Step 4: Create reply with minimum content length (1 character) to the existing parent comment
  const reply: ICommunityPlatformComment =
    await api.functional.communityPlatform.member.comments.replies.create(
      memberConnection, // Use member-specific connection, NOT base connection
      {
        commentId: parentComment.id, // Use the actual parent comment's ID (not random)
        body: {
          content: "a", // Minimum valid content length of exactly 1 character
        } satisfies ICommunityPlatformComment.ICreate,
      },
    );
  // Step 5: Validate the created reply
  typia.assert(reply);
  // Step 6: Verify the reply has correct properties (as defined in ICommunityPlatformComment)
  // Since content is not part of ICommunityPlatformComment response, we can't validate it directly
  // We can only validate that the reply was created with correct relationships
  TestValidator.equals(
    "reply has valid UUID id",
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/.test(
      reply.id,
    ),
    true,
  );
  TestValidator.equals("reply created successfully", reply.id.length > 0, true);
  TestValidator.equals(
    "parent_id matches parent comment ID",
    reply.parent_id,
    parentComment.id,
  );
  // Since we created the reply with content = "a", and the operation succeeded,
  // we can infer the minimum content requirement was satisfied because
  // the server accepted the request. We can't verify the content on the returned object
  // because it's not exposed in the ICommunityPlatformComment type.
}
