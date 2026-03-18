import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IErpHrmTimeTrackingDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeTrackingDepartment";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";

export namespace ErpHrmTimeTrackingDepartmentCollector {
  export async function collect(props: {
    body: IErpHrmTimeTrackingDepartment.ICreate;
    organization: IEntity;
  }) {
    const id: string = v4();
    return {
      id,
      name: props.body.name,
      description: props.body.description ?? null,
      created_at: new Date(),
      updated_at: new Date(),
      deleted_at: null,
      organization: {
        connect: { id: props.organization.id },
      },
      parentDepartment: props.body.parent_department_id
        ? { connect: { id: props.body.parent_department_id } }
        : undefined,
      childDepartments: undefined,
    } satisfies Prisma.erp_hrm_time_tracking_departmentsCreateInput;
  }
}
