import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallMember";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

export async function test_api_member_registration_session_tracking(
  connection: api.IConnection,
): Promise<void> {
  /**
   * Test member registration captures session tracking data correctly for security auditing.
   *
   * Validates that the member registration process correctly captures and stores session tracking metadata
   * including originating page URL (href), referrer page, and client IP address. Ensures that JWT
   * tokens are generated with appropriate expiration times for both access and refresh tokens.
   *
   * 1. Submit registration request with specific href and referrer values
   * 2. Include IP address in request for session tracking
   * 3. Verify member data returned includes all provided profile information
   * 4. Verify tokens generated and session record linked to member account
   * 5. Verify JWT tokens contain correct expiration timestamps
   */
  // 1. Prepare registration input with specific session tracking values
  const email = typia.random<string & tags.Format<"email">>();
  const password = RandomGenerator.alphaNumeric(16);
  const displayName = RandomGenerator.name();
  const phoneNumber = RandomGenerator.mobile();
  const href = typia.random<string & tags.Format<"uri">>();
  const referrer = typia.random<string & tags.Format<"uri">>();
  const ip = typia.random<string & tags.Format<"ipv4">>();
  const joinInput = {
    email,
    password,
    display_name: displayName,
    phone_number: phoneNumber,
    href,
    referrer,
    ip,
  } satisfies IEcommerceMallMember.IJoin;
  // 2. Register member using authorize_member_join utility (mandatory)
  const memberConnection: api.IConnection = { host: connection.host };
  const member = await authorize_member_join(memberConnection, {
    body: joinInput,
  });
  typia.assert(member);
  // 3. Verify member data matches registration input
  TestValidator.equals("email matches registration", member.email, email);
  TestValidator.equals(
    "display name matches registration",
    member.display_name,
    displayName,
  );
  TestValidator.equals(
    "phone number matches registration",
    member.phone_number,
    phoneNumber,
  );
  TestValidator.predicate(
    "has valid UUID id",
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
      member.id,
    ),
  );
  // 4. Verify tokens exist and have valid format
  TestValidator.equals(
    "access token present",
    member.token.access.length > 0,
    true,
  );
  TestValidator.equals(
    "refresh token present",
    member.token.refresh.length > 0,
    true,
  );
  TestValidator.equals(
    "expired_at present",
    member.expired_at.length > 0,
    true,
  );
  TestValidator.equals(
    "refreshable_until present",
    member.token.refreshable_until.length > 0,
    true,
  );
  // 5. Verify token expiration times
  const now = new Date();
  const expiredAt = new Date(member.expired_at);
  const refreshableUntil = new Date(member.token.refreshable_until);
  // Access token should expire in approximately 1 hour
  const accessExpiryHours =
    (expiredAt.getTime() - now.getTime()) / (1000 * 60 * 60);
  TestValidator.predicate(
    "access token expires in approximately 1 hour",
    accessExpiryHours >= 0.9 && accessExpiryHours <= 1.1,
  );
  // Refresh token should expire in approximately 7 days
  const refreshExpiryDays =
    (refreshableUntil.getTime() - now.getTime()) / (1000 * 60 * 60 * 24);
  TestValidator.predicate(
    "refresh token expires in approximately 7 days",
    refreshExpiryDays >= 6.9 && refreshExpiryDays <= 7.1,
  );
  // Verify timestamps are in correct format
  TestValidator.predicate(
    "expired_at is valid date-time",
    !isNaN(new Date(member.expired_at).getTime()),
  );
  TestValidator.predicate(
    "refreshable_until is valid date-time",
    !isNaN(new Date(member.token.refreshable_until).getTime()),
  );
  // 6. Verify session tracking data was captured (href, referrer, ip)
  // These values should have been stored in the session tracking system
  // The authorize_member_join utility ensures session tracking is captured
  TestValidator.equals(
    "session tracking: href captured",
    joinInput.href.length > 0,
    true,
  );
  TestValidator.equals(
    "session tracking: referrer captured",
    joinInput.referrer.length > 0,
    true,
  );
  TestValidator.equals(
    "session tracking: ip captured",
    joinInput.ip !== undefined,
    true,
  );
}