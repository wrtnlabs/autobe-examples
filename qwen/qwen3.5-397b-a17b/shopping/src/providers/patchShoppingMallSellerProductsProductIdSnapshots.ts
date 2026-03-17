import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIShoppingMallProductSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallProductSnapshot";
import { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";
import { IShoppingMallProductSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductSnapshot";
import { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { SellerPayload } from "../decorators/payload/SellerPayload";
import { ShoppingMallProductSnapshotAtSummaryTransformer } from "../transformers/ShoppingMallProductSnapshotAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchShoppingMallSellerProductsProductIdSnapshots(props: {
  seller: SellerPayload;
  productId: string & tags.Format<"uuid">;
  body: IShoppingMallProductSnapshot.IRequest;
}): Promise<IPageIShoppingMallProductSnapshot.ISummary> {
  await MyGlobal.prisma.shopping_mall_products.findUniqueOrThrow({
    where: {
      id: props.productId,
      shopping_seller_id: props.seller.id,
      deleted_at: null,
    },
  });
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 20;
  const skip = (page - 1) * limit;
  const whereInput = {
    shopping_mall_product_id: props.productId,
    ...(props.body.snapshotAtFrom && {
      snapshot_at: {
        gte: new Date(props.body.snapshotAtFrom),
      },
    }),
    ...(props.body.snapshotAtTo && {
      snapshot_at: {
        lte: new Date(props.body.snapshotAtTo),
      },
    }),
    ...(props.body.name && {
      name: {
        contains: props.body.name,
      },
    }),
  } satisfies Prisma.shopping_mall_product_snapshotsWhereInput;
  const orderByInput = (() => {
    if (!props.body.sort) {
      return { snapshot_at: "desc" as const };
    }
    const [field, direction] = props.body.sort.split(",");
    if (field === "snapshot_at") {
      return {
        snapshot_at: direction === "asc" ? ("asc" as const) : ("desc" as const),
      };
    }
    if (field === "created_at") {
      return {
        created_at: direction === "asc" ? ("asc" as const) : ("desc" as const),
      };
    }
    if (field === "name") {
      return {
        name: direction === "asc" ? ("asc" as const) : ("desc" as const),
      };
    }
    return { snapshot_at: "desc" as const };
  })() satisfies Prisma.shopping_mall_product_snapshotsOrderByWithRelationInput;
  const data = await MyGlobal.prisma.shopping_mall_product_snapshots.findMany({
    where: whereInput,
    skip,
    take: limit,
    orderBy: orderByInput,
    ...ShoppingMallProductSnapshotAtSummaryTransformer.select(),
  });
  const total = await MyGlobal.prisma.shopping_mall_product_snapshots.count({
    where: whereInput,
  });
  return {
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: Math.ceil(total / limit),
    } satisfies IPage.IPagination,
    data: await ArrayUtil.asyncMap(
      data,
      ShoppingMallProductSnapshotAtSummaryTransformer.transform,
    ),
  };
}
