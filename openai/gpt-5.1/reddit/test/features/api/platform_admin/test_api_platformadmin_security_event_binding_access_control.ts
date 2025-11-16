import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAccountStatus } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAccountStatus";
import type { ICommunityPlatformPlatformadmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPlatformadmin";
import type { ICommunityPlatformPlatformadminSession } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPlatformadminSession";
import type { ICommunityPlatformUserSecurityEvent } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformUserSecurityEvent";
import type { ICommunityPlatformUserSecurityEventOfPlatformadmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformUserSecurityEventOfPlatformadmin";

/**
 * Verify access control for platform-admin security event bindings.
 *
 * Business intent: This test ensures that the highly sensitive binding endpoint
 * GET
 * /communityPlatform/platformAdmin/userSecurityEvents/{securityEventId}/platformAdmin
 * is only callable by authenticated platform administrators and is not
 * accessible to unauthenticated clients. Because no APIs are exposed for other
 * actor types or for creating/searching security events, the test focuses on
 * what can be covered with the given SDK: positive access for a platformAdmin
 * and negative access for an unauthenticated connection.
 *
 * High-level steps:
 *
 * 1. Register a platform administrator using POST /auth/platformAdmin/join, which
 *    both creates the admin account and seeds an authenticated session, wiring
 *    the JWT into connection.headers.Authorization automatically.
 * 2. As this authenticated platformAdmin, create at least one account status
 *    definition via POST /communityPlatform/platformAdmin/accountStatuses to
 *    satisfy data prerequisites implied by the domain (account statuses used in
 *    security events).
 * 3. Generate a random UUID value to serve as the securityEventId path parameter.
 *    There is no API in the provided SDK to create or list
 *    ICommunityPlatformUserSecurityEvent or its platformAdmin binding, so this
 *    ID acts purely as a type-correct placeholder. In simulator mode, the SDK
 *    returns random mock data for any well-typed request, so a random UUID
 *    suffices to exercise the type and access path.
 * 4. Call api.functional.communityPlatform.platformAdmin.userSecurityEvents
 *    .platformAdmin.at with the authenticated connection and the generated
 *    securityEventId. Assert that the response conforms to
 *    ICommunityPlatformUserSecurityEventOfPlatformadmin via typia.assert.
 * 5. Construct an unauthenticated connection by cloning the existing connection
 *    but replacing headers with an empty object. Using this unauthenticated
 *    connection, call the same endpoint and assert that the request fails with
 *    an HTTP-level error by using TestValidator.error. Because the contract
 *    guarantees that only platformAdmin actors are authorized, unauthenticated
 *    access must not succeed.
 *
 * Non-covered aspects:
 *
 * - We do not test access with non-admin tokens (e.g., memberUser or
 *   communityModerator), as the required auth APIs are not provided.
 * - We do not verify existence semantics for real security events, since there is
 *   no API to create or enumerate them. The focus is strictly on authorization
 *   wiring and response typing for successful admin access and failure of
 *   unauthenticated access.
 */
export async function test_api_platformadmin_security_event_binding_access_control(
  connection: api.IConnection,
) {
  // 1. Register a platform administrator and obtain an authenticated connection
  const joinBody = {
    username: RandomGenerator.name(1),
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
    displayName: RandomGenerator.name(),
    href: "https://admin.console.example.com/register",
    referrer: "https://admin.console.example.com/landing",
  } satisfies ICommunityPlatformPlatformadmin.IJoin;

  const adminAuthorized: ICommunityPlatformPlatformadmin.IAuthorized =
    await api.functional.auth.platformAdmin.join(connection, {
      body: joinBody,
    });
  typia.assert(adminAuthorized);

  // Sanity check: account status summary and token are present
  TestValidator.predicate(
    "platformAdmin join should return token with access and refresh",
    !!adminAuthorized.token.access && !!adminAuthorized.token.refresh,
  );
  TestValidator.predicate(
    "platformAdmin join should have embedded accountStatus summary",
    !!adminAuthorized.accountStatus && !!adminAuthorized.accountStatus.id,
  );

  // 2. Create at least one account status as platformAdmin
  const statusCreateBody = {
    key: RandomGenerator.alphaNumeric(8),
    label: RandomGenerator.paragraph({ sentences: 2 }),
    description: RandomGenerator.paragraph({ sentences: 4 }),
    isLoginAllowed: true,
    isPostingAllowed: true,
    isVotingAllowed: true,
    requiresManualReview: false,
  } satisfies ICommunityPlatformAccountStatus.ICreate;

  const createdStatus: ICommunityPlatformAccountStatus =
    await api.functional.communityPlatform.platformAdmin.accountStatuses.create(
      connection,
      {
        body: statusCreateBody,
      },
    );
  typia.assert(createdStatus);

  // 3. Generate a random UUID for securityEventId.
  // In simulation mode, the server returns mock data as long as the type
  // constraints are satisfied.
  const securityEventId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();

  // 4. Authorized access: platformAdmin should be able to fetch the binding
  const binding: ICommunityPlatformUserSecurityEventOfPlatformadmin =
    await api.functional.communityPlatform.platformAdmin.userSecurityEvents.platformAdmin.at(
      connection,
      {
        securityEventId,
      },
    );
  typia.assert(binding);

  // Business-level sanity checks on the returned binding
  TestValidator.equals(
    "binding.securityEvent.id should be a UUID matching the requested securityEventId in simulator context",
    binding.securityEvent.id,
    securityEventId,
  );
  TestValidator.predicate(
    "binding must reference a platformAdmin summary",
    !!binding.platformAdmin && !!binding.platformAdmin.id,
  );

  // 5. Unauthenticated access must fail
  const unauthenticatedConnection: api.IConnection = {
    ...connection,
    headers: {},
  };

  await TestValidator.error(
    "unauthenticated caller must not access platformAdmin security event binding",
    async () => {
      await api.functional.communityPlatform.platformAdmin.userSecurityEvents.platformAdmin.at(
        unauthenticatedConnection,
        {
          securityEventId,
        },
      );
    },
  );
}
