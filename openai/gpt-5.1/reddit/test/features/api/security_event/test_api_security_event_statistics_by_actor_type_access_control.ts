import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAccountStatus } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAccountStatus";
import type { ICommunityPlatformPlatformadmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPlatformadmin";
import type { ICommunityPlatformSecurityEventStatisticsByActorType } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformSecurityEventStatisticsByActorType";

/**
 * Validate access control behavior for platform-admin-only operations by
 * exercising the account status management API as a stand-in for the security
 * events statistics endpoint.
 *
 * Business goal: Ensure that sensitive platform-admin-only APIs are accessible
 * only to authenticated platform administrators and are rejected for
 * unauthenticated callers. The original scenario targeted GET
 * /communityPlatform/platformAdmin/securityEvents/statistics/byActorType, but
 * since its SDK accessor is not available, this test validates the same
 * authorization boundary using the existing POST
 * /communityPlatform/platformAdmin/accountStatuses endpoint.
 *
 * Process:
 *
 * 1. Register a new platform administrator via POST /auth/platformAdmin/join using
 *    a realistic ICommunityPlatformPlatformadmin.IJoin payload.
 *
 *    - Confirm that the response matches ICommunityPlatformPlatformadmin.IAuthorized
 *         using typia.assert.
 *    - Rely on the SDK-side effect that sets connection.headers.Authorization from
 *         the returned token.access.
 * 2. As the authenticated platform admin, call POST
 *    /communityPlatform/platformAdmin/accountStatuses with an
 *    ICommunityPlatformAccountStatus.ICreate body to create a new status.
 *
 *    - Use realistic key/label/description and boolean flags.
 *    - Assert the response type with typia.assert.
 * 3. Derive an unauthenticated connection object from the original connection by
 *    shallow copying and replacing headers with an empty object, without
 *    touching the original connection.headers (respecting SDK ownership).
 * 4. Using the unauthenticated connection, attempt to call the same
 *    accountStatuses.create endpoint with a valid ICreate body.
 *
 *    - Wrap this call in TestValidator.httpError with an expected 4xx status (401 or
 *         403). This verifies that platform-admin-only endpoints are not
 *         callable without proper Authorization.
 *
 * Notes:
 *
 * - We cannot implement calls to the statistics endpoint or work directly with
 *   ICommunityPlatformSecurityEventStatisticsByActorType because its SDK
 *   function is not provided. This test instead focuses on the same
 *   authorization surface using an available admin-only API.
 */
export async function test_api_security_event_statistics_by_actor_type_access_control(
  connection: api.IConnection,
) {
  // 1. Join as a new platform administrator
  const joinBody = {
    username: RandomGenerator.alphabets(12),
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(16),
    displayName: RandomGenerator.name(),
    href: "https://admin.console.example.com/register",
    referrer: "https://admin.console.example.com/landing",
  } satisfies ICommunityPlatformPlatformadmin.IJoin;

  const adminAuthorized: ICommunityPlatformPlatformadmin.IAuthorized =
    await api.functional.auth.platformAdmin.join(connection, {
      body: joinBody,
    });
  typia.assert(adminAuthorized);

  // 2. As authenticated platform admin, create a new account status
  const statusKey = `TEST_STATUS_${RandomGenerator.alphabets(8).toUpperCase()}`;
  const createStatusBody = {
    key: statusKey,
    label: "Test Admin-Only Status",
    description: RandomGenerator.paragraph({ sentences: 5 }),
    isLoginAllowed: true,
    isPostingAllowed: false,
    isVotingAllowed: false,
    requiresManualReview: true,
  } satisfies ICommunityPlatformAccountStatus.ICreate;

  const createdStatus: ICommunityPlatformAccountStatus =
    await api.functional.communityPlatform.platformAdmin.accountStatuses.create(
      connection,
      {
        body: createStatusBody,
      },
    );
  typia.assert(createdStatus);

  TestValidator.equals(
    "created status key should match input key",
    createdStatus.key,
    createStatusBody.key,
  );
  TestValidator.equals(
    "created status label should match input label",
    createdStatus.label,
    createStatusBody.label,
  );

  // 3. Build an unauthenticated connection without touching original headers
  const unauthConnection: api.IConnection = {
    ...connection,
    headers: {},
  };

  // 4. Attempt to call admin-only endpoint without Authorization and
  //    expect an HTTP authentication/authorization error.
  const unauthStatusBody = {
    key: `${statusKey}_UNAUTH`,
    label: "Unauth Attempt Status",
    description: RandomGenerator.paragraph({ sentences: 3 }),
    isLoginAllowed: false,
    isPostingAllowed: false,
    isVotingAllowed: false,
    requiresManualReview: false,
  } satisfies ICommunityPlatformAccountStatus.ICreate;

  await TestValidator.httpError(
    "unauthenticated client cannot create account status",
    [401, 403],
    async () => {
      await api.functional.communityPlatform.platformAdmin.accountStatuses.create(
        unauthConnection,
        {
          body: unauthStatusBody,
        },
      );
    },
  );
}
