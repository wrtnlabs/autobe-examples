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
 * Test member profile retrieval for a non-existent member ID.
 *
 * Validates that the API correctly returns a 404 error when attempting to fetch a member profile with an invalid UUID. This test ensures the endpoint properly handles requests for members that do not exist in the database.
 *
 * The test follows a natural flow: first creating a valid member account to establish baseline data, then attempting to retrieve a profile with a different UUID that does not exist. This validates the 404 error handling for non-existent resources.
 *
 * 1. Register a new member account using the join utility function.
 * 2. Capture the member ID from the join response.
 * 3. Generate a different UUID that does NOT correspond to any member in the system.
 * 4. Call GET /redditCommunity/members/{memberId} with the non-existent UUID.
 * 5. Validate that a 404 error is returned for the non-existent member.
 */
export async function test_api_member_profile_not_found(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register a new member account to establish baseline test data
  const joinConnection: api.IConnection = { host: connection.host };
  const joinOutput = await authorize_member_join(joinConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      username: RandomGenerator.name(1),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IRedditCommunityMember.IJoin,
  });
  typia.assert(joinOutput);
  const existingMemberId = joinOutput.id;
  // 2. Generate a different UUID that does NOT correspond to any member in the system
  const nonExistentMemberId = typia.random<string & tags.Format<"uuid">>();
  // 3. Create a new connection for the member profile retrieval
  const profileConnection: api.IConnection = { host: connection.host };
  // 4. Call GET /redditCommunity/members/{memberId} with the non-existent UUID
  // Expected: 404 error returned for non-existent member
  await TestValidator.httpError(
    "returns 404 for non-existent member",
    [404],
    async () => {
      await api.functional.redditCommunity.members.at(profileConnection, {
        memberId: nonExistentMemberId,
      });
    },
  );
}
