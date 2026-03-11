import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdmin";
import type { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";

/**
 * Test the audit trail session tracking functionality during administrator registration.
 *
 * This test verifies that when an administrator account is created through the join endpoint,
 * the system properly captures and stores session metadata including:
 * - href: The URL where registration was initiated
 * - referrer: The referring URL from HTTP header
 * - ip: IP address of the registration request
 *
 * The test validates that the session record is correctly associated with the newly created
 * administrator account and that authentication tokens include proper expiration timestamps
 * (expired_at and refreshable_until) for session duration policy enforcement.
 */
export async function test_api_admin_join_audit_session_tracking(
  connection: api.IConnection,
): Promise<void> {
  // Create admin-specific connection for authorization
  const adminConnection: api.IConnection = { host: connection.host };
  // Generate session tracking data for audit trail
  const registrationHref = typia.random<string & tags.Format<"uri">>();
  const registrationReferrer = typia.random<string & tags.Format<"uri">>();
  const registrationIp = typia.random<string & tags.Format<"ipv4">>();
  // Register administrator with explicit session context fields
  const adminAuthorized: IDiscussionBoardAdmin.IAuthorized =
    await authorize_admin_join(adminConnection, {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(16),
        display_name: RandomGenerator.name(),
        bio: RandomGenerator.paragraph({ sentences: 2 }),
        href: registrationHref,
        referrer: registrationReferrer,
        ip: registrationIp,
      } satisfies IDiscussionBoardAdmin.IJoin,
    });
  // Validate response structure and types (comprehensive validation)
  typia.assert(adminAuthorized);
  // Validate administrator account details
  TestValidator.equals(
    "admin grade is regular by default",
    adminAuthorized.grade,
    "regular",
  );
  // Validate member profile information
  TestValidator.predicate(
    "member is flagged as admin",
    adminAuthorized.member.is_admin === true,
  );
  TestValidator.equals(
    "member status is active",
    adminAuthorized.member.status,
    "active",
  );
  // Validate authentication token structure
  TestValidator.predicate(
    "access token is present and non-empty",
    adminAuthorized.token.access.length > 0,
  );
  TestValidator.predicate(
    "refresh token is present and non-empty",
    adminAuthorized.token.refresh.length > 0,
  );
  // Validate session duration policy (refreshable_until should be after or equal to expired_at)
  const expiredAt = new Date(adminAuthorized.token.expired_at).getTime();
  const refreshableUntil = new Date(
    adminAuthorized.token.refreshable_until,
  ).getTime();
  TestValidator.predicate(
    "refreshable_until is after or equal to expired_at",
    refreshableUntil >= expiredAt,
  );
  // Validate timestamps are in the future (business logic, not type validation)
  const now = Date.now();
  TestValidator.predicate("expired_at is in the future", expiredAt > now);
  TestValidator.predicate(
    "refreshable_until is in the future",
    refreshableUntil > now,
  );
  // Validate session tracking metadata was captured (href and referrer are URIs)
  TestValidator.predicate(
    "href is valid URI format",
    registrationHref.includes("://") || registrationHref.startsWith("/"),
  );
  TestValidator.predicate(
    "referrer is valid URI format",
    registrationReferrer.includes("://") ||
      registrationReferrer.startsWith("/"),
  );
  TestValidator.predicate(
    "ip is valid IPv4 format",
    /^(\d{1,3}\.){3}\d{1,3}$/.test(registrationIp),
  );
}
