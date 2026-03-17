import { IEcommerceMallSellerProfileSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSellerProfileSnapshot";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIEcommerceMallSellerProfileSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceMallSellerProfileSnapshot";
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

export async function patchEcommerceMallSellerProfileSnapshots(props: {
  seller: SellerPayload;
  body: IEcommerceMallSellerProfileSnapshot.IRequest;
}): Promise<IPageIEcommerceMallSellerProfileSnapshot.ISummary> {
  // Parse pagination parameters with defaults
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 100;
  const skip = (page - 1) * limit;
  // Build WHERE clause with date range filtering
  const createdAtFilter: Prisma.DateTimeFilter<"ecommerce_mall_seller_profile_snapshots"> =
    {};
  if (props.body.created_at_min !== null) {
    createdAtFilter.gte = new Date(props.body.created_at_min);
  }
  if (props.body.created_at_max !== null) {
    createdAtFilter.lte = new Date(props.body.created_at_max);
  }
  const where: Prisma.ecommerce_mall_seller_profile_snapshotsWhereInput = {
    seller_id: props.seller.id,
    ...(Object.keys(createdAtFilter).length > 0 && {
      created_at: createdAtFilter,
    }),
  };
  // Determine sort order
  const orderBy: Prisma.ecommerce_mall_seller_profile_snapshotsOrderByWithRelationInput =
    props.body.sort === "created_at_asc"
      ? { created_at: "asc" }
      : { created_at: "desc" };
  // Execute queries sequentially
  const snapshots =
    await MyGlobal.prisma.ecommerce_mall_seller_profile_snapshots.findMany({
      where,
      skip,
      take: limit,
      orderBy,
      select: {
        id: true,
        shop_name: true,
        shop_description: true,
        logo_image_url: true,
        created_at: true,
      },
    });
  const total =
    await MyGlobal.prisma.ecommerce_mall_seller_profile_snapshots.count({
      where,
    });
  // Transform to DTO format
  const data = snapshots.map(
    (snapshot): IEcommerceMallSellerProfileSnapshot.ISummary => ({
      id: snapshot.id,
      shopName: snapshot.shop_name,
      shopDescription: snapshot.shop_description,
      logoImageUrl: snapshot.logo_image_url,
      createdAt: toISOStringSafe(snapshot.created_at),
    }),
  );
  return {
    data,
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: Math.ceil(total / limit),
    } satisfies IPage.IPagination,
  };
}
