import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IErpHrmDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmDepartment";
import { IErpHrmEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmEmployee";
import { IErpHrmMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmMember";
import { IErpHrmRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmRole";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import typia, { tags } from "typia";

import { toISOStringSafe } from "../utils/toISOStringSafe";
import { ErpHrmDepartmentAtSummaryTransformer } from "./ErpHrmDepartmentAtSummaryTransformer";
import { ErpHrmMemberAtSummaryTransformer } from "./ErpHrmMemberAtSummaryTransformer";
import { ErpHrmRoleAtSummaryTransformer } from "./ErpHrmRoleAtSummaryTransformer";

export namespace ErpHrmEmployeeAtSummaryTransformer {
  export type Payload = Prisma.erp_hrm_employeesGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        position: true,
        employment_type: true,
        status: true,
        created_at: true,
        member: ErpHrmMemberAtSummaryTransformer.select(),
        role: ErpHrmRoleAtSummaryTransformer.select(),
        department: ErpHrmDepartmentAtSummaryTransformer.select(),
      },
    } satisfies Prisma.erp_hrm_employeesFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IErpHrmEmployee.ISummary> {
    return {
      id: input.id,
      member: await ErpHrmMemberAtSummaryTransformer.transform(input.member),
      role: await ErpHrmRoleAtSummaryTransformer.transform(input.role),
      department: input.department
        ? await ErpHrmDepartmentAtSummaryTransformer.transform(input.department)
        : null,
      position: input.position,
      employment_type: input.employment_type,
      status: input.status,
      created_at: input.created_at.toISOString(),
    };
  }
}
