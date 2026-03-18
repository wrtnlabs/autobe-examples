import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IErpHrmDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmDepartment";
import { IErpHrmOrganizationMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmOrganizationMember";
import { IErpHrmRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmRole";
import { IErpHrmRolePermission } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmRolePermission";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import typia, { tags } from "typia";

import { toISOStringSafe } from "../utils/toISOStringSafe";
import { ErpHrmDepartmentAtSummaryTransformer } from "./ErpHrmDepartmentAtSummaryTransformer";
import { ErpHrmRoleAtSummaryTransformer } from "./ErpHrmRoleAtSummaryTransformer";

export namespace ErpHrmOrganizationMemberTransformer {
  export type Payload = Prisma.erp_hrm_organization_membersGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        organization_id: true,
        employment_type: true,
        status: true,
        position: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
        member: {
          select: {
            email: true,
          },
        },
        role: ErpHrmRoleAtSummaryTransformer.select(),
        department: ErpHrmDepartmentAtSummaryTransformer.select(),
      },
    } satisfies Prisma.erp_hrm_organization_membersFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IErpHrmOrganizationMember> {
    return {
      id: input.id,
      organization_id: input.organization_id,
      email: input.member.email,
      employment_type: input.employment_type,
      status: input.status,
      position: input.position,
      role: await ErpHrmRoleAtSummaryTransformer.transform(input.role),
      department: input.department
        ? await ErpHrmDepartmentAtSummaryTransformer.transform(input.department)
        : null,
      created_at: input.created_at.toISOString(),
      updated_at: input.updated_at.toISOString(),
      deleted_at: input.deleted_at?.toISOString() ?? null,
    };
  }
}
