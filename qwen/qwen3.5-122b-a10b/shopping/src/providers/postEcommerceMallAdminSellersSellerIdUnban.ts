import { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { AdminPayload } from "../decorators/payload/AdminPayload";
import { EcommerceMallSellerTransformer } from "../transformers/EcommerceMallSellerTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postEcommerceMallAdminSellersSellerIdUnban(props: {
  admin: AdminPayload;
  sellerId: string & tags.Format<"uuid">;
}): Promise<IEcommerceMallSeller> {
  // Verify seller exists and is not deleted
  const seller = await MyGlobal.prisma.ecommerce_mall_sellers.findUniqueOrThrow(
    {
      where: { id: props.sellerId },
      select: {
        id: true,
        account_status: true,
        deleted_at: true,
      },
    },
  );
  // Verify seller is currently banned
  if (seller.account_status !== "banned") {
    throw new HttpException("Seller account is not banned", 400);
  }
  // Verify seller is not deleted (soft-delete check)
  if (seller.deleted_at !== null) {
    throw new HttpException("Seller account has been deleted", 404);
  }
  // Update account_status from 'banned' to 'active'
  await MyGlobal.prisma.ecommerce_mall_sellers.update({
    where: { id: props.sellerId },
    data: {
      account_status: "active",
      updated_at: new Date(),
    },
  });
  // Create snapshot recording the status change
  const previousValues = JSON.stringify({ account_status: "banned" });
  const currentValues = JSON.stringify({ account_status: "active" });
  await MyGlobal.prisma.ecommerce_mall_seller_snapshots.create({
    data: {
      id: v4() as string & tags.Format<"uuid">,
      ecommerce_mall_seller_id: props.sellerId,
      ecommerce_mall_admin_id: props.admin.id,
      created_at: new Date(),
      previous_values: previousValues,
      current_values: currentValues,
    },
  });
  // Fetch and return updated seller
  const updated =
    await MyGlobal.prisma.ecommerce_mall_sellers.findUniqueOrThrow({
      where: { id: props.sellerId },
      ...EcommerceMallSellerTransformer.select(),
    });
  return await EcommerceMallSellerTransformer.transform(updated);
}
