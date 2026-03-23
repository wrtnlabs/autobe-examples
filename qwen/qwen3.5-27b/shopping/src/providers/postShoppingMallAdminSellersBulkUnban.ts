import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallSellerBulkUnban } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerBulkUnban";
import { IShoppingMallSellerBulkUnbanDetail } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerBulkUnbanDetail";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { AdminPayload } from "../decorators/payload/AdminPayload";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postShoppingMallAdminSellersBulkUnban(props: {
  admin: AdminPayload;
  body: IShoppingMallSellerBulkUnban.ICreate;
}): Promise<IShoppingMallSellerBulkUnban.IResult> {
  const sellerIds = props.body.sellerIds;
  const total = sellerIds.length;
  const details: IShoppingMallSellerBulkUnbanDetail[] = [];
  let succeeded = 0;
  let failed = 0;
  for (const sellerId of sellerIds) {
    const seller = await MyGlobal.prisma.shopping_mall_sellers.findUnique({
      where: {
        id: sellerId,
        deleted_at: null,
      },
      select: {
        id: true,
        status: true,
      },
    });
    if (seller === null) {
      details.push({
        sellerId: sellerId,
        success: false,
        errorReason: "not_found",
      });
      failed++;
      continue;
    }
    if (seller.status !== "banned") {
      details.push({
        sellerId: sellerId,
        success: false,
        errorReason: "not_banned",
      });
      failed++;
      continue;
    }
    await MyGlobal.prisma.shopping_mall_sellers.update({
      where: {
        id: sellerId,
      },
      data: {
        status: "active",
        updated_at: new Date(),
      },
    });
    details.push({
      sellerId: sellerId,
      success: true,
      errorReason: null,
    });
    succeeded++;
  }
  return {
    total: total,
    succeeded: succeeded,
    failed: failed,
    details: details,
  };
}
