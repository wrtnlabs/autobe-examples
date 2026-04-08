import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIShoppingMallProductSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallProductSnapshot";
import { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";
import { IShoppingMallProductSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductSnapshot";
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
  const product =
    await MyGlobal.prisma.shopping_mall_products.findUniqueOrThrow({
      where: {
        id: props.productId,
        shopping_mall_seller_id: props.seller.id,
      },
    });
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 20;
  const skip = (page - 1) * limit;
  const whereInput = {
    shopping_mall_product_id: props.productId,
    ...(props.body.created_at_from && {
      created_at: {
        gte: props.body.created_at_from,
      },
    }),
    ...(props.body.created_at_to && {
      created_at: {
        lte: props.body.created_at_to,
      },
    }),
    ...(props.body.search && {
      OR: [
        { name: { contains: props.body.search } },
        { description: { contains: props.body.search } },
      ],
    }),
  } satisfies Prisma.shopping_mall_product_snapshotsWhereInput;
  const data = await MyGlobal.prisma.shopping_mall_product_snapshots.findMany({
    where: whereInput,
    skip,
    take: limit,
    orderBy: { created_at: "desc" },
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
  } satisfies IPageIShoppingMallProductSnapshot.ISummary;
}
