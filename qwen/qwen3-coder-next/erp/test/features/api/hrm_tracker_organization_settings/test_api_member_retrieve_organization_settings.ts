import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IHrmTrackerMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTrackerMember";
import type { IHrmTrackerOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTrackerOrganization";
import type { IHrmTrackerOrganizationSetting } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTrackerOrganizationSetting";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_hrm_tracker_member_organizations_create } from "../../../generate/generate_random_hrm_tracker_member_organizations_create";
import { prepare_random_hrm_tracker_organization } from "../../../prepare/prepare_random_hrm_tracker_organization";

export async function test_api_member_retrieve_organization_settings(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create member account using utility function
  const memberConnection: api.IConnection = { host: connection.host };
  const member = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(12),
      display_name: RandomGenerator.name(),
      phone: null,
    } satisfies IHrmTrackerMember.IJoin,
  });
  typia.assert(member);
  // 2. Create organization
  const organization =
    await api.functional.hrmTracker.member.organizations.create(
      memberConnection,
      {
        body: {
          name: RandomGenerator.name(),
          description: null,
          logo_image_uri: null,
          currency: "USD",
          timezone: "America/New_York",
          fiscal_start_month: 1,
        } satisfies IHrmTrackerOrganization.ICreate,
      },
    );
  typia.assert(organization);
  // 3. Retrieve organization settings
  const settings =
    await api.functional.hrmTracker.member.settings.at(memberConnection);
  typia.assert(settings);
  // 4. Validate all expected fields
  TestValidator.equals("fiscal_start_month", settings.fiscal_start_month, 1);
  TestValidator.equals("currency", settings.currency, "USD");
  TestValidator.equals("timezone", settings.timezone, "America/New_York");
  TestValidator.equals("name", settings.name, organization.name);
  TestValidator.equals("logo_url", settings.logo_url, null);
}
