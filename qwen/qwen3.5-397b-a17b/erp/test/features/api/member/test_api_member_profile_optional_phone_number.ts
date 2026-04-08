import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IHrmPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformMember";
import type { IHrmPlatformUserProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformUserProfile";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

/**
 * Test profile retrieval when the optional phone_number field is null.
 *
 * Validates that a member's profile can be successfully retrieved even when the phone_number field is not provided (null). This test ensures that optional contact information does not prevent profile access and that the null value is properly handled throughout the system.
 *
 * The test creates a new member account without providing phone number information, then retrieves the profile to verify that all required fields are present and phone_number is explicitly null rather than omitted. This demonstrates proper nullable field handling in the profile system.
 *
 * 1. Member account is created via /hrmPlatform/auth/member/join with randomized credentials.
 * 2. Profile is automatically created during member registration with phone_number as null.
 * 3. GET /hrmPlatform/member/profile is called with the authenticated member's access token.
 * 4. Response is validated to ensure phone_number is null and member information matches.
 * 5. Business logic validates that profile remains fully functional without phone contact information.
 */
export async function test_api_member_profile_optional_phone_number(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create member account with authentication
  const memberConnection: api.IConnection = { host: connection.host };
  const memberAuth = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IHrmPlatformMember.IJoin,
  });
  typia.assert(memberAuth);
  // 2. Retrieve profile with authenticated connection
  const profile =
    await api.functional.hrmPlatform.member.profile.at(memberConnection);
  typia.assert(profile);
  // 3. Validate phone_number is explicitly null (main test objective)
  TestValidator.equals("phone_number is null", profile.phone_number, null);
  // 4. Validate member information matches authenticated user
  TestValidator.equals("member id matches", profile.member.id, memberAuth.id);
  TestValidator.equals(
    "member email matches",
    profile.member.email,
    memberAuth.email,
  );
  // 5. Validate profile is functional for user identification
  TestValidator.predicate(
    "display_name available for identification",
    profile.display_name.length > 0,
  );
  TestValidator.predicate(
    "avatar_url is valid URI",
    profile.avatar_url.startsWith("http"),
  );
}
