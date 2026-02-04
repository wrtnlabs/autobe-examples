import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import { SellerPayload } from "../decorators/payload/SellerPayload";
import { ShoppingMallSellerTransformer } from "../transformers/ShoppingMallSellerTransformer";

export async function putShoppingMallSellerSellersMe(props: {
  seller: SellerPayload;
  body: IShoppingMallSeller.IUpdate;
}): Promise<IShoppingMallSeller> {
  // Fetch the current seller record
  const seller = await MyGlobal.prisma.shopping_mall_sellers.findUnique({
    where: {
      user_id: props.seller.id,
    },
    include: {
      user: true,
    },
  });
  if (!seller) {
    throw new HttpException("Seller not found", 404);
  }
  // Validate that seller is not suspended or deleted
  if (seller.is_suspended) {
    throw new HttpException("Seller account is suspended", 403);
  }
  if (seller.user.deleted_at) {
    throw new HttpException("Seller account is deleted", 403);
  }
  // Create a snapshot of the current state before update
  // This captures current values from the linked user entity
  await MyGlobal.prisma.shopping_mall_seller_profile_snapshots.create({
    data: {
      seller_id: seller.id,
      shop_name: seller.user.display_name ?? "",
      shop_description: "",
      logo_image_url: "",
      id: v4(), // Generate unique ID for snapshot
      created_at: toISOStringSafe(new Date()), // Set creation timestamp
      is_deleted: false, // Set as not deleted (default state)
    },
  });
  // Since IShoppingMallSeller.IUpdate is an empty object {},
  // we don't receive new field values in the request body.
  // The update is a "commit" or "refresh" of the seller profile,
  // perhaps to trigger the snapshot and update timestamps.
  // We update the last_modified timestamp within the user entity.
  // Update the user entity's updated_at timestamp to reflect profile change
  const updatedSeller = await MyGlobal.prisma.shopping_mall_sellers.update({
    where: {
      id: seller.id,
    },
    data: {
      user: {
        update: {
          updated_at: toISOStringSafe(new Date()),
        },
      },
    },
    include: {
      user: true,
    },
  });
  // Transform result to response DTO using loaded transformer
  const payload = {
    shop_name: updatedSeller.user.display_name ?? "",
    is_approved: updatedSeller.is_approved,
    is_suspended: updatedSeller.is_suspended,
    created_at: updatedSeller.created_at,
    updated_at: updatedSeller.updated_at,
  };
  return ShoppingMallSellerTransformer.transform(payload);
}
