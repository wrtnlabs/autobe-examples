import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IHrmPlatformPermission } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformPermission";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import typia, { tags } from "typia";

import { toISOStringSafe } from "../utils/toISOStringSafe";

export namespace HrmPlatformPermissionAtSummaryTransformer {
  export type Payload = Prisma.hrm_platform_permissionsGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        code: true,
        name: true,
        category: true,
        description: true,
      },
    } satisfies Prisma.hrm_platform_permissionsFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IHrmPlatformPermission.ISummary> {
    return {
      id: input.id,
      code: input.code,
      name: input.name,
      category: input.category ?? undefined,
      description: input.description ?? undefined,
    };
  }
}
