import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAccountStatus } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAccountStatus";
import type { ICommunityPlatformMemberuser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMemberuser";

/**
 * Validate that the memberUser-scoped profile endpoint enforces authentication.
 *
 * Business goal: ensure that GET
 * /communityPlatform/memberUser/memberUsers/{memberUserId} does not expose full
 * member profile data to unauthenticated callers, while still working correctly
 * for authenticated member users.
 *
 * Scenario:
 *
 * 1. Register a new member user via POST /auth/memberUser/join and obtain the
 *    authenticated envelope including the memberUser id.
 * 2. Create an unauthenticated connection that does not carry the Authorization
 *    header.
 * 3. Call GET /communityPlatform/memberUser/memberUsers/{memberUserId} with the
 *    unauthenticated connection and verify that it results in an error using
 *    TestValidator.error, confirming that anonymous access is rejected.
 * 4. Call the same endpoint using the authenticated connection and verify that a
 *    valid ICommunityPlatformMemberuser profile is returned and passes
 *    typia.assert, and that the id and key profile fields match the authorized
 *    envelope.
 */
export async function test_api_member_user_get_profile_requires_authentication(
  connection: api.IConnection,
) {
  // 1. Register a new member user (join)
  const joinBody = typia.random<ICommunityPlatformMemberuser.IJoinRequest>();

  const authorized: ICommunityPlatformMemberuser.IAuthorized =
    await api.functional.auth.memberUser.join(connection, {
      body: joinBody,
    });
  typia.assert(authorized);

  // Sanity check: business-level consistency between join request and envelope
  TestValidator.equals(
    "authorized username should match join username",
    authorized.username,
    joinBody.username,
  );
  TestValidator.equals(
    "authorized email should match join email",
    authorized.email,
    joinBody.email,
  );

  // 2. Build an unauthenticated connection by clearing headers in a new object
  const unauthenticatedConnection: api.IConnection = {
    ...connection,
    headers: {},
  };

  // 3. Unauthenticated call must fail (some authorization-related error)
  await TestValidator.error(
    "unauthenticated profile access should be rejected",
    async () => {
      await api.functional.communityPlatform.memberUser.memberUsers.at(
        unauthenticatedConnection,
        {
          memberUserId: authorized.id,
        },
      );
    },
  );

  // 4. Authenticated call should succeed and return full profile
  const profile: ICommunityPlatformMemberuser =
    await api.functional.communityPlatform.memberUser.memberUsers.at(
      connection,
      {
        memberUserId: authorized.id,
      },
    );
  typia.assert(profile);

  TestValidator.equals(
    "profile id should match authorized id",
    profile.id,
    authorized.id,
  );
  TestValidator.equals(
    "profile username should match authorized username",
    profile.username,
    authorized.username,
  );
  TestValidator.equals(
    "profile email should match authorized email",
    profile.email,
    authorized.email,
  );
}
