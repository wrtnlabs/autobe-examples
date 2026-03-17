import { IEcommerceMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCategory";
import { IEcommerceMallOrderItemProductSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrderItemProductSnapshot";
import { IEcommerceMallOrderItemSellerSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrderItemSellerSnapshot";
import { IEcommerceMallOrderItemSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrderItemSnapshot";
import { IEcommerceMallOrderItemVariantSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrderItemVariantSnapshot";
import { IEcommerceMallOrderItemVariantSnapshotAttribute } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrderItemVariantSnapshotAttribute";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IParentReference } from "@ORGANIZATION/PROJECT-api/lib/structures/IParentReference";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import typia, { tags } from "typia";

import { toISOStringSafe } from "../utils/toISOStringSafe";
import { EcommerceMallOrderItemProductSnapshotTransformer } from "./EcommerceMallOrderItemProductSnapshotTransformer";
import { EcommerceMallOrderItemSellerSnapshotTransformer } from "./EcommerceMallOrderItemSellerSnapshotTransformer";
import { EcommerceMallOrderItemVariantSnapshotTransformer } from "./EcommerceMallOrderItemVariantSnapshotTransformer";

export namespace EcommerceMallOrderItemSnapshotTransformer {
  export type Payload = Prisma.ecommerce_mall_order_item_snapshotsGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        order_item_id: true,
        created_at: true,
        productSnapshot:
          EcommerceMallOrderItemProductSnapshotTransformer.select(),
        variantSnapshot:
          EcommerceMallOrderItemVariantSnapshotTransformer.select(),
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
      orderItemId: input.order_item_id,
      productSnapshot:
        await EcommerceMallOrderItemProductSnapshotTransformer.transform(
          input.productSnapshot,
        ),
      variantSnapshot:
        await EcommerceMallOrderItemVariantSnapshotTransformer.transform(
          input.variantSnapshot,
        ),
      sellerSnapshot:
        await EcommerceMallOrderItemSellerSnapshotTransformer.transform(
          input.sellerSnapshot,
        ),
      createdAt: input.created_at.toISOString(),
    };
  }
}
