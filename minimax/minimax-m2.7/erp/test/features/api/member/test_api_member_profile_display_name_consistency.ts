import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IErpHrmMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmMember";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

/**
 * Test that the profile display_name is correctly shown in the profile response.
 *
 * Steps:
 * 1. Register a new member via POST /erpHrm/auth/member/join with a specific display_name like 'John Smith'
 * 2. Call GET /erpHrm/member/profile with the authenticated session
 *
 * Expected validation:
 * - Response status should be 200 OK
 * - display_name should exactly match 'John Smith'
 * - This display_name will be shown in employee records, activity logs, and timesheets across all organizations the member belongs to
 * - The profile is shared globally across organizations as per the business rule
 */
export async function test_api_member_profile_display_name_consistency(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Register a new member with specific display name
  const displayName = "John Smith";
  const authorized = await authorize_member_join(connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: displayName,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  // Create authenticated connection with the token from join
  const memberConnection: api.IConnection = { host: connection.host };
  memberConnection.headers ??= {};
  memberConnection.headers.Authorization = authorized.token.access;
  // Step 2: Call GET /erpHrm/member/profile with authenticated session
  const profile =
    await api.functional.erpHrm.member.profile.at(memberConnection);
  typia.assert(profile);
  // Validation: display_name should exactly match the input
  TestValidator.equals(
    "display_name matches exactly",
    profile.display_name,
    displayName,
  );
}
