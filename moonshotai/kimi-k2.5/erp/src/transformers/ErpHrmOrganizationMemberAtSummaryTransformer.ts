import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IErpHrmDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmDepartment";
import { IErpHrmMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmMember";
import { IErpHrmOrganizationMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmOrganizationMember";
import { IErpHrmRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmRole";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import typia, { tags } from "typia";

import { toISOStringSafe } from "../utils/toISOStringSafe";
import { ErpHrmDepartmentAtSummaryTransformer } from "./ErpHrmDepartmentAtSummaryTransformer";
import { ErpHrmMemberAtSummaryTransformer } from "./ErpHrmMemberAtSummaryTransformer";
import { ErpHrmRoleAtSummaryTransformer } from "./ErpHrmRoleAtSummaryTransformer";

export namespace ErpHrmOrganizationMemberAtSummaryTransformer {
  export type Payload = Prisma.erp_hrm_organization_membersGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        position: true,
        employment_type: true,
        is_active: true,
        user: ErpHrmMemberAtSummaryTransformer.select(),
        role: ErpHrmRoleAtSummaryTransformer.select(),
        department: ErpHrmDepartmentAtSummaryTransformer.select(),
        created_at: true,
        updated_at: true,
      },
    } satisfies Prisma.erp_hrm_organization_membersFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IErpHrmOrganizationMember.ISummary> {
    return {
      id: input.id,
      position: input.position ?? null,
      employment_type: input.employment_type,
      is_active: input.is_active,
      user: await ErpHrmMemberAtSummaryTransformer.transform(input.user),
      role: await ErpHrmRoleAtSummaryTransformer.transform(input.role),
      department: input.department
        ? await ErpHrmDepartmentAtSummaryTransformer.transform(input.department)
        : null,
      created_at: input.created_at.toISOString(),
      updated_at: input.updated_at.toISOString(),
    };
  }
}
