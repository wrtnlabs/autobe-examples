import { IEcommerceMallAdminRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdminRole";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import typia, { tags } from "typia";

import { toISOStringSafe } from "../utils/toISOStringSafe";

export namespace EcommerceMallAdminRoleAtSummaryTransformer {
  export type Payload = Prisma.ecommerce_mall_admin_rolesGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        admin: {
          select: {},
        } satisfies Prisma.ecommerce_mall_adminsFindManyArgs,
        adminRequests: {
          select: {},
        } satisfies Prisma.ecommerce_mall_admin_requestsFindManyArgs,
        grade: true,
        created_at: true,
        updated_at: true,
      },
    } satisfies Prisma.ecommerce_mall_admin_rolesFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IEcommerceMallAdminRole.ISummary> {
    return {
      grade: typia.assert<"regular" | "super">(input.grade),
      created_at: toISOStringSafe(input.created_at),
      updated_at: toISOStringSafe(input.updated_at),
    };
  }
}
