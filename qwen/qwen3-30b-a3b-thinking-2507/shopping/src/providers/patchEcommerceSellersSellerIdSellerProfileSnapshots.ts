import { IEcommerceSellerProfileSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceSellerProfileSnapshot";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIEcommerceSellerProfileSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceSellerProfileSnapshot";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchEcommerceSellersSellerIdSellerProfileSnapshots(props: {
  sellerId: string;
  body: IEcommerceSellerProfileSnapshot.IRequest;
}): Promise<IPageIEcommerceSellerProfileSnapshot.ISummary> {
  const page = 1;
  const limit = 100;
  const skip = (page - 1) * limit;
  const data =
    await MyGlobal.prisma.ecommerce_seller_profile_snapshots.findMany({
      where: { ecommerce_sellers_id: props.sellerId },
      skip,
      take: limit,
      orderBy: { created_at: "desc" },
      select: {
        id: true,
        shop_name_before: true,
        shop_name_after: true,
        description_before: true,
        description_after: true,
        logo_before: true,
        logo_after: true,
        created_at: true,
      },
    });
  const total = await MyGlobal.prisma.ecommerce_seller_profile_snapshots.count({
    where: { ecommerce_sellers_id: props.sellerId },
  });
  const transformedData = data.map((item) => ({
    ...item,
    created_at: toISOStringSafe(item.created_at),
  }));
  return {
    data: transformedData,
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: Math.ceil(total / limit),
    },
  };
}
