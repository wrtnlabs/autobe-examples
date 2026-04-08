import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IErpHrmDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmDepartment";
import type { IErpHrmEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmEmployee";
import type { IErpHrmMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmMember";
import type { IErpHrmOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmOrganization";
import type { IErpHrmOrganizationContext } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmOrganizationContext";
import type { IErpHrmProject } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmProject";
import type { IErpHrmRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmRole";
import type { IErpHrmTask } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTask";
import type { IErpHrmTimer } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimer";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_erp_hrm_member_organization_context_select } from "../../../generate/generate_random_erp_hrm_member_organization_context_select";
import { generate_random_erp_hrm_member_timers_create } from "../../../generate/generate_random_erp_hrm_member_timers_create";
import { prepare_random_erp_hrm_organization_context } from "../../../prepare/prepare_random_erp_hrm_organization_context";
import { prepare_random_erp_hrm_timer } from "../../../prepare/prepare_random_erp_hrm_timer";

export async function test_api_timer_description_update_while_running(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register a new member
  const memberConnection: api.IConnection = { host: connection.host };
  const authorized = await authorize_member_join(memberConnection, {});
  // 2. Set organization context
  const memberWithContext: api.IConnection = { host: connection.host };
  memberWithContext.headers = { ...memberConnection.headers };
  await generate_random_erp_hrm_member_organization_context_select(
    memberWithContext,
    {},
  );
  // 3. Start a timer with initial description
  const initialDescription = RandomGenerator.paragraph({ sentences: 2 });
  const timer = await generate_random_erp_hrm_member_timers_create(
    memberWithContext,
    {
      body: {
        description: initialDescription,
      },
    },
  );
  typia.assert(timer);
  // Store original start timestamp for verification
  const originalStartedAt = timer.startedAt;
  // 4. Update the timer description while running
  const newDescription = RandomGenerator.paragraph({ sentences: 3 });
  const updatedTimer = await api.functional.erpHrm.member.timers.update(
    memberWithContext,
    {
      body: {
        description: newDescription,
      } satisfies IErpHrmTimer.IUpdate,
    },
  );
  typia.assert(updatedTimer);
  // 5. Validate the update
  // Verify description was updated
  TestValidator.equals(
    "updated description matches new value",
    updatedTimer.description,
    newDescription,
  );
  // Verify original start timestamp is preserved
  TestValidator.equals(
    "startedAt preserved after update",
    updatedTimer.startedAt,
    originalStartedAt,
  );
  // Verify same timer ID
  TestValidator.equals("same timer ID", updatedTimer.id, timer.id);
  // Verify same project
  TestValidator.equals(
    "same project after update",
    updatedTimer.project.id,
    timer.project.id,
  );
}
