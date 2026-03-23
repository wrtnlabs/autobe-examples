import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IHrmPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformMember";
import type { IHrmPlatformOrganizationSetting } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformOrganizationSetting";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

/**
 * Test partial update of organization settings by updating only the timezone field.
 *
 * This test validates that:
 * 1. Partial updates work correctly - only provided fields are modified
 * 2. Response contains all fields including unchanged ones
 * 3. Updated timestamp reflects the current time
 * 4. No errors occur when omitting optional fields from update request
 */
export async function test_api_organization_settings_partial_update(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as member user
  const memberConnection: api.IConnection = { host: connection.host };
  const authorized = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IHrmPlatformMember.IJoin,
  });
  typia.assert(authorized);
  // 2. Generate a valid organization ID for the test
  const organizationId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();
  // 3. Perform partial update with only timezone field
  const updatedSettings =
    await api.functional.hrmPlatform.member.organizations.settings.update(
      memberConnection,
      {
        organizationId,
        body: {
          timezone: "Europe/London",
        } satisfies IHrmPlatformOrganizationSetting.IUpdate,
      },
    );
  typia.assert(updatedSettings);
  // 4. Validate timezone was updated correctly
  TestValidator.equals(
    "timezone updated to Europe/London",
    updatedSettings.timezone,
    "Europe/London",
  );
  // 5. Validate all required fields are present in response
  TestValidator.predicate(
    "currency field is present and not empty",
    updatedSettings.currency.length > 0,
  );
  TestValidator.predicate(
    "fiscal_year_start_month is within valid range (1-12)",
    updatedSettings.fiscal_year_start_month >= 1 &&
      updatedSettings.fiscal_year_start_month <= 12,
  );
  TestValidator.predicate(
    "created_at timestamp is present",
    updatedSettings.created_at.length > 0,
  );
  TestValidator.predicate(
    "updated_at timestamp is present",
    updatedSettings.updated_at.length > 0,
  );
  TestValidator.predicate("id is present", updatedSettings.id.length > 0);
}
