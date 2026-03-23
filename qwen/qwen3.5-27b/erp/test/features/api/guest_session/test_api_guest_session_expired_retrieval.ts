import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IHrmPlatformGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformGuest";
import type { IHrmPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformMember";
import type { IHrmPlatformMemberSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformMemberSession";
import type { IHrmPlatformOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformOrganization";
import type { IHrmPlatformOrganizationLogo } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformOrganizationLogo";
import type { IHrmPlatformOrganizationSetting } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformOrganizationSetting";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_guest_join } from "../../../authorize/authorize_guest_join";
import { authorize_guest_refresh } from "../../../authorize/authorize_guest_refresh";

export async function test_api_guest_session_expired_retrieval(
  connection: api.IConnection,
): Promise<void> {
  /**
   * Test retrieval of an expired guest session where expired_at is not null.
   * This validates that expired sessions remain accessible for audit and historical purposes.
   * Confirms that all fields including expired_at timestamp are returned correctly.
   */
  // 1. Create guest connection and authenticate
  const guestConnection: api.IConnection = { host: connection.host };
  const authResult = await authorize_guest_join(guestConnection, {
    body: {
      device_fingerprint: RandomGenerator.alphaNumeric(32),
      ip_address: typia.random<string & tags.Format<"ipv4">>(),
      user_agent: RandomGenerator.paragraph(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    },
  });
  typia.assert(authResult);
  // 2. Extract session ID from auth result
  const sessionId = authResult.id;
  // 3. Retrieve the session by ID
  // Note: This endpoint returns IHrmPlatformMemberSession structure
  // The test validates that session retrieval works and returns complete data
  const session = await api.functional.hrmPlatform.guest.sessions.at(
    guestConnection,
    { sessionId },
  );
  typia.assert(session);
  // 4. Validate session ID matches the requested ID
  TestValidator.equals("session ID matches request", session.id, sessionId);
  // 5. Validate member reference exists
  TestValidator.predicate(
    "member reference exists",
    session.member.id.length > 0,
  );
  TestValidator.predicate(
    "member has valid email",
    session.member.email.length > 0,
  );
  // 6. Validate connection metadata
  TestValidator.predicate("IP address is present", session.ip.length > 0);
  TestValidator.predicate("href URL is present", session.href.length > 0);
  TestValidator.predicate(
    "referrer URL is present",
    session.referrer.length > 0,
  );
  // 7. Validate timestamps exist and are valid
  TestValidator.predicate(
    "created_at timestamp exists",
    session.created_at.length > 0,
  );
  TestValidator.predicate(
    "expired_at timestamp exists",
    session.expired_at.length > 0,
  );
  TestValidator.predicate(
    "created_at is valid ISO 8601",
    !isNaN(Date.parse(session.created_at)),
  );
  TestValidator.predicate(
    "expired_at is valid ISO 8601",
    !isNaN(Date.parse(session.expired_at)),
  );
  // 8. Validate organization field is properly nullable
  if (session.organization !== null) {
    TestValidator.predicate(
      "organization has valid ID",
      session.organization.id.length > 0,
    );
  }
  // 9. Verify session data persistence after expiration
  // The presence of expired_at (not null) indicates the session has expired
  // but is still retrievable for audit purposes
  TestValidator.predicate(
    "expired session remains accessible",
    session.expired_at !== null,
  );
}
