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

export async function test_api_member_create_organization_config(
  connection: api.IConnection,
): Promise<void> {
  // 1. Member registration to establish organization context
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
  // 2. Create a new configuration entry
  const configKey = `test_config_${RandomGenerator.alphabets(8)}`;
  const configValue = RandomGenerator.paragraph({ sentences: 3 });
  const createdConfig = await api.functional.hrmTracker.member.configs.create(
    memberConnection,
    {
      body: {
        key: configKey,
        value: configValue,
      } satisfies IHrmTrackerSystemConfig.ICreate,
    },
  );
  typia.assert(createdConfig);
  // 3. Validate created configuration structure
  TestValidator.equals("config key matches", createdConfig.key, configKey);
  TestValidator.equals(
    "config value matches",
    createdConfig.value,
    configValue,
  );
  TestValidator.predicate(
    "has valid UUID id",
    /^[0-9a-f-]{36}$/i.test(createdConfig.id),
  );
  TestValidator.predicate(
    "has valid organization UUID",
    /^[0-9a-f-]{36}$/i.test(createdConfig.hrm_tracker_organization_id),
  );
  TestValidator.predicate(
    "created_at is valid date-time",
    /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/.test(
      createdConfig.created_at,
    ),
  );
  // 4. Test duplicate key error within same organization
  await TestValidator.error("duplicate key throws error", async () => {
    await api.functional.hrmTracker.member.configs.create(memberConnection, {
      body: {
        key: configKey,
        value: RandomGenerator.paragraph({ sentences: 1 }),
      } satisfies IHrmTrackerSystemConfig.ICreate,
    });
  });
  // 5. Verify deleted_at is null (active record)
  TestValidator.equals("config not deleted", createdConfig.deleted_at, null);
}
