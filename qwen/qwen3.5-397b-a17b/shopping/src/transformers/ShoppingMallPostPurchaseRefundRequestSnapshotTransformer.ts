import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";
import { IShoppingMallCustomerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerProfile";
import { IShoppingMallMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallMember";
import { IShoppingMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrder";
import { IShoppingMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderItem";
import { IShoppingMallPostPurchaseRefundRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPostPurchaseRefundRequest";
import { IShoppingMallPostPurchaseRefundRequestSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPostPurchaseRefundRequestSnapshot";
import { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import { IShoppingMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariant";
import { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import { IShoppingMallShipment } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallShipment";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import { VariadicSingleton } from "tstl";
import typia, { tags } from "typia";

import { MyGlobal } from "../MyGlobal";
import { toISOStringSafe } from "../utils/toISOStringSafe";
import { ShoppingMallPostPurchaseRefundRequestAtSummaryTransformer } from "./ShoppingMallPostPurchaseRefundRequestAtSummaryTransformer";

export namespace ShoppingMallPostPurchaseRefundRequestSnapshotTransformer {
  export type Payload =
    Prisma.shopping_mall_post_purchase_refund_request_snapshotsGetPayload<
      ReturnType<typeof select>
    >;
  export function select() {
    return {
      select: {
        id: true,
        status: true,
        reason: true,
        seller_response: true,
        created_at: true,
        refundRequest:
          ShoppingMallPostPurchaseRefundRequestAtSummaryTransformer.select(),
      },
    };
  }
  export async function transform(
    input: Payload,
  ): Promise<IShoppingMallPostPurchaseRefundRequestSnapshot> {
    return {
      id: input.id,
      refundRequest:
        await ShoppingMallPostPurchaseRefundRequestAtSummaryTransformer.transform(
          input.refundRequest,
        ),
      status: input.status,
      reason: input.reason,
      sellerResponse: input.seller_response,
      created_at: toISOStringSafe(input.created_at),
    } satisfies IShoppingMallPostPurchaseRefundRequestSnapshot;
  }
}
