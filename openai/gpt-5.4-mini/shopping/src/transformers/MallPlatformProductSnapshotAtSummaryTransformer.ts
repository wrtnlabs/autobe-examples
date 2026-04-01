import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IMallPlatformProductSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformProductSnapshot";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import { VariadicSingleton } from "tstl";
import typia, { tags } from "typia";

import { MyGlobal } from "../MyGlobal";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export namespace MallPlatformProductSnapshotAtSummaryTransformer {
  export type Payload = Prisma.mall_platform_product_snapshotsGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        snapshot_kind: true,
        product_name: true,
        product_description: true,
        category_name: true,
        base_price: true,
        main_image_uri: true,
        image_count: true,
        variant_count: true,
        created_at: true,
        product: true,
        variants: true,
        images: true,
      },
    } satisfies Prisma.mall_platform_product_snapshotsFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IMallPlatformProductSnapshot.ISummary> {
    return {
      id: input.id,
      snapshotKind: input.snapshot_kind,
      productName: input.product_name,
      productDescription: input.product_description,
      categoryName: input.category_name,
      basePrice: Number(input.base_price),
      mainImageUri: input.main_image_uri,
      imageCount: input.image_count,
      variantCount: input.variant_count,
      createdAt: input.created_at.toISOString(),
    };
  }
}
