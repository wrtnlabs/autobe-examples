import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIShoppingMallSellerProfileSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallSellerProfileSnapshot";
import { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import { IShoppingMallSellerProfileSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerProfileSnapshot";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { AdministratorPayload } from "../decorators/payload/AdministratorPayload";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchShoppingMallAdministratorSellerProfileSnapshotsHistory(props: {
  administrator: AdministratorPayload;
  body: IShoppingMallSellerProfileSnapshot.IRequest;
}): Promise<IPageIShoppingMallSellerProfileSnapshot.ISummary> {
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 10;
  const offset = props.body.offset ?? (page - 1) * limit;
  const where: Prisma.shopping_mall_seller_profile_snapshotsWhereInput = {};
  if (props.body.sellerId !== undefined) {
    where.shopping_mall_seller_id = props.body.sellerId;
  }
  if (
    props.body.createdAtGte !== undefined ||
    props.body.createdAtLte !== undefined
  ) {
    const createdAtFilter: {
      gte?: string | undefined;
      lte?: string | undefined;
    } = {};
    if (props.body.createdAtGte !== undefined) {
      createdAtFilter.gte = props.body.createdAtGte;
    }
    if (props.body.createdAtLte !== undefined) {
      createdAtFilter.lte = props.body.createdAtLte;
    }
    where.created_at = createdAtFilter;
  }
  if (props.body.shopName !== undefined) {
    where.shop_name = { contains: props.body.shopName, mode: "insensitive" };
  }
  if (props.body.shopDescription !== undefined) {
    where.shop_description = {
      contains: props.body.shopDescription,
      mode: "insensitive",
    };
  }
  const data =
    await MyGlobal.prisma.shopping_mall_seller_profile_snapshots.findMany({
      where,
      skip: offset,
      take: limit,
      orderBy: { created_at: "desc" },
      include: {
        seller: {
          select: {
            id: true,
            email: true,
            shop_name: true,
            shop_description: true,
            logo_uri: true,
            approval_status: true,
            rejection_reason: true,
          },
        },
      },
    });
  const total =
    await MyGlobal.prisma.shopping_mall_seller_profile_snapshots.count({
      where,
    });
  function transform(
    snapshot: (typeof data)[number],
  ): IShoppingMallSellerProfileSnapshot.ISummary {
    return {
      id: snapshot.id,
      shopName: snapshot.shop_name,
      shopDescription: snapshot.shop_description ?? null,
      logoImageUrl: snapshot.logo_image_url ?? null,
      createdAt: toISOStringSafe(snapshot.created_at),
      seller: {
        id: snapshot.seller.id,
        email: snapshot.seller.email,
        shopName: snapshot.seller.shop_name,
        shopDescription: snapshot.seller.shop_description ?? null,
        logoUri: snapshot.seller.logo_uri ?? null,
        approvalStatus: snapshot.seller.approval_status,
        rejectionReason: snapshot.seller.rejection_reason ?? null,
      },
    };
  }
  return {
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: Math.ceil(total / limit),
    },
    data: data.map(transform),
  };
}
