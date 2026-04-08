import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIShoppingMallSellerProfileSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallSellerProfileSnapshot";
import { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import { IShoppingMallSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerProfile";
import { IShoppingMallSellerProfileSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerProfileSnapshot";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { SellerPayload } from "../decorators/payload/SellerPayload";
import { ShoppingMallSellerProfileSnapshotAtSummaryTransformer } from "../transformers/ShoppingMallSellerProfileSnapshotAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchShoppingMallSellerProfileSnapshots(props: {
  seller: SellerPayload;
  body: IShoppingMallSellerProfileSnapshot.IRequest;
}): Promise<IPageIShoppingMallSellerProfileSnapshot.ISummary> {
  const sellerProfile =
    await MyGlobal.prisma.shopping_mall_seller_profiles.findFirstOrThrow({
      where: {
        seller_id: props.seller.id,
      },
      select: { id: true },
    });
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 20;
  const skip = (page - 1) * limit;
  const createdAtFilters: {
    gte?: Date;
    lte?: Date;
  } = {};
  if (props.body.createdAtFrom) {
    createdAtFilters.gte = new Date(props.body.createdAtFrom);
  }
  if (props.body.createdAtTo) {
    createdAtFilters.lte = new Date(props.body.createdAtTo);
  }
  const whereInput: Prisma.shopping_mall_seller_profile_snapshotsWhereInput = {
    shopping_mall_seller_profile_id: sellerProfile.id,
    ...(Object.keys(createdAtFilters).length > 0 && {
      created_at: createdAtFilters,
    }),
  };
  const records =
    await MyGlobal.prisma.shopping_mall_seller_profile_snapshots.findMany({
      where: whereInput,
      skip,
      take: limit,
      orderBy: { created_at: "desc" },
      ...ShoppingMallSellerProfileSnapshotAtSummaryTransformer.select(),
    });
  const total =
    await MyGlobal.prisma.shopping_mall_seller_profile_snapshots.count({
      where: whereInput,
    });
  const pages = Math.ceil(total / limit);
  return {
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: pages,
    } satisfies IPage.IPagination,
    data: await ArrayUtil.asyncMap(
      records,
      ShoppingMallSellerProfileSnapshotAtSummaryTransformer.transform,
    ),
  } satisfies IPageIShoppingMallSellerProfileSnapshot.ISummary;
}
