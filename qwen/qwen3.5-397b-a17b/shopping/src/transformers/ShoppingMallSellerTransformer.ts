import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import typia, { tags } from "typia";

import { toISOStringSafe } from "../utils/toISOStringSafe";
import { ShoppingMallAdminAtSummaryTransformer } from "./ShoppingMallAdminAtSummaryTransformer";

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
        logo_image_url: true,
        approval_status: true,
        rejection_reason: true,
        suspended: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
        approvedByAdmin: ShoppingMallAdminAtSummaryTransformer.select(),
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
      shop_description: input.shop_description ?? undefined,
      logo_image_url: input.logo_image_url ?? undefined,
      approval_status: typia.assert<"PENDING" | "APPROVED" | "REJECTED">(
        input.approval_status,
      ),
      rejection_reason: input.rejection_reason ?? undefined,
      suspended: input.suspended,
      approvedByAdmin: input.approvedByAdmin
        ? await ShoppingMallAdminAtSummaryTransformer.transform(
            input.approvedByAdmin,
          )
        : null,
      created_at: toISOStringSafe(input.created_at),
      updated_at: toISOStringSafe(input.updated_at),
      deleted_at: input.deleted_at ? toISOStringSafe(input.deleted_at) : null,
    };
  }
}
