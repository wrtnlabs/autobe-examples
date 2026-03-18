import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IHrmPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformMember";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

/**
 * Test that an authenticated member can successfully retrieve their own profile information.
 *
 * Test Steps:
 * 1. Register a new member account with email, password, and display name
 * 2. Use the authenticated member to call GET /hrmPlatform/members/{memberId} with their own member ID
 * 3. Verify the response contains complete profile information: id, email, displayName, avatarUrl, phoneNumber, createdAt, updatedAt, deletedAt
 * 4. Verify password_hash is NOT included in the response (security requirement)
 * 5. Verify all returned fields match the data provided during registration
 *
 * Validation Points:
 * - Response status should be 200 OK
 * - Response body should match IHrmPlatformMember schema
 * - Email should match the registration email
 * - Display name should match the registration display name
 * - avatarUrl and phoneNumber may be null if not provided
 * - Timestamps should be valid ISO 8601 date-time format
 * - deletedAt should be null (account is active)
 */
export async function test_api_member_profile_retrieval_own(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register new member account
  const memberConnection: api.IConnection = { host: connection.host };
  const registration = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      avatar_url: typia.random<(string & tags.Format<"uri">) | null>(),
      phone_number: RandomGenerator.mobile(),
      ip: typia.random<(string & tags.Format<"ipv4">) | null>(),
    } satisfies IHrmPlatformMember.IJoin,
  });
  typia.assert(registration);
  // 2. Retrieve own profile using member ID from registration
  const profile = await api.functional.hrmPlatform.members.at(
    memberConnection,
    {
      memberId: registration.id,
    },
  );
  typia.assert(profile);
  // 3. Validate profile matches registration data
  TestValidator.equals(
    "email matches registration",
    profile.email,
    registration.email,
  );
  TestValidator.equals(
    "display name matches registration",
    profile.displayName,
    registration.member.display_name,
  );
  TestValidator.equals(
    "avatar url matches registration",
    profile.avatarUrl,
    registration.member.avatar_url,
  );
  TestValidator.equals(
    "phone number matches registration",
    profile.phoneNumber,
    registration.member.phone_number,
  );
  // 4. Validate account is active (deletedAt is null)
  TestValidator.predicate("account is active", profile.deletedAt === null);
}
