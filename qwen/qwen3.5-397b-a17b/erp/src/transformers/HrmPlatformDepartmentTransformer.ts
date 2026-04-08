import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IHrmPlatformDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformDepartment";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import { VariadicSingleton } from "tstl";
import typia, { tags } from "typia";

import { MyGlobal } from "../MyGlobal";
import { toISOStringSafe } from "../utils/toISOStringSafe";
import { HrmPlatformDepartmentAtSummaryTransformer } from "./HrmPlatformDepartmentAtSummaryTransformer";

export namespace HrmPlatformDepartmentTransformer {
  export type Payload = Prisma.hrm_platform_departmentsGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        name: true,
        description: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
        organization: {
          select: {
            id: true,
          },
        },
        parentDepartment: HrmPlatformDepartmentAtSummaryTransformer.select(),
        childDepartments: {
          select: {
            id: true,
          },
        } satisfies Prisma.hrm_platform_departmentsFindManyArgs,
        employees: {
          select: {
            id: true,
          },
        } satisfies Prisma.hrm_platform_employeesFindManyArgs,
        employeeInvitations: {
          select: {
            id: true,
          },
        } satisfies Prisma.hrm_platform_employee_invitationsFindManyArgs,
      },
    } satisfies Prisma.hrm_platform_departmentsFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IHrmPlatformDepartment> {
    return {
      id: input.id,
      name: input.name,
      description: input.description ?? null,
      parentDepartment: input.parentDepartment
        ? await HrmPlatformDepartmentAtSummaryTransformer.transform(
            input.parentDepartment,
          )
        : null,
      createdAt: input.created_at.toISOString(),
      updatedAt: input.updated_at.toISOString(),
      deletedAt: input.deleted_at?.toISOString() ?? null,
    } satisfies IHrmPlatformDepartment;
  }
}
