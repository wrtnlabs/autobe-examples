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
    try {
      // Find the seller record
      const seller = await MyGlobal.prisma.shopping_mall_sellers.findUnique({
        where: { id: sellerId },
        select: { id: true, status: true, deleted_at: true },
      });
      if (seller === null) {
        // Seller not found
        details.push({
          sellerId: sellerId,
          success: false,
          errorReason: "not_found",
        });
        failed++;
        continue;
      }
      if (seller.deleted_at !== null) {
        // Seller is deleted
        details.push({
          sellerId: sellerId,
          success: false,
          errorReason: "not_found",
        });
        failed++;
        continue;
      }
      if (seller.status !== "banned") {
        // Seller is not in banned status
        details.push({
          sellerId: sellerId,
          success: false,
          errorReason: "not_banned",
        });
        failed++;
        continue;
      }
      // Update seller status from banned to active
      await MyGlobal.prisma.shopping_mall_sellers.update({
        where: { id: sellerId },
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
    } catch (error) {
      // Database error or other exception
      details.push({
        sellerId: sellerId,
        success: false,
        errorReason: "database_error",
      });
      failed++;
    }
  }
  return {
    total: total,
    succeeded: succeeded,
    failed: failed,
    details: details,
  };
}
