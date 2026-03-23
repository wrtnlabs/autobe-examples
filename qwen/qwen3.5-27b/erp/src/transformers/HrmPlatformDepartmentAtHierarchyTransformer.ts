import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IHrmPlatformDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformDepartment";
import { IHrmPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformMember";
import { IHrmPlatformOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformOrganization";
import { IHrmPlatformOrganizationLogo } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformOrganizationLogo";
import { IHrmPlatformOrganizationSetting } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformOrganizationSetting";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import typia, { tags } from "typia";

import { toISOStringSafe } from "../utils/toISOStringSafe";
import { HrmPlatformDepartmentAtSummaryTransformer } from "./HrmPlatformDepartmentAtSummaryTransformer";
import { HrmPlatformOrganizationAtSummaryTransformer } from "./HrmPlatformOrganizationAtSummaryTransformer";

export namespace HrmPlatformDepartmentAtHierarchyTransformer {
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
        parent: true,
        organization: HrmPlatformOrganizationAtSummaryTransformer.select(),
        childDepartments: HrmPlatformDepartmentAtSummaryTransformer.select(),
      },
    } satisfies Prisma.hrm_platform_departmentsFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IHrmPlatformDepartment.IHierarchy> {
    // Filter out soft-deleted departments
    const activeDepartments = Array.isArray(input)
      ? input.filter((d) => d.deleted_at === null)
      : [];
    // Separate top-level departments (no parent) from child departments
    const topLevelDepartments = activeDepartments.filter(
      (d) => d.parent === null,
    );
    const childDepartments = activeDepartments.filter((d) => d.parent !== null);
    // Build hierarchical structure
    const departments = await ArrayUtil.asyncMap(
      topLevelDepartments,
      async (topLevel) => {
        // Find child departments for this top-level
        const children = childDepartments.filter(
          (child) => child.parent && child.parent.id === topLevel.id,
        );
        // Transform child departments
        const transformedChildren = await ArrayUtil.asyncMap(
          children,
          (child) => HrmPlatformDepartmentAtSummaryTransformer.transform(child),
        );
        // Transform organization
        const transformedOrganization =
          await HrmPlatformOrganizationAtSummaryTransformer.transform(
            topLevel.organization,
          );
        // Build top-level department object
        return {
          id: topLevel.id,
          name: topLevel.name,
          description: topLevel.description ?? null,
          created_at: topLevel.created_at.toISOString(),
          updated_at: topLevel.updated_at.toISOString(),
          childDepartments: transformedChildren,
          organization: transformedOrganization,
        } satisfies IHrmPlatformDepartment.ITopLevel;
      },
    );
    return {
      departments,
    };
  }
}
