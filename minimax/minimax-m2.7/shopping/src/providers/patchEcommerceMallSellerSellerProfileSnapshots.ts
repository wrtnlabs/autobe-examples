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

export async function patchEcommerceMallSellerSellerProfileSnapshots(props: {
  seller: SellerPayload;
  body: IEcommerceMallSellerProfileSnapshot.IRequest;
}): Promise<IPageIEcommerceMallSellerProfileSnapshot.ISummary> {
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 20;
  const skip = (page - 1) * limit;
  // Find the seller's profile to get the profile ID for filtering
  const sellerProfile =
    await MyGlobal.prisma.ecommerce_mall_seller_profiles.findFirst({
      where: {
        seller_id: props.seller.id,
        deleted_at: null,
      },
      select: {
        id: true,
      },
    });
  // If no profile exists, return empty results
  if (!sellerProfile) {
    return {
      pagination: {
        current: typia.assert<number & tags.Type<"int32"> & tags.Minimum<0>>(1),
        limit: typia.assert<number & tags.Type<"int32"> & tags.Minimum<0>>(20),
        records: typia.assert<number & tags.Type<"int32"> & tags.Minimum<0>>(0),
        pages: typia.assert<number & tags.Type<"int32"> & tags.Minimum<0>>(0),
      },
      data: [],
    };
  }
  // Build date filter conditions conditionally
  const createdAtCondition: {
    gte?: Date;
    lte?: Date;
  } = {};
  if (props.body.fromDate) {
    createdAtCondition.gte = new Date(props.body.fromDate);
  }
  if (props.body.toDate) {
    createdAtCondition.lte = new Date(props.body.toDate);
  }
  const hasDateFilter =
    props.body.fromDate !== undefined || props.body.toDate !== undefined;
  // Query snapshots with filters and pagination
  const snapshots =
    await MyGlobal.prisma.ecommerce_mall_seller_profile_snapshots.findMany({
      where: {
        ecommerce_mall_seller_profile_id: sellerProfile.id,
        ...(hasDateFilter && { created_at: createdAtCondition }),
      },
      orderBy: {
        created_at: "desc",
      },
      skip,
      take: limit,
      select: {
        id: true,
        shop_name: true,
        shop_description: true,
        logo_url: true,
        created_at: true,
      },
    });
  // Get total count for pagination
  const total =
    await MyGlobal.prisma.ecommerce_mall_seller_profile_snapshots.count({
      where: {
        ecommerce_mall_seller_profile_id: sellerProfile.id,
        ...(hasDateFilter && { created_at: createdAtCondition }),
      },
    });
  // Transform to ISummary format
  const data: IEcommerceMallSellerProfileSnapshot.ISummary[] = snapshots.map(
    (snapshot): IEcommerceMallSellerProfileSnapshot.ISummary => ({
      id: snapshot.id as string & tags.Format<"uuid">,
      shop_name: snapshot.shop_name,
      shop_description: snapshot.shop_description ?? undefined,
      logo_url: snapshot.logo_url ?? undefined,
      created_at: toISOStringSafe(snapshot.created_at),
    }),
  );
  return {
    pagination: {
      current: typia.assert<number & tags.Type<"int32"> & tags.Minimum<0>>(
        page,
      ),
      limit: typia.assert<number & tags.Type<"int32"> & tags.Minimum<0>>(limit),
      records: typia.assert<number & tags.Type<"int32"> & tags.Minimum<0>>(
        total,
      ),
      pages: typia.assert<number & tags.Type<"int32"> & tags.Minimum<0>>(
        Math.ceil(total / limit),
      ),
    },
    data,
  };
}
