import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IHrmTimeTrackingDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingDepartment";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";

export namespace HrmTimeTrackingDepartmentCollector {
  export async function collect(props: {
    body: IHrmTimeTrackingDepartment.ICreate;
    organization: IEntity;
  }) {
    return {
      id: v4(),
      name: props.body.name,
      description: props.body.description ?? null,
      created_at: new Date(),
      updated_at: new Date(),
      deleted_at: null,
      organization: {
        connect: { id: props.organization.id },
      },
      parent: props.body.parent_department_id
        ? {
            connect: { id: props.body.parent_department_id },
          }
        : undefined,
    } satisfies Prisma.hrm_time_tracking_departmentsCreateInput;
  }
}
