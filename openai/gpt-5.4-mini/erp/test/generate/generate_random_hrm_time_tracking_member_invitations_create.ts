import api from "@ORGANIZATION/PROJECT-api";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IHrmTimeTrackingInvitation } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingInvitation";
import type { IHrmTimeTrackingMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingMember";
import type { IHrmTimeTrackingOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingOrganization";
import type { IHrmTimeTrackingUserAccount } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingUserAccount";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { prepare_random_hrm_time_tracking_invitation } from "../prepare/prepare_random_hrm_time_tracking_invitation";

export async function generate_random_hrm_time_tracking_member_invitations_create(
  connection: api.IConnection,
  props: {
    body?: DeepPartial<IHrmTimeTrackingInvitation.ICreate> | undefined;
  },
): Promise<IHrmTimeTrackingInvitation> {
  const prepared: IHrmTimeTrackingInvitation.ICreate =
    prepare_random_hrm_time_tracking_invitation(props.body);
  return await api.functional.hrmTimeTracking.member.invitations.create(
    connection,
    {
      body: prepared,
    },
  );
}
