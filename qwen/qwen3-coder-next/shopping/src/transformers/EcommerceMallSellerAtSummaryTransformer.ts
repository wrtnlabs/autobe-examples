import { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import typia, { tags } from "typia";

import { toISOStringSafe } from "../utils/toISOStringSafe";

export namespace EcommerceMallSellerAtSummaryTransformer {
  // 1. Payload type first
  export type Payload = Prisma.ecommerce_mall_sellersGetPayload<
    ReturnType<typeof select>
  >;
  // 2. select() function second
  export function select() {
    return {
      select: {
        id: true,
        shop_name: true,
        approval_status: true,
        is_suspended: true,
        created_at: true,
      },
    } satisfies Prisma.ecommerce_mall_sellersFindManyArgs;
  }
  // 3. transform() function last
  export async function transform(
    input: Payload,
  ): Promise<IEcommerceMallSeller.ISummary> {
    return {
      id: input.id,
      shop_name: input.shop_name,
      approval_status: input.approval_status,
      is_suspended: input.is_suspended,
      created_at: input.created_at.toISOString(),
    };
  }
}
