import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIShoppingMallSellerProfileSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallSellerProfileSnapshot";
import { IShoppingMallSellerProfileSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerProfileSnapshot";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { CustomerPayload } from "../decorators/payload/CustomerPayload";
import { ShoppingMallSellerProfileSnapshotAtSummaryTransformer } from "../transformers/ShoppingMallSellerProfileSnapshotAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchShoppingMallCustomerProfileSnapshots(props: {
  customer: CustomerPayload;
  body: IShoppingMallSellerProfileSnapshot.IRequest;
}): Promise<IPageIShoppingMallSellerProfileSnapshot.ISummary> {
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 100;
  const skip = (page - 1) * limit;
  const customer =
    await MyGlobal.prisma.shopping_mall_customers.findUniqueOrThrow({
      where: { id: props.customer.id },
    });
  const seller = await MyGlobal.prisma.shopping_mall_sellers.findFirst({
    where: {
      email: customer.email,
      deleted_at: null,
    },
  });
  if (!seller) {
    throw new HttpException("Seller profile not found", 404);
  }
  const sellerProfile =
    await MyGlobal.prisma.shopping_mall_seller_profiles.findFirst({
      where: {
        seller_id: seller.id,
        deleted_at: null,
      },
    });
  if (!sellerProfile) {
    throw new HttpException("Seller profile not found", 404);
  }
  const whereInput: Prisma.shopping_mall_seller_profile_snapshotsWhereInput = {
    shopping_mall_seller_profile_id: sellerProfile.id,
    ...(props.body.fromDate && {
      created_at: { gte: new Date(props.body.fromDate) },
    }),
    ...(props.body.toDate && {
      created_at: { lte: new Date(props.body.toDate) },
    }),
  };
  const data =
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
  return {
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: Math.ceil(total / limit),
    } satisfies IPage.IPagination,
    data: await ArrayUtil.asyncMap(
      data,
      ShoppingMallSellerProfileSnapshotAtSummaryTransformer.transform,
    ),
  };
}
