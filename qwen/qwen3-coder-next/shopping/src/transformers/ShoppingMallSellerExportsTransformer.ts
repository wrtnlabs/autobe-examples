import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallSellerExports } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerExports";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import typia, { tags } from "typia";

import { toISOStringSafe } from "../utils/toISOStringSafe";

export namespace ShoppingMallSellerExportsTransformer {
  export type Payload = Prisma.shopping_mall_seller_exportsGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        format: true,
        scope: true,
        status: true,
        file_url: true,
        error_message: true,
        requested_at: true,
        started_at: true,
        completed_at: true,
        failed_at: true,
        seller: { select: { id: true } },
        processor: { select: { id: true } },
      },
    } satisfies Prisma.shopping_mall_seller_exportsFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IShoppingMallSellerExports> {
    return {
      id: input.id,
      format: input.format,
      scope: input.scope,
      status: input.status,
      fileUrl: input.file_url ?? undefined,
      errorMessage: input.error_message ?? undefined,
      requestedAt: input.requested_at.toISOString(),
      startedAt: input.started_at?.toISOString() ?? undefined,
      completedAt: input.completed_at?.toISOString() ?? undefined,
      failedAt: input.failed_at?.toISOString() ?? undefined,
      shoppingMallSellerId: input.seller.id,
      shoppingMallAdminId: input.processor?.id ?? undefined,
    };
  }
}
