import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IErpHrmDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmDepartment";
import { IErpHrmMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmMember";
import { IErpHrmOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmOrganization";
import { IErpHrmOrganizationMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmOrganizationMember";
import { IErpHrmRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmRole";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import typia, { tags } from "typia";

import { toISOStringSafe } from "../utils/toISOStringSafe";
import { ErpHrmDepartmentTransformer } from "./ErpHrmDepartmentTransformer";
import { ErpHrmMemberTransformer } from "./ErpHrmMemberTransformer";
import { ErpHrmOrganizationTransformer } from "./ErpHrmOrganizationTransformer";
import { ErpHrmRoleTransformer } from "./ErpHrmRoleTransformer";

export namespace ErpHrmOrganizationMemberTransformer {
  export type Payload = Prisma.erp_hrm_organization_membersGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        organization: ErpHrmOrganizationTransformer.select(),
        user: ErpHrmMemberTransformer.select(),
        role: ErpHrmRoleTransformer.select(),
        department: ErpHrmDepartmentTransformer.select(),
        position: true,
        employment_type: true,
        is_active: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
      },
    } satisfies Prisma.erp_hrm_organization_membersFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IErpHrmOrganizationMember> {
    return {
      id: input.id,
      organizationId: input.organization.id,
      userId: input.user.id,
      roleId: input.role.id,
      departmentId: input.department?.id ?? undefined,
      position: input.position ?? undefined,
      employmentType: input.employment_type,
      isActive: input.is_active,
      createdAt: input.created_at.toISOString(),
      updatedAt: input.updated_at.toISOString(),
      deletedAt: input.deleted_at?.toISOString() ?? null,
      user: await ErpHrmMemberTransformer.transform(input.user),
      role: await ErpHrmRoleTransformer.transform(input.role),
      department: input.department
        ? await ErpHrmDepartmentTransformer.transform(input.department)
        : null,
      organization: await ErpHrmOrganizationTransformer.transform(
        input.organization,
      ),
    };
  }
}
