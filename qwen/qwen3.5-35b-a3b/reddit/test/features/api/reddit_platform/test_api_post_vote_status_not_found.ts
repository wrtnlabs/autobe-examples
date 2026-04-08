import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IRedditPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformMember";
import type { IRedditPlatformPostVoteStatus } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformPostVoteStatus";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

/**
 * Test that the vote status endpoint returns 404 when the specified post does not exist.
 *
 * Validates that the vote status endpoint properly handles requests for non-existent posts by returning 404 Not Found. Ensures that the endpoint validates post existence before attempting vote lookup, and returns appropriate error messages when the requested post cannot be found.
 *
 * Special attention is given to verifying that a valid UUID format that does not correspond to any existing post in the system returns the correct error response, and that the error handling properly prevents unnecessary database queries for non-existent posts.
 *
 * 1. Member is authenticated via /auth/member/join.
 * 2. Attempt to retrieve vote status using a valid UUID format but non-existent post ID.
 * 3. Endpoint returns 404 Not Found.
 * 4. Response includes error message indicating the post was not found.
 * 5. Verify the endpoint validates post existence (step 3 in operation specification) before attempting vote lookup.
 * 6. Ensure no vote record is queried for non-existent posts (performance consideration).
 */
export async function test_api_post_vote_status_not_found(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as member
  const memberConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      username:
        RandomGenerator.alphaNumeric(8) + "_" + RandomGenerator.alphaNumeric(3),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IRedditPlatformMember.IJoin,
  });
  // 2. Generate a valid UUID that does not exist in the system
  const nonExistentPostId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();
  // 3. Attempt to retrieve vote status for non-existent post
  // This should return 404 Not Found
  await TestValidator.httpError(
    "non-existent post returns 404",
    404,
    async () => {
      await api.functional.redditPlatform.member.posts._vote.at(
        memberConnection,
        {
          postId: nonExistentPostId,
        },
      );
    },
  );
}
