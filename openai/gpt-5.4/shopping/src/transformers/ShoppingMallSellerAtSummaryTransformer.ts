import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import typia, { tags } from "typia";

import { toISOStringSafe } from "../utils/toISOStringSafe";

export namespace ShoppingMallSellerAtSummaryTransformer {
  export async function transform(
    input: Payload,
  ): Promise<IShoppingMallSeller.ISummary> {
    return {
      id: input.id,
      email: input.email,
      approval_status: input.approval_status,
      rejection_reason: input.rejection_reason ?? null,
      suspended: input.suspended,
      banned: input.banned,
      created_at: input.created_at.toISOString(),
      updated_at: input.updated_at.toISOString(),
      deleted_at: input.deleted_at?.toISOString() ?? null,
    };
  }
  export function select() {
    return {
      select: {
        id: true,
        email: true,
        approval_status: true,
        rejection_reason: true,
        suspended: true,
        banned: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
      },
    } satisfies Prisma.shopping_mall_sellersFindManyArgs;
  }
  export type Payload = Prisma.shopping_mall_sellersGetPayload<
    ReturnType<typeof select>
  >;
}
