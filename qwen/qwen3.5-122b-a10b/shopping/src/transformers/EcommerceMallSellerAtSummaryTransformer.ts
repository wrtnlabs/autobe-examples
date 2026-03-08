import { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import typia, { tags } from "typia";

import { toISOStringSafe } from "../utils/toISOStringSafe";

export namespace EcommerceMallSellerAtSummaryTransformer {
  export type Payload = Prisma.ecommerce_mall_sellersGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        email: true,
        shop_name: true,
        shop_description: true,
        approval_status: true,
        rejection_reason: true,
        account_status: true,
        created_at: true,
      },
    } satisfies Prisma.ecommerce_mall_sellersFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IEcommerceMallSeller.ISummary> {
    return {
      id: input.id,
      email: input.email,
      shop_name: input.shop_name,
      shop_description: input.shop_description ?? null,
      approval_status: typia.assert<"pending" | "approved" | "rejected">(
        input.approval_status,
      ),
      rejection_reason: input.rejection_reason ?? null,
      account_status: typia.assert<"active" | "suspended" | "banned">(
        input.account_status,
      ),
      created_at: toISOStringSafe(input.created_at),
    };
  }
}
