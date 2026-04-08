import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IHrmTimeTrackDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackDepartment";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";

export namespace HrmTimeTrackDepartmentCollector {
  export async function collect(props: {
    body: IHrmTimeTrackDepartment.ICreate;
    hrmTimeTrackOrganizations: IEntity;
  }) {
    const id: string = v4();
    return {
      id,
      name: props.body.name,
      description: props.body.description ?? null,
      created_at: new Date(),
      updated_at: new Date(),
      deleted_at: null,
      organization: { connect: { id: props.hrmTimeTrackOrganizations.id } },
      parentDepartment: props.body.parent_department_id
        ? { connect: { id: props.body.parent_department_id } }
        : undefined,
    } satisfies Prisma.hrm_time_track_departmentsCreateInput;
  }
}
