import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IHrmsEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmsEmployee";
import { IHrmsEmployeeContract } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmsEmployeeContract";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import { VariadicSingleton } from "tstl";
import typia, { tags } from "typia";

import { MyGlobal } from "../MyGlobal";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export namespace HrmsEmployeeContractTransformer {
  export type Payload = Prisma.hrms_employee_contractsGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        employee: {
          select: {
            id: true,
            display_name: true,
            position: true,
            department_id: true,
            status: true,
          },
        } satisfies Prisma.hrms_employeesFindManyArgs,
        start_date: true,
        end_date: true,
        pay_rate: true,
        pay_period: true,
        working_hours_per_week: true,
        notes: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
      },
    } satisfies Prisma.hrms_employee_contractsFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IHrmsEmployeeContract> {
    return {
      id: input.id,
      hrmsEmployeeId: input.employee.id,
      employee: {
        id: input.employee.id,
        display_name: input.employee.display_name,
        position: input.employee.position ?? undefined,
        department_id: typia.assert<string & tags.Format<"uuid">>(
          input.employee.department_id!,
        ),
        status: input.employee.status,
        total_hours_logged: 0,
        timelog_count: 0,
        timesheets_submitted: 0,
        timesheets_approved: 0,
        timesheets_pending: 0,
      },
      startDate: toISOStringSafe(input.start_date),
      endDate: input.end_date != null ? toISOStringSafe(input.end_date) : null,
      payRate: input.pay_rate,
      payPeriod: input.pay_period,
      workingHoursPerWeek: input.working_hours_per_week,
      notes: input.notes ?? null,
      createdAt: toISOStringSafe(input.created_at),
      updatedAt: toISOStringSafe(input.updated_at),
      deletedAt:
        input.deleted_at != null ? toISOStringSafe(input.deleted_at) : null,
    };
  }
}
