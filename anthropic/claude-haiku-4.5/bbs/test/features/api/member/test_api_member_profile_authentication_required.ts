import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";

/**
 * Test that the profile endpoint requires authentication.
 *
 * Validates that attempting to retrieve profile information without a valid JWT
 * token returns an authentication error (401 Unauthorized), ensuring the
 * endpoint properly restricts access to authenticated members only.
 *
 * Test workflow:
 *
 * 1. Create a member account via registration to establish baseline context
 * 2. Create an unauthenticated connection with empty headers
 * 3. Attempt to access the profile endpoint without credentials
 * 4. Verify the request fails with an authentication error
 */
export async function test_api_member_profile_authentication_required(
  connection: api.IConnection,
) {
  // Step 1: Register a member account to establish baseline context
  const registerRequest = {
    email: typia.random<string & tags.Format<"email">>(),
    password: "Abcd1234",
  } satisfies IDiscussionBoardMember.IRegisterRequest;

  const registeredMember: IDiscussionBoardMember.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: registerRequest,
    });
  typia.assert(registeredMember);
  TestValidator.predicate(
    "member registration should succeed",
    registeredMember.token !== null && registeredMember.token !== undefined,
  );

  // Step 2: Create an unauthenticated connection with empty headers
  const unauthenticatedConnection: api.IConnection = {
    ...connection,
    headers: {},
  };

  // Step 3 & 4: Attempt to access profile without authentication and verify it fails
  await TestValidator.error(
    "profile endpoint should require authentication",
    async () => {
      await api.functional.discussionBoard.member.me.profile(
        unauthenticatedConnection,
      );
    },
  );
}
