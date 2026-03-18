import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IHrmTimeTrackingOwnerPasswordReset } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingOwnerPasswordReset";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator } from "@nestia/e2e";
import { randint } from "tstl";
import typia, { tags } from "typia";

export function prepare_random_hrm_time_tracking_owner_password_reset(
  input?: DeepPartial<IHrmTimeTrackingOwnerPasswordReset.ICreate>,
): IHrmTimeTrackingOwnerPasswordReset.ICreate {
  return {
    actor:
      input?.actor ??
      RandomGenerator.pick(["owner", "manager", "employee"] as const),
    email: input?.email ?? typia.random<string & tags.Format<"email">>(),
  };
}
