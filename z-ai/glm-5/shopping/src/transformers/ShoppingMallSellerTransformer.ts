import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import typia, { tags } from "typia";

import { toISOStringSafe } from "../utils/toISOStringSafe";

export namespace ShoppingMallSellerTransformer {
  export type Payload = Prisma.shopping_mall_sellersGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        email: true,
        shop_name: true,
        shop_description: true,
        logo_image: true,
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
  export async function transform(
    input: Payload,
  ): Promise<IShoppingMallSeller> {
    return {
      id: input.id,
      email: input.email,
      shop_name: input.shop_name,
      shop_description: input.shop_description ?? null,
      logo_image: input.logo_image ?? null,
      approval_status: input.approval_status as
        | "pending"
        | "approved"
        | "rejected",
      rejection_reason: input.rejection_reason ?? null,
      suspended: input.suspended,
      banned: input.banned,
      created_at: input.created_at.toISOString(),
      updated_at: input.updated_at.toISOString(),
      deleted_at: input.deleted_at?.toISOString() ?? null,
    };
  }
}
