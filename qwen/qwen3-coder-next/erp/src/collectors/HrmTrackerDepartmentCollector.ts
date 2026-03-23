import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IHrmTrackerDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTrackerDepartment";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";

export namespace HrmTrackerDepartmentCollector {
  export async function collect(props: {
    body: IHrmTrackerDepartment.ICreate;
    session: IEntity;
  }) {
    const id: string = v4();
    return {
      id,
      name: props.body.name,
      description: props.body.description ?? null,
      created_at: new Date(),
      updated_at: new Date(),
      deleted_at: null,
      organization: { connect: { id: props.session.id } },
      parent: props.body.parent_id
        ? { connect: { id: props.body.parent_id } }
        : undefined,
      employees: undefined,
      children: undefined,
      employeeHistories: undefined,
    } satisfies Prisma.hrm_tracker_departmentsCreateInput;
  }
}
