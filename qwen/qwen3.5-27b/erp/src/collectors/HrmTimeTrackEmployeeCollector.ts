import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IHrmTimeTrackEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackEmployee";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";

export namespace HrmTimeTrackEmployeeCollector {
  export async function collect(props: {
    body: IHrmTimeTrackEmployee.ICreate;
    hrmTimeTrackOrganizations: IEntity;
  }) {
    const id: string = v4();
    return {
      // Scalar fields
      id,
      position: props.body.position,
      employment_type: props.body.employment_type,
      status: props.body.status ?? "active",
      hire_date: new Date(props.body.hire_date),
      termination_date: props.body.termination_date
        ? new Date(props.body.termination_date)
        : null,
      created_at: new Date(),
      updated_at: new Date(),
      deleted_at: null,
      // BelongsTo relations
      organization: { connect: { id: props.hrmTimeTrackOrganizations.id } },
      member: { connect: { id: props.body.hrm_time_track_member_id } },
      department: props.body.hrm_time_track_department_id
        ? { connect: { id: props.body.hrm_time_track_department_id } }
        : undefined,
      role: props.body.hrm_time_track_role_id
        ? { connect: { id: props.body.hrm_time_track_role_id } }
        : undefined,
      // HasMany relations - not needed (reverse relations)
    } satisfies Prisma.hrm_time_track_employeesCreateInput;
  }
}
