import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IErpHrmEmployeeContract } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmEmployeeContract";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";

export namespace ErpHrmEmployeeContractCollector {
  export async function collect(props: {
    body: IErpHrmEmployeeContract.ICreate;
    erpHrmOrganizationMembers: IEntity; // from path parameter organizationMemberId
    erpHrmMembers: IEntity; // from authorized actor
    erpHrmMemberSessions: IEntity; // from authorized session
  }) {
    return {
      id: v4(),
      pay_rate: props.body.payRate,
      pay_period: props.body.payPeriod,
      working_hours_per_week: props.body.workingHoursPerWeek,
      start_date: new Date(props.body.startDate),
      end_date: props.body.endDate ? new Date(props.body.endDate) : null,
      is_active: true,
      notes: props.body.notes ?? null,
      created_at: new Date(),
      updated_at: new Date(),
      organizationMember: {
        connect: { id: props.erpHrmOrganizationMembers.id },
      },
    } satisfies Prisma.erp_hrm_employee_contractsCreateInput;
  }
}
