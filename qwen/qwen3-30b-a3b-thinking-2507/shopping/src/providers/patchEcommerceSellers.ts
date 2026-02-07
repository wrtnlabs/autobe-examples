import { IEcommerceSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceSeller";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIEcommerceSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceSeller";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchEcommerceSellers(props: {
  body: IEcommerceSeller.IRequest;
}): Promise<IPageIEcommerceSeller.ISummary> {
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 12;
  const skip = (page - 1) * limit;
  const whereInput = {
    deleted_at: null,
    ...(props.body.status && { approval_status: props.body.status }),
    ...(props.body.email && {
      email: { contains: props.body.email },
      ...(props.body.shopName && {
        sellerProfiles: {
          some: {
            shop_name: { contains: props.body.shopName },
          },
        },
      }),
    }),
  };
  const sellers = await MyGlobal.prisma.ecommerce_sellers.findMany({
    where: whereInput,
    skip,
    take: limit,
    orderBy: { updated_at: "desc" },
    select: {
      id: true,
      email: true,
      approval_status: true,
      updated_at: true,
      sellerProfiles: {
        take: 1,
        orderBy: { created_at: "desc" },
      },
    },
  });
  const summaries = sellers.map((seller) => {
    const profile =
      seller.sellerProfiles && seller.sellerProfiles.length > 0
        ? seller.sellerProfiles[0]
        : null;
    return {
      id: seller.id,
      email: seller.email,
      shopName: profile ? profile.shop_name : "",
      status: typia.assert<"pending" | "approved" | "rejected">(
        seller.approval_status,
      ),
      lastUpdate: toISOStringSafe(seller.updated_at),
    };
  });
  const total = await MyGlobal.prisma.ecommerce_sellers.count({
    where: whereInput,
  });
  return {
    data: summaries,
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: Math.ceil(total / limit),
    },
  };
}
