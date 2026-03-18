import api from "@ORGANIZATION/PROJECT-api";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IHrmTimeTrackingOwnerPasswordReset } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingOwnerPasswordReset";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { prepare_random_hrm_time_tracking_owner_password_reset } from "../prepare/prepare_random_hrm_time_tracking_owner_password_reset";

export async function generate_random_hrm_time_tracking_owner_password_resets_create(
  connection: api.IConnection,
  props: {
    body?: DeepPartial<IHrmTimeTrackingOwnerPasswordReset.ICreate> | undefined;
  },
): Promise<IHrmTimeTrackingOwnerPasswordReset> {
  const prepared: IHrmTimeTrackingOwnerPasswordReset.ICreate =
    prepare_random_hrm_time_tracking_owner_password_reset(props.body);
  const result: IHrmTimeTrackingOwnerPasswordReset =
    await api.functional.hrmTimeTracking.owner.password_resets.create(
      connection,
      {
        body: prepared,
      },
    );
  return result;
}
