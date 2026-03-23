import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
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

export async function postShoppingMallAdminSellersBulkBan(props: {
  admin: AdminPayload;
  body: IShoppingMallSeller.IBulkBan;
}): Promise<IShoppingMallSeller.IBulkBanResult> {
  const sellerIds = props.body.sellerIds;
  // Query all sellers to validate existence and status
  const sellers = await MyGlobal.prisma.shopping_mall_sellers.findMany({
    where: {
      id: {
        in: sellerIds,
      },
      deleted_at: null,
    },
    select: {
      id: true,
      status: true,
    },
  });
  const sellerMap = new Map(sellers.map((s) => [s.id, s.status]));
  const validSellerIds: (string & tags.Format<"uuid">)[] = [];
  const failed: IShoppingMallSeller.IBulkBanFailedItem[] = [];
  // Validate each seller
  for (const sellerId of sellerIds) {
    const status = sellerMap.get(sellerId);
    if (status === undefined) {
      // Seller not found or soft-deleted
      failed.push({
        sellerId: sellerId,
        errorCode: "SELLER_NOT_FOUND",
        errorMessage: "Seller account not found or has been deleted",
      });
    } else if (status !== "active") {
      // Seller already banned or in invalid state
      failed.push({
        sellerId: sellerId,
        errorCode: "ALREADY_BANNED",
        errorMessage:
          "Seller account is already banned or not in active status",
      });
    } else {
      validSellerIds.push(sellerId);
    }
  }
  // Update all valid sellers to banned status
  let successCount = 0;
  if (validSellerIds.length > 0) {
    const result = await MyGlobal.prisma.shopping_mall_sellers.updateMany({
      where: {
        id: {
          in: validSellerIds,
        },
      },
      data: {
        status: "banned",
        updated_at: new Date(),
      },
    });
    successCount = result.count;
  }
  return {
    successCount,
    failed,
  };
}
