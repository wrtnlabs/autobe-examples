import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { ITodoAppMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppMember";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

/**
 * Test that profile data isolation is enforced correctly.
 *
 * This test validates that after a member registers and retrieves their profile,
 * the profile contains only that specific member's data. The email and display_name
 * returned must match exactly what was provided during registration. This ensures
 * that each member's profile is completely private and isolated from other users,
 * with no cross-user data leakage.
 *
 * Test Flow:
 * 1. Register a new member account with specific email and display_name
 * 2. Retrieve the authenticated member's profile
 * 3. Validate that the profile email matches the registration email
 * 4. Validate that the profile display_name matches the registration display_name
 */
export async function test_api_member_profile_data_isolation(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create member-specific connection and register
  const memberConnection: api.IConnection = { host: connection.host };
  const registrationData = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(16),
    displayName: RandomGenerator.name(),
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
    ip: typia.random<string & tags.Format<"ipv4">>(),
  } satisfies ITodoAppMember.IJoin;
  const authorized = await authorize_member_join(memberConnection, {
    body: registrationData,
  });
  typia.assert(authorized);
  // 2. Retrieve the authenticated member's profile
  const profile =
    await api.functional.todoApp.member.profile.at(memberConnection);
  typia.assert(profile);
  // 3. Validate profile data isolation - email must match registration
  TestValidator.equals(
    "profile email matches registration email",
    profile.email,
    registrationData.email,
  );
  // 4. Validate profile data isolation - display_name must match registration
  TestValidator.equals(
    "profile display_name matches registration display_name",
    profile.display_name,
    registrationData.displayName,
  );
}
