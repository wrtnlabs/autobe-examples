import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IMallPlatformSellerProfileSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformSellerProfileSnapshot";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIMallPlatformSellerProfileSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIMallPlatformSellerProfileSnapshot";
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

export async function patchMallPlatformSellerSellerProfilesSellerProfileIdSnapshots(props: {
  seller: SellerPayload;
  sellerProfileId: string & tags.Format<"uuid">;
  body: IMallPlatformSellerProfileSnapshot.IRequest;
}): Promise<IPageIMallPlatformSellerProfileSnapshot.ISummary> {
  const sellerProfile =
    await MyGlobal.prisma.mall_platform_seller_profiles.findUniqueOrThrow({
      where: { id: props.sellerProfileId },
      select: {
        id: true,
        seller_account_id: true,
      },
    });
  if (sellerProfile.seller_account_id !== props.seller.id) {
    throw new HttpException("Forbidden", 403);
  }
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 100;
  const skip = (page - 1) * limit;
  const sort = props.body.sort ?? "created_at:desc";
  const where: Prisma.mall_platform_seller_profile_snapshotsWhereInput = {
    seller_profile_id: props.sellerProfileId,
    ...(props.body.search !== undefined
      ? {
          OR: [
            {
              shop_name: {
                contains: props.body.search,
                mode: "insensitive",
              },
            },
            {
              shop_description: {
                contains: props.body.search,
                mode: "insensitive",
              },
            },
          ],
        }
      : {}),
  };
  const data =
    await MyGlobal.prisma.mall_platform_seller_profile_snapshots.findMany({
      where,
      orderBy: sort.toLowerCase().includes("asc")
        ? { created_at: "asc" }
        : { created_at: "desc" },
      skip,
      take: limit,
      select: {
        id: true,
        seller_profile_id: true,
        shop_name: true,
        shop_description: true,
        logo_image_uri: true,
        created_at: true,
      },
    });
  const total =
    await MyGlobal.prisma.mall_platform_seller_profile_snapshots.count({
      where,
    });
  return {
    data: data.map(
      (snapshot): IMallPlatformSellerProfileSnapshot.ISummary => ({
        id: snapshot.id,
        sellerProfileId: snapshot.seller_profile_id,
        shopName: snapshot.shop_name,
        shopDescription: snapshot.shop_description,
        logoImageUri: snapshot.logo_image_uri,
        createdAt: snapshot.created_at.toISOString(),
      }),
    ),
    pagination: {
      current: page,
      limit,
      records: total,
      pages: Math.ceil(total / limit),
    },
  };
}
