import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IErpHrmTimeDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeDepartment";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";

export namespace ErpHrmTimeDepartmentCollector {
  export async function collect(props: {
    body: IErpHrmTimeDepartment.ICreate;
    organization: IEntity;
  }) {
    const id: string = v4();
    const now: Date = new Date();
    return {
      id,
      name: props.body.name,
      description: props.body.description ?? null,
      created_at: now,
      updated_at: now,
      deleted_at: null,
      organization: {
        connect: {
          id: props.organization.id,
        },
      },
      parentDepartment: props.body.parentDepartmentId
        ? {
            connect: {
              id: props.body.parentDepartmentId,
            },
          }
        : undefined,
    } satisfies Prisma.erp_hrm_time_departmentsCreateInput;
  }
}
