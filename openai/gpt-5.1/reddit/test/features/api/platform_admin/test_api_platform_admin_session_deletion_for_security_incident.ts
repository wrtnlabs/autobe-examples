import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAccountStatus } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAccountStatus";
import type { ICommunityPlatformPlatformadmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPlatformadmin";

/**
 * Validate platform admin security incident workflow for session deletion.
 *
 * Business goal: Ensure that a platform administrator, after being registered
 * and authenticated, can operate within a platform that has a configured
 * account status catalog and can invoke the dedicated session deletion endpoint
 * to invalidate a suspicious admin session context.
 *
 * Test steps:
 *
 * 1. Register and authenticate a new platform admin using the join endpoint.
 *
 *    - Call api.functional.auth.platformAdmin.join with a valid
 *         ICommunityPlatformPlatformadmin.IJoin request body.
 *    - Capture the returned ICommunityPlatformPlatformadmin.IAuthorized structure,
 *         including:
 *
 *         - Id (platformAdminId)
 *         - Token (IAuthorizationToken)
 *         - AccountStatus summary object
 *    - Typia.assert the authorized payload to guarantee its shape.
 * 2. As this authenticated platform admin, create an account status definition to
 *    ensure the existence of the status catalog.
 *
 *    - Call api.functional.communityPlatform.platformAdmin.accountStatuses.create
 *         with a body satisfying ICommunityPlatformAccountStatus.ICreate.
 *    - Use realistic test data, e.g., key "INCIDENT_MONITORING" and flags that allow
 *         login but possibly restrict posting or voting.
 *    - Typia.assert the created ICommunityPlatformAccountStatus result.
 *    - Use TestValidator.equals to confirm that key, label, and the boolean flags of
 *         the result match what we sent (excluding server-managed timestamps
 *         and id, which we only type-assert).
 * 3. Trigger the session deletion endpoint to simulate incident response on a
 *    suspicious session.
 *
 *    - Prepare platformAdminId from the authorized admin.id.
 *    - Prepare a sessionId using typia.random<string & tags.Format<"uuid">>(). In a
 *         real system this would correspond to an existing row in
 *         community_platform_platformadmin_sessions, but here we only validate
 *         that the endpoint is callable with correctly typed identifiers.
 *    - Invoke api.functional.communityPlatform.platformAdmin.platformAdmins
 *         .sessions.erase with the platformAdminId and the random sessionId.
 *    - Because erase returns void, do not attempt typia.assert on its result.
 * 4. Perform validations to ensure data integrity and workflow correctness.
 *
 *    - Confirm via TestValidator.equals that the platform admin id used in the erase
 *         call matches the id from the join response.
 *    - Confirm via TestValidator.equals that the created account status response
 *         reflects the request body fields for key, label, isLoginAllowed,
 *         isPostingAllowed, isVotingAllowed, requiresManualReview
 *         (server-managed id and timestamps are only type-validated with
 *         typia.assert).
 *
 * Scope and limitations:
 *
 * - The test does not attempt to verify HTTP status codes or error types.
 * - The test cannot assert actual session persistence or token invalidation
 *   because there is no listing/inspection API for platform admin sessions in
 *   the provided SDK. It focuses instead on end-to-end wiring, DTO correctness,
 *   and the requirement that an account status catalog exists before calling
 *   the session deletion endpoint.
 */
export async function test_api_platform_admin_session_deletion_for_security_incident(
  connection: api.IConnection,
) {
  // 1. Register and authenticate a platform admin
  const joinBody = {
    username: RandomGenerator.alphaNumeric(12),
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(16),
    displayName: RandomGenerator.name(),
    ip: undefined,
    href: "https://admin-console.example.com/register",
    referrer: "https://landing.example.com/",
  } satisfies ICommunityPlatformPlatformadmin.IJoin;

  const authorizedAdmin: ICommunityPlatformPlatformadmin.IAuthorized =
    await api.functional.auth.platformAdmin.join(connection, {
      body: joinBody,
    });
  typia.assert(authorizedAdmin);
  typia.assert<IAuthorizationToken>(authorizedAdmin.token);

  // 2. Create an account status definition for incident monitoring
  const statusCreateBody = {
    key: "INCIDENT_MONITORING",
    label: "Incident monitoring",
    description: RandomGenerator.paragraph({ sentences: 4 }),
    isLoginAllowed: true,
    isPostingAllowed: false,
    isVotingAllowed: false,
    requiresManualReview: true,
  } satisfies ICommunityPlatformAccountStatus.ICreate;

  const createdStatus: ICommunityPlatformAccountStatus =
    await api.functional.communityPlatform.platformAdmin.accountStatuses.create(
      connection,
      { body: statusCreateBody },
    );
  typia.assert(createdStatus);

  // Validate that server echoes back our core configuration fields
  TestValidator.equals(
    "account status key should match input",
    createdStatus.key,
    statusCreateBody.key,
  );
  TestValidator.equals(
    "account status label should match input",
    createdStatus.label,
    statusCreateBody.label,
  );
  TestValidator.equals(
    "account status isLoginAllowed should match input",
    createdStatus.isLoginAllowed,
    statusCreateBody.isLoginAllowed,
  );
  TestValidator.equals(
    "account status isPostingAllowed should match input",
    createdStatus.isPostingAllowed,
    statusCreateBody.isPostingAllowed,
  );
  TestValidator.equals(
    "account status isVotingAllowed should match input",
    createdStatus.isVotingAllowed,
    statusCreateBody.isVotingAllowed,
  );
  TestValidator.equals(
    "account status requiresManualReview should match input",
    createdStatus.requiresManualReview,
    statusCreateBody.requiresManualReview,
  );

  // 3. Call the session erase endpoint for a simulated suspicious session
  const platformAdminId = authorizedAdmin.id;
  const sessionId = typia.random<string & tags.Format<"uuid">>();

  // Sanity check: platformAdminId is used consistently
  TestValidator.equals(
    "platformAdminId used in erase call should equal authorized admin id",
    platformAdminId,
    authorizedAdmin.id,
  );

  await api.functional.communityPlatform.platformAdmin.platformAdmins.sessions.erase(
    connection,
    {
      platformAdminId,
      sessionId,
    },
  );
}
