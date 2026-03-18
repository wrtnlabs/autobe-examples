import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IHrmPlatformDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformDepartment";
import { IHrmPlatformEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformEmployee";
import { IHrmPlatformOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformOrganization";
import { IHrmPlatformRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformRole";
import { IHrmPlatformRolePermission } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformRolePermission";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import typia, { tags } from "typia";

import { toISOStringSafe } from "../utils/toISOStringSafe";
import { HrmPlatformEmployeeAtSummaryTransformer } from "./HrmPlatformEmployeeAtSummaryTransformer";
import { HrmPlatformOrganizationAtSummaryTransformer } from "./HrmPlatformOrganizationAtSummaryTransformer";
import { HrmPlatformRolePermissionTransformer } from "./HrmPlatformRolePermissionTransformer";

export namespace HrmPlatformRoleTransformer {
  export type Payload = Prisma.hrm_platform_rolesGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        name: true,
        built_in: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
        organization: HrmPlatformOrganizationAtSummaryTransformer.select(),
        employees: HrmPlatformEmployeeAtSummaryTransformer.select(),
        permissions: HrmPlatformRolePermissionTransformer.select(),
      },
    } satisfies Prisma.hrm_platform_rolesFindManyArgs;
  }
  export async function transform(input: Payload): Promise<IHrmPlatformRole> {
    return {
      id: input.id,
      name: input.name,
      built_in: input.built_in,
      organization: await HrmPlatformOrganizationAtSummaryTransformer.transform(
        input.organization,
      ),
      permissions: await ArrayUtil.asyncMap(
        input.permissions,
        HrmPlatformRolePermissionTransformer.transform,
      ),
      employees: await ArrayUtil.asyncMap(
        input.employees,
        HrmPlatformEmployeeAtSummaryTransformer.transform,
      ),
      created_at: input.created_at.toISOString(),
      updated_at: input.updated_at.toISOString(),
      deleted_at: input.deleted_at?.toISOString() ?? null,
    };
  }
}
