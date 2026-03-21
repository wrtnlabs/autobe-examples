import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IErpHrmDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmDepartment";
import { IErpHrmEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmEmployee";
import { IErpHrmMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmMember";
import { IErpHrmOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmOrganization";
import { IErpHrmProjectMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmProjectMember";
import { IErpHrmRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmRole";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import typia, { tags } from "typia";

import { toISOStringSafe } from "../utils/toISOStringSafe";
import { ErpHrmEmployeeAtSummaryTransformer } from "./ErpHrmEmployeeAtSummaryTransformer";
import { ErpHrmProjectMemberAtSummaryTransformer } from "./ErpHrmProjectMemberAtSummaryTransformer";

export namespace ErpHrmProjectMemberAtInvertTransformer {
  export type Payload = Prisma.erp_hrm_project_membersGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        assigned_role: true,
        created_at: true,
        updated_at: true,
        employee: ErpHrmEmployeeAtSummaryTransformer.select(),
        project: ErpHrmProjectMemberAtSummaryTransformer.select(),
      },
    } satisfies Prisma.erp_hrm_project_membersFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IErpHrmProjectMember.IInvert> {
    return {
      id: input.id,
      assigned_role: input.assigned_role,
      created_at: input.created_at.toISOString(),
      updated_at: input.updated_at.toISOString(),
      employee: await ErpHrmEmployeeAtSummaryTransformer.transform(
        input.employee,
      ),
      project: await ErpHrmProjectMemberAtSummaryTransformer.transform(
        input.project,
      ),
    };
  }
}
