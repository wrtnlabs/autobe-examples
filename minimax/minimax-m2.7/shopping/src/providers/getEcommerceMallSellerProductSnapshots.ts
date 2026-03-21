import { IEcommerceMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProduct";
import { IEcommerceMallProductSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductSnapshot";
import { IEcommerceMallProductSnapshotImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductSnapshotImage";
import { IEcommerceMallProductSnapshotVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductSnapshotVariant";
import { IEcommerceMallProductSnapshotVariantOptionValue } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductSnapshotVariantOptionValue";
import { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import { IEcommerceMallSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSellerProfile";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIEcommerceMallProductSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceMallProductSnapshot";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { SellerPayload } from "../decorators/payload/SellerPayload";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getEcommerceMallSellerProductSnapshots(props: {
  seller: SellerPayload;
}): Promise<IPageIEcommerceMallProductSnapshot> {
  const page = 1;
  const limit = 20;
  const skip = (page - 1) * limit;
  const whereInput = {
    ecommerce_mall_seller_id: props.seller.id,
  } satisfies Prisma.ecommerce_mall_product_snapshotsWhereInput;
  const total = await MyGlobal.prisma.ecommerce_mall_product_snapshots.count({
    where: whereInput,
  });
  const data = await MyGlobal.prisma.ecommerce_mall_product_snapshots.findMany({
    where: whereInput,
    skip: skip,
    take: limit,
    orderBy: { created_at: "desc" },
    include: {
      product: {
        include: {
          category: true,
        },
      },
      seller: {
        include: {
          profile: true,
        },
      },
    },
  });
  return {
    data: await ArrayUtil.asyncMap(data, async (item) =>
      typia.assert<IEcommerceMallProductSnapshot>({
        id: item.id satisfies string as string,
        product_id: item.ecommerce_mall_product_id satisfies string as string,
        seller_id: item.ecommerce_mall_seller_id satisfies string as string,
        name: item.name satisfies string as string,
        title: item.name satisfies string as string,
        description: item.description satisfies string as string,
        price: item.base_price satisfies number as number,
        images:
          [] satisfies IEcommerceMallProductSnapshotImage[] as IEcommerceMallProductSnapshotImage[],
        variants:
          [] satisfies IEcommerceMallProductSnapshotVariant[] as IEcommerceMallProductSnapshotVariant[],
        summary: null,
        seller: {
          id: item.seller.id satisfies string as string,
          name: null,
          profile: (item.seller.profile ?? null) satisfies {
            avatar?: string | null;
            description?: string | null;
          } | null as {
            avatar?: string | null;
            description?: string | null;
          } | null,
        },
        basePrice: item.base_price satisfies number as number,
        categoryName: (item.product?.category?.name ?? null) satisfies
          | string
          | null as string | null,
        createdAt: toISOStringSafe(item.created_at),
      }),
    ),
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: Math.ceil(total / limit),
    } satisfies IPage.IPagination,
  };
}
