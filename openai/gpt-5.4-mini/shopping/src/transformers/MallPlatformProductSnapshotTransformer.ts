import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IMallPlatformCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformCategory";
import { IMallPlatformProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformProduct";
import { IMallPlatformProductSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformProductSnapshot";
import { IMallPlatformProductSnapshotImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformProductSnapshotImage";
import { IMallPlatformProductSnapshotVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformProductSnapshotVariant";
import { IMallPlatformSellerAccount } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformSellerAccount";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import { VariadicSingleton } from "tstl";
import typia, { tags } from "typia";

import { MyGlobal } from "../MyGlobal";
import { toISOStringSafe } from "../utils/toISOStringSafe";
import { MallPlatformProductAtSummaryTransformer } from "./MallPlatformProductAtSummaryTransformer";
import { MallPlatformProductSnapshotImageAtSummaryTransformer } from "./MallPlatformProductSnapshotImageAtSummaryTransformer";
import { MallPlatformProductSnapshotVariantAtSummaryTransformer } from "./MallPlatformProductSnapshotVariantAtSummaryTransformer";

export namespace MallPlatformProductSnapshotTransformer {
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
        product: MallPlatformProductAtSummaryTransformer.select(),
        images: MallPlatformProductSnapshotImageAtSummaryTransformer.select(),
        variants:
          MallPlatformProductSnapshotVariantAtSummaryTransformer.select(),
      },
    } satisfies Prisma.mall_platform_product_snapshotsFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IMallPlatformProductSnapshot> {
    return {
      id: input.id,
      product: await MallPlatformProductAtSummaryTransformer.transform(
        input.product,
      ),
      snapshotKind: input.snapshot_kind,
      productName: input.product_name,
      productDescription: input.product_description,
      categoryName: input.category_name ?? null,
      basePrice: input.base_price,
      mainImageUri: input.main_image_uri ?? null,
      imageCount: input.image_count,
      variantCount: input.variant_count,
      createdAt: input.created_at.toISOString(),
      images: await ArrayUtil.asyncMap(
        input.images,
        MallPlatformProductSnapshotImageAtSummaryTransformer.transform,
      ),
      variants: await ArrayUtil.asyncMap(
        input.variants,
        MallPlatformProductSnapshotVariantAtSummaryTransformer.transform,
      ),
    };
  }
}
