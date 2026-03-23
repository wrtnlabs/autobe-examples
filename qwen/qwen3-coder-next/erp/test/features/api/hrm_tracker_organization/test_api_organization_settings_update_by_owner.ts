import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IHrmTrackerMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTrackerMember";
import type { IHrmTrackerOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTrackerOrganization";
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

export async function test_api_organization_settings_update_by_owner(
  connection: api.IConnection,
) {
  // Step 1: Create member account
  const memberConnection: api.IConnection = { host: connection.host };
  const member = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(12),
      display_name: RandomGenerator.name(),
    },
  });
  typia.assert(member);
  // Step 2: Create organization
  const organization =
    await api.functional.hrmTracker.member.organizations.create(
      memberConnection,
      {
        body: typia.random<IHrmTrackerOrganization.ICreate>(),
      },
    );
  typia.assert(organization);
  // Step 3: Update organization settings
  const updateBody = {
    name: organization.name + " (Updated)",
    description: RandomGenerator.paragraph({ sentences: 2 }),
    currency: "KRW",
    timezone: "Asia/Seoul",
    fiscal_start_month: typia.random<
      number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<12>
    >() satisfies number as number,
  } satisfies IHrmTrackerOrganization.ISettingsUpdate;
  const updatedOrganization =
    await api.functional.hrmTracker.member.settings.updateSettings(
      memberConnection,
      {
        body: updateBody,
      },
    );
  typia.assert(updatedOrganization);
  // Step 4: Verify updated values
  TestValidator.equals(
    "name updated",
    updatedOrganization.name,
    updateBody.name,
  );
  TestValidator.equals(
    "description updated",
    updatedOrganization.description,
    updateBody.description,
  );
  TestValidator.equals(
    "currency updated",
    updatedOrganization.currency,
    updateBody.currency,
  );
  TestValidator.equals(
    "timezone updated",
    updatedOrganization.timezone,
    updateBody.timezone,
  );
  TestValidator.equals(
    "fiscal_start_month updated",
    updatedOrganization.fiscal_start_month,
    updateBody.fiscal_start_month,
  );
}
