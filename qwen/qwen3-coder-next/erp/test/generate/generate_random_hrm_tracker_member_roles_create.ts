import api from "@ORGANIZATION/PROJECT-api";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IHrmTrackerOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTrackerOrganization";
import type { IHrmTrackerRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTrackerRole";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { prepare_random_hrm_tracker_role } from "../prepare/prepare_random_hrm_tracker_role";

export async function generate_random_hrm_tracker_member_roles_create(
  connection: api.IConnection,
  props: {
    body?: DeepPartial<IHrmTrackerRole.ICreate> | undefined;
  },
): Promise<IHrmTrackerRole> {
  const prepared: IHrmTrackerRole.ICreate = prepare_random_hrm_tracker_role(
    props.body,
  );
  const result: IHrmTrackerRole =
    await api.functional.hrmTracker.member.roles.create(connection, {
      body: prepared,
    });
  return result;
}
