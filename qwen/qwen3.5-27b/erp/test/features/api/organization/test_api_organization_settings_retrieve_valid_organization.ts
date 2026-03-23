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
 * Test organization settings retrieval for a valid organization.
 *
 * This test validates that an authenticated member can successfully retrieve
 * organization settings and that all required fields contain valid values.
 */
export async function test_api_organization_settings_retrieve_valid_organization(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as a member user
  const memberConnection: api.IConnection = { host: connection.host };
  const member = await authorize_member_join(memberConnection, {});
  typia.assert(member);
  // 2. Retrieve organization settings
  const organizationId = typia.random<string & tags.Format<"uuid">>();
  const settings =
    await api.functional.hrmPlatform.member.organizations.settings.at(
      memberConnection,
      {
        organizationId,
      },
    );
  typia.assert(settings);
  // 3. Validate business logic and field values
  // typia.assert() already validates all types, so we only test business logic
  TestValidator.predicate(
    "currency is valid ISO 4217 code",
    /^[A-Z]{3}$/.test(settings.currency),
  );
  TestValidator.predicate(
    "timezone is valid IANA identifier",
    settings.timezone === "UTC" ||
      /^[A-Za-z]+\/[A-Za-z]+([A-Za-z0-9_]+)*$/.test(settings.timezone),
  );
  TestValidator.predicate(
    "fiscal_year_start_month is between 1 and 12",
    settings.fiscal_year_start_month >= 1 &&
      settings.fiscal_year_start_month <= 12,
  );
}
