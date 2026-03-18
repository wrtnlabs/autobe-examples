import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IHrmTimeTrackingEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingEmployee";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";

export namespace HrmTimeTrackingEmployeeCollector {
  export async function collect(props: {
    body: IHrmTimeTrackingEmployee.ICreate;
    organization: IEntity;
  }) {
    const id = v4();
    return {
      id,
      position_title: props.body.positionTitle ?? null,
      employment_type: props.body.employmentType,
      status: props.body.status ?? "active",
      created_at: new Date(),
      updated_at: new Date(),
      deleted_at: null,
      organization: {
        connect: {
          id: props.organization.id,
        },
      },
      userAccount: {
        connect: {
          id: props.body.userAccountId,
        },
      },
      role: {
        connect: {
          id: props.body.roleId,
        },
      },
      department: props.body.departmentId
        ? {
            connect: {
              id: props.body.departmentId,
            },
          }
        : undefined,
    } satisfies Prisma.hrm_time_tracking_employeesCreateInput;
  }
}
