import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IHrmTrackerMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTrackerMember";
import type { IHrmTrackerOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTrackerOrganization";
import type { IHrmTrackerSystemConfig } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTrackerSystemConfig";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_hrm_tracker_member_configs_create } from "../../../generate/generate_random_hrm_tracker_member_configs_create";
import { generate_random_hrm_tracker_member_organizations_create } from "../../../generate/generate_random_hrm_tracker_member_organizations_create";
import { prepare_random_hrm_tracker_organization } from "../../../prepare/prepare_random_hrm_tracker_organization";
import { prepare_random_hrm_tracker_system_config } from "../../../prepare/prepare_random_hrm_tracker_system_config";

export async function test_api_hrm_tracker_system_config_isolation(
  connection: api.IConnection,
): Promise<void> {
  // 1. Join as member and create first organization
  const memberConnection1: api.IConnection = { host: connection.host };
  const authorized1 = await authorize_member_join(memberConnection1, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(12),
      display_name: RandomGenerator.name(),
    } satisfies IHrmTrackerMember.IJoin,
  });
  typia.assert(authorized1);
  const org1 = await generate_random_hrm_tracker_member_organizations_create(
    memberConnection1,
    {
      body: {
        name: RandomGenerator.name(),
        currency: "USD",
        timezone: "America/New_York",
        fiscal_start_month: 1 satisfies number &
          tags.Type<"int32"> &
          tags.Minimum<1> &
          tags.Maximum<12>,
      } satisfies IHrmTrackerOrganization.ICreate,
    },
  );
  typia.assert(org1);
  // Set fiscal_start_month=1 config for org1
  const config1 = await api.functional.hrmTracker.member.configs.create(
    memberConnection1,
    {
      body: {
        key: "fiscal_start_month",
        value: "2024-01-01",
      } satisfies IHrmTrackerSystemConfig.ICreate,
    },
  );
  typia.assert(config1);
  TestValidator.equals("config1 key", config1.key, "fiscal_start_month");
  TestValidator.equals("config1 value", config1.value, "2024-01-01");
  TestValidator.equals(
    "config1 org matches",
    config1.hrm_tracker_organization_id,
    org1.id,
  );
  // 2. Create second organization using same member connection
  const org2 = await generate_random_hrm_tracker_member_organizations_create(
    memberConnection1,
    {
      body: {
        name: RandomGenerator.name(),
        currency: "USD",
        timezone: "America/New_York",
        fiscal_start_month: 7 satisfies number &
          tags.Type<"int32"> &
          tags.Minimum<1> &
          tags.Maximum<12>,
      } satisfies IHrmTrackerOrganization.ICreate,
    },
  );
  typia.assert(org2);
  // Set fiscal_start_month=7 config for org2
  const config2 = await api.functional.hrmTracker.member.configs.create(
    memberConnection1,
    {
      body: {
        key: "fiscal_start_month",
        value: "2024-07-01",
      } satisfies IHrmTrackerSystemConfig.ICreate,
    },
  );
  typia.assert(config2);
  TestValidator.equals("config2 key", config2.key, "fiscal_start_month");
  TestValidator.equals("config2 value", config2.value, "2024-07-01");
  TestValidator.equals(
    "config2 org matches",
    config2.hrm_tracker_organization_id,
    org2.id,
  );
  // 3. Test isolation: retrieve configs and verify each returns correct value
  const retrievedConfig1 = await api.functional.hrmTracker.member.configs.at(
    memberConnection1,
    {
      configKey: "fiscal_start_month",
    },
  );
  typia.assert(retrievedConfig1);
  TestValidator.equals(
    "isolated config1 matches",
    retrievedConfig1.value,
    "2024-01-01",
  );
  const retrievedConfig2 = await api.functional.hrmTracker.member.configs.at(
    memberConnection1,
    {
      configKey: "fiscal_start_month",
    },
  );
  typia.assert(retrievedConfig2);
  TestValidator.equals(
    "isolated config2 matches",
    retrievedConfig2.value,
    "2024-07-01",
  );
  // 4. Verify configs have different values and correct organization associations
  TestValidator.notEquals(
    "configs differ",
    config1.hrm_tracker_organization_id,
    config2.hrm_tracker_organization_id,
  );
  TestValidator.equals(
    "config1 belongs to org1",
    config1.hrm_tracker_organization_id,
    org1.id,
  );
  TestValidator.equals(
    "config2 belongs to org2",
    config2.hrm_tracker_organization_id,
    org2.id,
  );
}
