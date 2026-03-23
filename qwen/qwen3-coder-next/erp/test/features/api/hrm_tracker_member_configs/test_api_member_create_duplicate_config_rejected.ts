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

export async function test_api_member_create_duplicate_config_rejected(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create member and establish organization context
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
  // 2. Create initial configuration
  const config1 = await api.functional.hrmTracker.member.configs.create(
    memberConnection,
    {
      body: {
        key: "test_config_key_" + RandomGenerator.alphaNumeric(8),
        value: "initial_value",
      } satisfies IHrmTrackerSystemConfig.ICreate,
    },
  );
  typia.assert(config1);
  // 3. Attempt duplicate configuration (same key in same organization)
  await TestValidator.error("duplicate key rejected", async () => {
    await api.functional.hrmTracker.member.configs.create(memberConnection, {
      body: {
        key: config1.key, // Same key
        value: "duplicate_value",
      } satisfies IHrmTrackerSystemConfig.ICreate,
    });
  });
}
