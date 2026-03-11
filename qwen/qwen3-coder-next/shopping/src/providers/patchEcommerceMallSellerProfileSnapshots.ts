import { IEcommerceMallShopProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallShopProfile";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIEcommerceMallShopProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceMallShopProfile";
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
  body: IEcommerceMallShopProfile.IRequest;
}): Promise<IPageIEcommerceMallShopProfile.ISummary> {
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 100;
  const skip = (page - 1) * limit;
  const where: Prisma.ecommerce_mall_shop_profile_snapshotsWhereInput = {
    ecommerce_mall_seller_id: props.seller.id,
    created_at:
      props.body.after !== undefined
        ? { gt: new Date(props.body.after) }
        : props.body.before !== undefined
          ? { lt: new Date(props.body.before) }
          : undefined,
  };
  const data =
    await MyGlobal.prisma.ecommerce_mall_shop_profile_snapshots.findMany({
      where,
      skip,
      take: limit,
      orderBy: { created_at: "desc" },
    });
  const total =
    await MyGlobal.prisma.ecommerce_mall_shop_profile_snapshots.count({
      where,
    });
  return {
    pagination: {
      current: page,
      limit,
      records: total,
      pages: Math.ceil(total / limit),
    },
    data: data.map((snap) => ({
      created_at: snap.created_at.toISOString(),
      updated_at: snap.updated_at.toISOString(),
      ecommerce_mall_seller_id: snap.ecommerce_mall_seller_id,
      ecommerce_mall_shop_profile_id: snap.ecommerce_mall_shop_profile_id,
    })),
  };
}
