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
  // Query all sellers by their IDs
  const sellers = await MyGlobal.prisma.shopping_mall_sellers.findMany({
    where: {
      id: {
        in: sellerIds,
      },
    },
    select: {
      id: true,
      status: true,
      deleted_at: true,
    },
  });
  const failed: IShoppingMallSeller.IBulkBanFailedItem[] = [];
  const idsToUpdate: string[] = [];
  // Validate each seller
  for (const sellerId of sellerIds) {
    const seller = sellers.find((s) => s.id === sellerId);
    if (seller === undefined) {
      failed.push({
        sellerId: sellerId,
        errorCode: "SELLER_NOT_FOUND",
        errorMessage: `Seller with ID ${sellerId} does not exist`,
      } satisfies IShoppingMallSeller.IBulkBanFailedItem);
      continue;
    }
    if (seller.deleted_at !== null) {
      failed.push({
        sellerId: seller.id,
        errorCode: "ACCOUNT_DELETED",
        errorMessage: `Seller with ID ${seller.id} has been deleted and cannot be banned`,
      } satisfies IShoppingMallSeller.IBulkBanFailedItem);
      continue;
    }
    if (seller.status !== "active") {
      failed.push({
        sellerId: seller.id,
        errorCode: "ALREADY_BANNED",
        errorMessage: `Seller with ID ${seller.id} is already banned or has status ${seller.status}`,
      } satisfies IShoppingMallSeller.IBulkBanFailedItem);
      continue;
    }
    idsToUpdate.push(seller.id);
  }
  // Update all valid sellers to banned status
  if (idsToUpdate.length > 0) {
    await MyGlobal.prisma.shopping_mall_sellers.updateMany({
      where: {
        id: {
          in: idsToUpdate,
        },
      },
      data: {
        status: "banned",
        updated_at: new Date(),
      },
    });
  }
  const successCount = idsToUpdate.length;
  return {
    successCount: successCount,
    failed: failed,
  } satisfies IShoppingMallSeller.IBulkBanResult;
}
