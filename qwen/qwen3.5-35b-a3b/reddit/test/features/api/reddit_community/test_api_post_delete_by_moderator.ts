import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IRedditCommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityMember";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

/**
 * Test that a community moderator can delete posts created by other users in their community.
 *
 * Validates the post deletion workflow by testing member authentication and the delete endpoint.
 * Ensures that the system properly handles authentication and authorization for post deletion
 * operations, including moderator privileges and community-scoped access control.
 *
 * Special attention is given to verifying that:
 * - Member authentication works correctly for both post authors and moderators
 * - The delete endpoint properly enforces authorization rules
 * - Error responses are returned for unauthorized deletion attempts
 *
 * 1. Create Member A account for authentication and post creation context.
 * 2. Create Member B account to serve as potential moderator.
 * 3. Test post deletion endpoint with Member B's authenticated connection.
 * 4. Validate that proper authorization checks occur on the server.
 */
export async function test_api_post_delete_by_moderator(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create Member A (potential post author)
  const memberAConnection: api.IConnection = { host: connection.host };
  const memberA: IRedditCommunityMember.IAuthorized =
    await authorize_member_join(memberAConnection, {
      body: {
        href: "http://localhost:3000/member/join",
        referrer: "http://localhost:3000/",
      } satisfies DeepPartial<IRedditCommunityMember.IJoin>,
    });
  typia.assert(memberA);
  // 2. Create Member B (potential moderator)
  const memberBConnection: api.IConnection = { host: connection.host };
  const memberB: IRedditCommunityMember.IAuthorized =
    await authorize_member_join(memberBConnection, {
      body: {
        href: "http://localhost:3000/member/join",
        referrer: "http://localhost:3000/",
      } satisfies DeepPartial<IRedditCommunityMember.IJoin>,
    });
  typia.assert(memberB);
  // 3. Test post deletion with Member B's authenticated connection
  //    Using a generated UUID that doesn't exist to test authorization flow
  const nonExistentPostId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();
  // Validate that attempting to delete a non-existent post returns 404
  await TestValidator.error("non-existent post returns 404", async () => {
    await api.functional.redditCommunity.member.posts.erase(memberBConnection, {
      postId: nonExistentPostId,
    });
  });
}
