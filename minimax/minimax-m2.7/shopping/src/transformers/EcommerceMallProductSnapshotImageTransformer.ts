import { IEcommerceMallProductSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductSnapshot";
import { IEcommerceMallProductSnapshotImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductSnapshotImage";
import { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import { IEcommerceMallSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSellerProfile";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import typia, { tags } from "typia";

import { toISOStringSafe } from "../utils/toISOStringSafe";
import { EcommerceMallProductSnapshotAtSummaryTransformer } from "./EcommerceMallProductSnapshotAtSummaryTransformer";

export namespace EcommerceMallProductSnapshotImageTransformer {
  // 1. Payload type first
  export type Payload = Prisma.ecommerce_mall_product_snapshot_imagesGetPayload<
    ReturnType<typeof select>
  >;
  // 2. select() function second
  export function select() {
    return {
      select: {
        id: true,
        url: true,
        display_order: true,
        created_at: true,
        updated_at: true,
        productSnapshot:
          EcommerceMallProductSnapshotAtSummaryTransformer.select(),
      },
    } satisfies Prisma.ecommerce_mall_product_snapshot_imagesFindManyArgs;
  }
  // 3. transform() function last
  export async function transform(
    input: Payload,
  ): Promise<IEcommerceMallProductSnapshotImage> {
    return {
      id: input.id,
      url: input.url,
      displayOrder: input.display_order,
      createdAt: input.created_at.toISOString(),
      updatedAt: input.updated_at.toISOString(),
      productSnapshot:
        await EcommerceMallProductSnapshotAtSummaryTransformer.transform(
          input.productSnapshot,
        ),
    };
  }
}
