import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IHrmTimeTrackingOrganizationInvitation } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingOrganizationInvitation";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator } from "@nestia/e2e";
import { randint } from "tstl";
import typia, { tags } from "typia";

export function prepare_random_hrm_time_tracking_organization_invitation(
  input?:
    | DeepPartial<IHrmTimeTrackingOrganizationInvitation.ICreate>
    | undefined,
): IHrmTimeTrackingOrganizationInvitation.ICreate {
  return {
    email: input?.email ?? typia.random<string & tags.Format<"email">>(),
    hrm_time_tracking_role_id:
      input?.hrm_time_tracking_role_id !== undefined
        ? input.hrm_time_tracking_role_id
        : null,
    message:
      input?.message !== undefined
        ? input.message
        : RandomGenerator.paragraph({ sentences: 2 }),
  };
}
