import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IHrmPlatformDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformDepartment";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import typia, { tags } from "typia";

import { toISOStringSafe } from "../utils/toISOStringSafe";

export namespace HrmPlatformDepartmentAtSummaryTransformer {
  export function select() {
    return {
      select: {
        id: true,
        name: true,
        description: true,
        parent: {
          select: {
            id: true,
            name: true,
            description: true,
            parent: {
              select: {
                id: true,
                name: true,
                description: true,
              },
            },
          },
        },
      },
    } satisfies Prisma.hrm_platform_departmentsFindManyArgs;
  }
  export type Payload = Prisma.hrm_platform_departmentsGetPayload<
    ReturnType<typeof select>
  >;
  export async function transform(
    input: Payload,
  ): Promise<IHrmPlatformDepartment.ISummary> {
    return {
      id: input.id,
      name: input.name,
      description: input.description ?? null,
      parent: input.parent
        ? await HrmPlatformDepartmentAtSummaryTransformer.transform(
            input.parent as Payload,
          )
        : null,
    };
  }
}
