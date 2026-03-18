import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IHrmPlatformRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformRole";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import typia, { tags } from "typia";

import { toISOStringSafe } from "../utils/toISOStringSafe";

export namespace HrmPlatformRoleAtSummaryTransformer {
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
        organization: true,
        employees: true,
        permissions: true,
      },
    } satisfies Prisma.hrm_platform_rolesFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IHrmPlatformRole.ISummary> {
    return {
      id: input.id,
      name: input.name,
      built_in: input.built_in,
      created_at: input.created_at.toISOString(),
    };
  }
}
