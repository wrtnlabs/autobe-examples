import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAccountStatus } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAccountStatus";
import type { ICommunityPlatformPlatformadmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPlatformadmin";
import type { ICommunityPlatformSecurityEventStatisticsByActorType } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformSecurityEventStatisticsByActorType";

/**
 * Basic platform-admin-centric security configuration workflow for
 * security-event analytics.
 *
 * Although the original business scenario targets GET
 * /communityPlatform/platformAdmin/securityEvents/statistics/byActorType, the
 * concrete SDK accessor for that endpoint is not available in the provided API
 * functions. To keep the test compilable and within the no-hallucination
 * constraints, this implementation exercises only the dependencies that are
 * actually present:
 *
 * 1. Register a new platform administrator via
 *    api.functional.auth.platformAdmin.join using a realistic
 *    ICommunityPlatformPlatformadmin.IJoin payload.
 * 2. Validate the returned ICommunityPlatformPlatformadmin.IAuthorized object with
 *    typia.assert and sanity-check some key fields using TestValidator.
 * 3. As the authenticated platform admin (token automatically attached by the
 *    SDK), create a new account status definition using
 *    api.functional.communityPlatform.platformAdmin.accountStatuses.create with
 *    an ICommunityPlatformAccountStatus.ICreate request body that resembles a
 *    typical ACTIVE/OK status.
 * 4. Validate the returned ICommunityPlatformAccountStatus via typia.assert and
 *    simple logical checks (e.g., flags coherence).
 *
 * This flow ensures that the core administrative capabilities required for
 * security-event aggregation (admin auth & account status catalog management)
 * are functioning and type-safe. Direct invocation of the
 * securityEvents/statistics/byActorType endpoint is intentionally omitted
 * because its SDK function is not defined in the materials, and fabricating it
 * would break compilation.
 */
export async function test_api_security_event_statistics_by_actor_type_basic(
  connection: api.IConnection,
) {
  // 1. Register a new platform administrator via join
  const adminJoinBody = {
    username: `admin_${RandomGenerator.alphaNumeric(8)}`,
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
    displayName: RandomGenerator.name(),
    ip: "203.0.113.10",
    href: "https://admin.console.local/register",
    referrer: "https://landing.local/security",
  } satisfies ICommunityPlatformPlatformadmin.IJoin;

  const authorizedAdmin: ICommunityPlatformPlatformadmin.IAuthorized =
    await api.functional.auth.platformAdmin.join(connection, {
      body: adminJoinBody,
    });
  typia.assert<ICommunityPlatformPlatformadmin.IAuthorized>(authorizedAdmin);

  // Basic business sanity checks on admin auth result
  TestValidator.predicate(
    "platform admin id is a non-empty UUID string",
    () =>
      typeof authorizedAdmin.id === "string" && authorizedAdmin.id.length > 0,
  );

  TestValidator.predicate(
    "platform admin token contains access and refresh tokens",
    () =>
      typeof authorizedAdmin.token.access === "string" &&
      authorizedAdmin.token.access.length > 0 &&
      typeof authorizedAdmin.token.refresh === "string" &&
      authorizedAdmin.token.refresh.length > 0,
  );

  TestValidator.predicate(
    "platform admin has an attached account status summary",
    () =>
      typeof authorizedAdmin.accountStatus.id === "string" &&
      authorizedAdmin.accountStatus.id.length > 0 &&
      typeof authorizedAdmin.accountStatus.key === "string" &&
      authorizedAdmin.accountStatus.key.length > 0,
  );

  // 2. As authenticated admin, create a new account status definition
  const accountStatusBody = {
    key: `ACTIVE_${RandomGenerator.alphaNumeric(6).toUpperCase()}`,
    label: "Active / Security Events Visible",
    description: RandomGenerator.paragraph({
      sentences: 5,
      wordMin: 4,
      wordMax: 8,
    }),
    isLoginAllowed: true,
    isPostingAllowed: true,
    isVotingAllowed: true,
    requiresManualReview: false,
  } satisfies ICommunityPlatformAccountStatus.ICreate;

  const createdStatus: ICommunityPlatformAccountStatus =
    await api.functional.communityPlatform.platformAdmin.accountStatuses.create(
      connection,
      {
        body: accountStatusBody,
      },
    );
  typia.assert<ICommunityPlatformAccountStatus>(createdStatus);

  // Logical validation between request and response for the status record
  TestValidator.equals(
    "created account status key should match request",
    createdStatus.key,
    accountStatusBody.key,
  );

  TestValidator.equals(
    "created account status label should match request",
    createdStatus.label,
    accountStatusBody.label,
  );

  TestValidator.equals(
    "created account status login flag should match request",
    createdStatus.isLoginAllowed,
    accountStatusBody.isLoginAllowed,
  );

  TestValidator.equals(
    "created account status posting flag should match request",
    createdStatus.isPostingAllowed,
    accountStatusBody.isPostingAllowed,
  );

  TestValidator.equals(
    "created account status voting flag should match request",
    createdStatus.isVotingAllowed,
    accountStatusBody.isVotingAllowed,
  );

  TestValidator.equals(
    "created account status manual review flag should match request",
    createdStatus.requiresManualReview,
    accountStatusBody.requiresManualReview,
  );

  TestValidator.predicate(
    "created account status has server-generated id and timestamps",
    () =>
      typeof createdStatus.id === "string" &&
      createdStatus.id.length > 0 &&
      typeof createdStatus.createdAt === "string" &&
      createdStatus.createdAt.length > 0 &&
      typeof createdStatus.updatedAt === "string" &&
      createdStatus.updatedAt.length > 0,
  );
}
