import api from "@ORGANIZATION/PROJECT-api";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IHrmTimeTrackingOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingOrganization";
import type { IHrmTimeTrackingOrganizationInvitation } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingOrganizationInvitation";
import type { IHrmTimeTrackingRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingRole";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { prepare_random_hrm_time_tracking_organization_invitation } from "../prepare/prepare_random_hrm_time_tracking_organization_invitation";

export async function generate_random_hrm_time_tracking_owner_organizations_invitations_create(
  connection: api.IConnection,
  props: {
    body?:
      | DeepPartial<IHrmTimeTrackingOrganizationInvitation.ICreate>
      | undefined;
    params: {
      organizationId: string;
    };
  },
): Promise<IHrmTimeTrackingOrganizationInvitation> {
  const prepared: IHrmTimeTrackingOrganizationInvitation.ICreate =
    prepare_random_hrm_time_tracking_organization_invitation(props.body);
  const result: IHrmTimeTrackingOrganizationInvitation =
    await api.functional.hrmTimeTracking.owner.organizations.invitations.create(
      connection,
      {
        body: prepared,
        organizationId: props.params.organizationId,
      },
    );
  return result;
}
