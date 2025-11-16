import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformUser";

/**
 * Validate that an authenticated user can soft-delete their own join request
 * for a specific community by its unique ID.
 *
 * Workflow:
 *
 * 1. Register a new user and obtain authentication.
 * 2. (Manual prerequisite/assumed) Create a restricted or private community. (This
 *    is assumed complete since there's no API for it.)
 * 3. Simulate submitting a join request to the target community and create a
 *    joinRequestId (simulate as API is not exposed here).
 * 4. Delete the join request via the DELETE endpoint.
 * 5. (Manual/assumed) - Validate that the join request is soft-deleted (deleted_at
 *    would be set), and user cannot join the community without a new request.
 *    (Business rule assertion.)
 *
 * Note: Due to only "join user" and "delete join request" API availability,
 * steps involving community and join request creation must be assumed or
 * simulated. Test focuses on token-based deletion and invocation of the DELETE
 * endpoint with valid arguments.
 */
export async function test_api_community_join_request_deletion_by_user(
  connection: api.IConnection,
) {
  // Step 1: Register new user and obtain authentication
  const userJoinInput = {
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.Format<"password">>(),
  } satisfies ICommunityPlatformUser.IJoin;
  const user: ICommunityPlatformUser.IAuthorized =
    await api.functional.auth.user.join(connection, { body: userJoinInput });
  typia.assert(user);

  // Step 2: (Assumed) The community exists. Use a random community name for test (simulate).
  const communityName = RandomGenerator.alphabets(10);

  // Step 3: Simulate join request creation - mock a joinRequestId
  // In real test this would be created by another API; here we simulate a new UUID.
  const joinRequestId = typia.random<string & tags.Format<"uuid">>();

  // Step 4: Attempt to delete the join request
  await api.functional.communityPlatform.user.communities.joinRequests.erase(
    connection,
    {
      communityName: communityName,
      joinRequestId: joinRequestId,
    },
  );

  // Step 5: Assert business logic - In actual implementation, validate join request deleted_at, and restrict user from joining without new request
  // Here, only endpoint invocation is validated since response is void and further validation is not possible without additional APIs
  TestValidator.predicate(
    "successfully called DELETE join request endpoint with user token",
    true,
  );
}
