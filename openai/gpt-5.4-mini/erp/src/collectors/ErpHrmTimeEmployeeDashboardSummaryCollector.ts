import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IErpHrmTimeEmployeeDashboardSummary } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeEmployeeDashboardSummary";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";

export namespace ErpHrmTimeEmployeeDashboardSummaryCollector {
  export async function collect(props: {
    body: IErpHrmTimeEmployeeDashboardSummary.ICreate;
    organization: IEntity;
  }) {
    const id: string = v4();
    const now = new Date();
    return {
      id,
      position_title: props.body.position_title ?? null,
      employment_type: props.body.employment_type,
      status: "active",
      created_at: now,
      updated_at: now,
      deleted_at: null,
      organization: {
        connect: {
          id: props.organization.id,
        },
      },
      member: {
        connect: {
          id: props.body.member_id,
        },
      },
      role: {
        connect: {
          id: props.body.role_id,
        },
      },
      department: props.body.department_id
        ? {
            connect: {
              id: props.body.department_id,
            },
          }
        : undefined,
    } satisfies Prisma.erp_hrm_time_employeesCreateInput;
  }
}
