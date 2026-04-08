import { IEcommerceMallOrderItemProductSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrderItemProductSnapshot";
import { IEcommerceMallProductSnapshotImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductSnapshotImage";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import { VariadicSingleton } from "tstl";
import typia, { tags } from "typia";

import { MyGlobal } from "../MyGlobal";
import { toISOStringSafe } from "../utils/toISOStringSafe";
import { EcommerceMallProductSnapshotImageTransformer } from "./EcommerceMallProductSnapshotImageTransformer";

export namespace EcommerceMallOrderItemProductSnapshotTransformer {
  export type Payload =
    Prisma.ecommerce_mall_order_item_product_snapshotsGetPayload<
      ReturnType<typeof select>
    >;
  export function select() {
    return {
      select: {
        id: true,
        order_item_id: true,
        category_id: true,
        name: true,
        description: true,
        category_name: true,
        base_price: true,
        created_at: true,
        images: EcommerceMallProductSnapshotImageTransformer.select(),
      },
    } satisfies Prisma.ecommerce_mall_order_item_product_snapshotsFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IEcommerceMallOrderItemProductSnapshot> {
    return {
      id: input.id,
      orderItemId: input.order_item_id,
      categoryId: input.category_id,
      name: input.name,
      description: input.description,
      categoryName: input.category_name,
      basePrice: input.base_price,
      createdAt: toISOStringSafe(input.created_at),
      images: await ArrayUtil.asyncMap(
        input.images,
        EcommerceMallProductSnapshotImageTransformer.transform,
      ),
    };
  }
}
