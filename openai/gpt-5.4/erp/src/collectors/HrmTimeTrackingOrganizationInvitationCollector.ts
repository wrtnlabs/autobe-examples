import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IHrmTimeTrackingOrganizationInvitation } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingOrganizationInvitation";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";

export namespace HrmTimeTrackingOrganizationInvitationCollector {
  export async function collect(props: {
    body: IHrmTimeTrackingOrganizationInvitation.ICreate;
    organization: IEntity;
  }) {
    const id: string = v4();
    const now: Date = new Date();
    return {
      id,
      email: props.body.email,
      status: "pending",
      message: props.body.message ?? null,
      invited_at: now,
      accepted_at: null,
      resolved_at: null,
      expired_at: null,
      cancelled_at: null,
      created_at: now,
      updated_at: now,
      deleted_at: null,
      organization: {
        connect: {
          id: props.organization.id,
        },
      },
      role:
        props.body.hrm_time_tracking_role_id != null
          ? {
              connect: {
                id: props.body.hrm_time_tracking_role_id,
              },
            }
          : undefined,
    } satisfies Prisma.hrm_time_tracking_organization_invitationsCreateInput;
  }
}
