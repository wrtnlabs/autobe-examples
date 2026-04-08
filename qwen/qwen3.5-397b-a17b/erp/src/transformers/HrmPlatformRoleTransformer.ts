import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IHrmPlatformOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformOrganization";
import { IHrmPlatformRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformRole";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import { VariadicSingleton } from "tstl";
import typia, { tags } from "typia";

import { MyGlobal } from "../MyGlobal";
import { toISOStringSafe } from "../utils/toISOStringSafe";
import { HrmPlatformOrganizationAtSummaryTransformer } from "./HrmPlatformOrganizationAtSummaryTransformer";

export namespace HrmPlatformRoleTransformer {
  export type Payload = Prisma.hrm_platform_rolesGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        name: true,
        is_built_in: true,
        description: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
        organization: HrmPlatformOrganizationAtSummaryTransformer.select(),
        rolePermissions: {
          select: {},
        } satisfies Prisma.hrm_platform_role_permissionsFindManyArgs,
        employees: {
          select: {},
        } satisfies Prisma.hrm_platform_employeesFindManyArgs,
        employeeInvitations: {
          select: {},
        } satisfies Prisma.hrm_platform_employee_invitationsFindManyArgs,
      },
    } satisfies Prisma.hrm_platform_rolesFindManyArgs;
  }
  export async function transform(input: Payload): Promise<IHrmPlatformRole> {
    return {
      id: input.id,
      organization: await HrmPlatformOrganizationAtSummaryTransformer.transform(
        input.organization,
      ),
      name: input.name,
      isBuiltIn: input.is_built_in,
      description: input.description ?? undefined,
      createdAt: input.created_at.toISOString(),
      updatedAt: input.updated_at.toISOString(),
    } satisfies IHrmPlatformRole;
  }
}
