import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IHrmTrackerEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTrackerEmployee";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";

export namespace HrmTrackerEmployeeCollector {
  export async function collect(props: {
    body: IHrmTrackerEmployee.ICreate;
    organization: IEntity;
    user: IEntity;
  }) {
    const id: string = v4();
    return {
      id,
      status: props.body.status,
      employment_type: props.body.employment_type,
      position: props.body.position ?? null,
      created_at: new Date(),
      updated_at: new Date(),
      deleted_at: null,
      organization: { connect: { id: props.organization.id } },
      user: { connect: { id: props.user.id } },
      role: props.body.role_id
        ? { connect: { id: props.body.role_id } }
        : undefined,
      department: props.body.department_id
        ? { connect: { id: props.body.department_id } }
        : undefined,
      // Reverse relations: cannot create (hasMany)
      roleAssignments: undefined,
      roleChanges: undefined,
      histories: undefined,
      projectMembers: undefined,
      assignedTasks: undefined,
      taskHistories: undefined,
      timelogs: undefined,
      timesheets: undefined,
      contracts: undefined,
      activeTimers: undefined,
    } satisfies Prisma.hrm_tracker_employeesCreateInput;
  }
}
