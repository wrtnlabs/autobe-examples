import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIShoppingMallProductSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallProductSnapshot";
import { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";
import { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import { IShoppingMallProductSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductSnapshot";
import { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import { IShoppingMallSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerProfile";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { AdministratorPayload } from "../decorators/payload/AdministratorPayload";
import { ShoppingMallProductSnapshotAtSummaryTransformer } from "../transformers/ShoppingMallProductSnapshotAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchShoppingMallAdministratorProductsProductIdSnapshots(props: {
  administrator: AdministratorPayload;
  productId: string & tags.Format<"uuid">;
  body: IShoppingMallProductSnapshot.IRequest;
}): Promise<IPageIShoppingMallProductSnapshot.ISummary> {
  const page: number = props.body.page ?? 1;
  const limit: number = props.body.limit ?? 10;
  const skip: number = (page - 1) * limit;
  const where: Prisma.shopping_mall_product_snapshotsWhereInput = {
    shopping_mall_product_id: props.productId,
    ...(props.body.fromVersion !== undefined ||
    props.body.toVersion !== undefined
      ? {
          snapshot_version: {
            ...(props.body.fromVersion !== undefined && {
              gte: props.body.fromVersion,
            }),
            ...(props.body.toVersion !== undefined && {
              lte: props.body.toVersion,
            }),
          },
        }
      : {}),
  };
  const data: Array<
    Prisma.shopping_mall_product_snapshotsGetPayload<
      ReturnType<typeof ShoppingMallProductSnapshotAtSummaryTransformer.select>
    >
  > = await MyGlobal.prisma.shopping_mall_product_snapshots.findMany({
    where,
    skip,
    take: limit,
    orderBy: [
      { snapshot_version: "desc" },
      { captured_at: "desc" },
      { id: "desc" },
    ],
    ...ShoppingMallProductSnapshotAtSummaryTransformer.select(),
  });
  const total: number =
    await MyGlobal.prisma.shopping_mall_product_snapshots.count({
      where,
    });
  return {
    data: await ArrayUtil.asyncMap(
      data,
      ShoppingMallProductSnapshotAtSummaryTransformer.transform,
    ),
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: Math.ceil(total / limit),
    } satisfies IPage.IPagination,
  } satisfies IPageIShoppingMallProductSnapshot.ISummary;
}
