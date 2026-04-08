import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IHrmPlatformEmployeeInvitation } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformEmployeeInvitation";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";

export namespace HrmPlatformEmployeeInvitationCollector {
  export async function collect(props: {
    body: IHrmPlatformEmployeeInvitation.ICreate;
    hrmPlatformOrganizations: IEntity;
    hrmPlatformMembers: IEntity;
  }) {
    return {
      id: v4(),
      email: props.body.email,
      position: props.body.position ?? null,
      employment_type: props.body.employment_type,
      status: "pending",
      invited_at: new Date(),
      expires_at: new Date(props.body.expires_at),
      accepted_at: null,
      created_at: new Date(),
      updated_at: new Date(),
      deleted_at: null,
      organization: { connect: { id: props.hrmPlatformOrganizations.id } },
      invitedBy: { connect: { id: props.hrmPlatformMembers.id } },
      role: { connect: { id: props.body.role_id } },
      department: props.body.department_id
        ? { connect: { id: props.body.department_id } }
        : undefined,
    } satisfies Prisma.hrm_platform_employee_invitationsCreateInput;
  }
}
