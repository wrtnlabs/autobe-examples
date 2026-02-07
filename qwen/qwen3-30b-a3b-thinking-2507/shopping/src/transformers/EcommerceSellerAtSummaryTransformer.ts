import { IEcommerceSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceSeller";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import typia, { tags } from "typia";

import { toISOStringSafe } from "../utils/toISOStringSafe";

export namespace EcommerceSellerAtSummaryTransformer {
  export type Payload = Prisma.ecommerce_sellersGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        email: true,
        approval_status: true,
        updated_at: true,
        ecommerce_seller_profiles: {
          select: {
            shop_name: true,
          },
        },
      },
    } satisfies Prisma.ecommerce_sellersFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IEcommerceSeller.ISummary> {
    return {
      id: input.id,
      email: input.email,
      shopName: input.ecommerce_seller_profiles[0]?.shop_name,
      status: input.approval_status as "pending" | "approved" | "rejected",
      lastUpdate: input.updated_at.toISOString(),
    };
  }
}
