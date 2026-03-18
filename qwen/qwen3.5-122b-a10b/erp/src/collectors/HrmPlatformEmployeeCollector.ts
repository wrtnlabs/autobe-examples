import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IHrmPlatformEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformEmployee";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";

export namespace HrmPlatformEmployeeCollector {
  export async function collect(props: {
    body: IHrmPlatformEmployee.ICreate;
    hrmPlatformOrganizations: IEntity;
  }) {
    const id: string = v4();
    // Resolve user id - either from body directly or query by email
    let userId: string;
    if (props.body.hrm_platform_user_id) {
      userId = props.body.hrm_platform_user_id;
    } else if (props.body.email) {
      const member =
        await MyGlobal.prisma.hrm_platform_members.findFirstOrThrow({
          where: { email: props.body.email },
        });
      userId = member.id;
    } else {
      throw new Error("Either hrm_platform_user_id or email must be provided");
    }
    return {
      id,
      position: props.body.position ?? null,
      employment_type: props.body.employment_type,
      status: props.body.status,
      created_at: new Date(),
      updated_at: new Date(),
      deleted_at: null,
      user: { connect: { id: userId } },
      organization: { connect: { id: props.hrmPlatformOrganizations.id } },
      role: { connect: { id: props.body.hrm_platform_role_id } },
      department: props.body.hrm_platform_department_id
        ? { connect: { id: props.body.hrm_platform_department_id } }
        : undefined,
      contracts: undefined,
      snapshots: undefined,
      projectMemberships: undefined,
      assignedTasks: undefined,
      timelogs: undefined,
      timesheets: undefined,
      activeTimers: undefined,
    } satisfies Prisma.hrm_platform_employeesCreateInput;
  }
}
