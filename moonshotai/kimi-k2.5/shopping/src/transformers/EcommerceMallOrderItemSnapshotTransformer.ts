import { IEcommerceMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCategory";
import { IEcommerceMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrderItem";
import { IEcommerceMallOrderItemProductSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrderItemProductSnapshot";
import { IEcommerceMallOrderItemSellerSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrderItemSellerSnapshot";
import { IEcommerceMallOrderItemSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrderItemSnapshot";
import { IEcommerceMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProduct";
import { IEcommerceMallProductSnapshotImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductSnapshotImage";
import { IEcommerceMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductVariant";
import { IEcommerceMallProductVariantOption } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductVariantOption";
import { IEcommerceMallProductVariantSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductVariantSnapshot";
import { IEcommerceMallProductVariantSnapshotOptionValue } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductVariantSnapshotOptionValue";
import { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import { VariadicSingleton } from "tstl";
import typia, { tags } from "typia";

import { MyGlobal } from "../MyGlobal";
import { toISOStringSafe } from "../utils/toISOStringSafe";
import { EcommerceMallOrderItemAtSummaryTransformer } from "./EcommerceMallOrderItemAtSummaryTransformer";
import { EcommerceMallOrderItemProductSnapshotTransformer } from "./EcommerceMallOrderItemProductSnapshotTransformer";
import { EcommerceMallOrderItemSellerSnapshotTransformer } from "./EcommerceMallOrderItemSellerSnapshotTransformer";
import { EcommerceMallProductVariantSnapshotAtInvertTransformer } from "./EcommerceMallProductVariantSnapshotAtInvertTransformer";

export namespace EcommerceMallOrderItemSnapshotTransformer {
  export type Payload = Prisma.ecommerce_mall_order_item_snapshotsGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        created_at: true,
        orderItem: EcommerceMallOrderItemAtSummaryTransformer.select(),
        productSnapshot:
          EcommerceMallOrderItemProductSnapshotTransformer.select(),
        variantSnapshot:
          EcommerceMallProductVariantSnapshotAtInvertTransformer.select(),
        sellerSnapshot:
          EcommerceMallOrderItemSellerSnapshotTransformer.select(),
      },
    } satisfies Prisma.ecommerce_mall_order_item_snapshotsFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IEcommerceMallOrderItemSnapshot> {
    return {
      id: input.id,
      orderItemId: input.orderItem.id,
      createdAt: input.created_at.toISOString(),
      product: await EcommerceMallOrderItemProductSnapshotTransformer.transform(
        input.productSnapshot,
      ),
      variant:
        await EcommerceMallProductVariantSnapshotAtInvertTransformer.transform(
          input.variantSnapshot,
        ),
      seller: await EcommerceMallOrderItemSellerSnapshotTransformer.transform(
        input.sellerSnapshot,
      ),
    };
  }
}
