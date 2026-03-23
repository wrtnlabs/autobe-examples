import { IEcommerceMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdmin";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import typia, { tags } from "typia";

import { toISOStringSafe } from "../utils/toISOStringSafe";

export namespace EcommerceMallAdminAtSummaryTransformer {
  // 1. Payload type first
  export type Payload = Prisma.ecommerce_mall_adminsGetPayload<
    ReturnType<typeof select>
  >;
  // 2. select() function second
  export function select() {
    return {
      select: {
        id: true,
        email: true,
        grade: true,
        created_at: true,
      },
    } satisfies Prisma.ecommerce_mall_adminsFindManyArgs;
  }
  // 3. transform() function last
  export async function transform(
    input: Payload,
  ): Promise<IEcommerceMallAdmin.ISummary> {
    return {
      id: input.id,
      email: input.email,
      grade: typia.assert<"regular" | "super">(input.grade),
      created_at: toISOStringSafe(input.created_at),
    };
  }
}
