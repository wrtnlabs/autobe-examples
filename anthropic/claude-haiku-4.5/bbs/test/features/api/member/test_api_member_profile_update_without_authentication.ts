import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";

/**
 * Test that the profile update endpoint requires authentication.
 *
 * This test validates that the PUT /discussionBoard/member/me/profile endpoint
 * properly enforces authentication requirements. The endpoint should reject any
 * attempts to update member profile information from unauthenticated requests
 * that lack a valid JWT authorization token, returning a 401 Unauthorized
 * error.
 *
 * The test follows this workflow:
 *
 * 1. Register a member account to establish a valid member exists
 * 2. Create an unauthenticated connection without authorization headers
 * 3. Attempt to update profile on the unauthenticated connection
 * 4. Verify the operation fails with 401 Unauthorized authentication error
 * 5. Confirm the endpoint correctly restricts profile updates to authenticated
 *    members only
 */
export async function test_api_member_profile_update_without_authentication(
  connection: api.IConnection,
) {
  // Step 1: Register a member account to establish baseline context
  const password = `Abc${RandomGenerator.alphabets(4)}1`; // Uppercase, lowercase, number, 8+ chars
  const registerRequest = {
    email: typia.random<string & tags.Format<"email">>(),
    password: password,
  } satisfies IDiscussionBoardMember.IRegisterRequest;

  const registered = await api.functional.auth.member.join(connection, {
    body: registerRequest,
  });
  typia.assert(registered);

  // Step 2: Create an unauthenticated connection by clearing headers
  const unauthConnection: api.IConnection = {
    ...connection,
    headers: {},
  };

  // Step 3 & 4: Attempt to update profile without authentication and verify error
  await TestValidator.error(
    "profile update without authentication should fail with 401",
    async () => {
      await api.functional.discussionBoard.member.me._profile.update(
        unauthConnection,
        {
          body: {
            email: typia.random<string & tags.Format<"email">>(),
          } satisfies IDiscussionBoardMember.IUpdate,
        },
      );
    },
  );

  // Step 5: Verify that authenticated requests can succeed (using original connection with token)
  const authenticatedUpdate =
    await api.functional.discussionBoard.member.me._profile.update(connection, {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
      } satisfies IDiscussionBoardMember.IUpdate,
    });
  typia.assert(authenticatedUpdate);
  TestValidator.predicate(
    "authenticated profile update should succeed",
    authenticatedUpdate.id !== undefined,
  );
}
