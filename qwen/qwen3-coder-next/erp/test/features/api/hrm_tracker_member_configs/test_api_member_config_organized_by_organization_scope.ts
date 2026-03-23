import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IHrmTrackerMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTrackerMember";
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
import { prepare_random_hrm_tracker_system_config } from "../../../prepare/prepare_random_hrm_tracker_system_config";

export async function test_api_member_config_organized_by_organization_scope(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create first member in organization A
  const member1Connection: api.IConnection = { host: connection.host };
  const member1 = await authorize_member_join(member1Connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(12),
      display_name: RandomGenerator.name(),
    },
  });
  typia.assert(member1);
  // 2. Create second member in organization B
  const member2Connection: api.IConnection = { host: connection.host };
  const member2 = await authorize_member_join(member2Connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(12),
      display_name: RandomGenerator.name(),
    },
  });
  typia.assert(member2);
  // 3. First member creates a configuration
  const config1 = await generate_random_hrm_tracker_member_configs_create(
    member1Connection,
    {
      body: {
        key: "currency",
        value: "USD",
      },
    },
  );
  typia.assert(config1);
  // 4. Second member creates the same configuration
  const config2 = await generate_random_hrm_tracker_member_configs_create(
    member2Connection,
    {
      body: {
        key: "currency",
        value: "USD",
      },
    },
  );
  typia.assert(config2);
  // 5. Verify configurations exist independently
  TestValidator.equals("config1 has correct key", config1.key, "currency");
  TestValidator.equals("config1 has correct value", config1.value, "USD");
  TestValidator.equals("config2 has correct key", config2.key, "currency");
  TestValidator.equals("config2 has correct value", config2.value, "USD");
  TestValidator.notEquals(
    "different organizations",
    config1.hrm_tracker_organization_id,
    config2.hrm_tracker_organization_id,
  );
}
