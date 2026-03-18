import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IHrmPlatformDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformDepartment";
import { IHrmPlatformOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformOrganization";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import typia, { tags } from "typia";

import { toISOStringSafe } from "../utils/toISOStringSafe";
import { HrmPlatformDepartmentAtSummaryTransformer } from "./HrmPlatformDepartmentAtSummaryTransformer";
import { HrmPlatformOrganizationAtSummaryTransformer } from "./HrmPlatformOrganizationAtSummaryTransformer";

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
        organization: HrmPlatformOrganizationAtSummaryTransformer.select(),
        parent: HrmPlatformDepartmentAtSummaryTransformer.select(),
      },
    } satisfies Prisma.hrm_platform_departmentsFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IHrmPlatformDepartment> {
    return {
      id: input.id,
      name: input.name,
      description: input.description ?? undefined,
      parent: input.parent
        ? await HrmPlatformDepartmentAtSummaryTransformer.transform(
            input.parent,
          )
        : undefined,
      organization: await HrmPlatformOrganizationAtSummaryTransformer.transform(
        input.organization,
      ),
      created_at: input.created_at.toISOString(),
      updated_at: input.updated_at.toISOString(),
      deleted_at: input.deleted_at?.toISOString() ?? null,
    };
  }
}
