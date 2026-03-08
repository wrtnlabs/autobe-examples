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

export async function postEcommerceMallAdminSellersSellerIdSuspend(props: {
  admin: AdminPayload;
  sellerId: string & tags.Format<"uuid">;
}): Promise<IEcommerceMallSeller> {
  // Verify seller exists and is not deleted
  const seller = await MyGlobal.prisma.ecommerce_mall_sellers.findUniqueOrThrow(
    {
      where: { id: props.sellerId, deleted_at: null },
      select: {
        id: true,
        shop_name: true,
        shop_description: true,
        approval_status: true,
        account_status: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
        rejection_reason: true,
      },
    },
  );
  // Check seller is not already suspended or banned
  if (
    seller.account_status === "suspended" ||
    seller.account_status === "banned"
  ) {
    throw new HttpException("Seller is already suspended or banned", 400);
  }
  // Update account status to suspended
  await MyGlobal.prisma.ecommerce_mall_sellers.update({
    where: { id: props.sellerId },
    data: {
      account_status: "suspended",
      updated_at: new Date(),
    },
  });
  // Create snapshot for audit trail
  const previousValues = JSON.stringify({
    account_status: seller.account_status,
    updated_at: seller.updated_at.toISOString(),
  });
  const currentValues = JSON.stringify({
    account_status: "suspended",
    updated_at: new Date().toISOString(),
  });
  await MyGlobal.prisma.ecommerce_mall_seller_snapshots.create({
    data: {
      id: v4(),
      ecommerce_mall_seller_id: props.sellerId,
      ecommerce_mall_admin_id: props.admin.id,
      created_at: new Date(),
      previous_values: previousValues,
      current_values: currentValues,
    },
  });
  // Return updated seller using transformer
  const updated =
    await MyGlobal.prisma.ecommerce_mall_sellers.findUniqueOrThrow({
      where: { id: props.sellerId },
      ...EcommerceMallSellerTransformer.select(),
    });
  return await EcommerceMallSellerTransformer.transform(updated);
}
