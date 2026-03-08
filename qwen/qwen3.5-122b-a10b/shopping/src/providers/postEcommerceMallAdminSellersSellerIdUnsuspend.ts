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

export async function postEcommerceMallAdminSellersSellerIdUnsuspend(props: {
  admin: AdminPayload;
  sellerId: string & tags.Format<"uuid">;
}): Promise<IEcommerceMallSeller> {
  // 1. Validate seller exists and is not deleted
  await MyGlobal.prisma.ecommerce_mall_sellers.findUniqueOrThrow({
    where: { id: props.sellerId, deleted_at: null },
  });
  // 2. Verify seller is currently suspended
  const current =
    await MyGlobal.prisma.ecommerce_mall_sellers.findUniqueOrThrow({
      where: { id: props.sellerId },
      select: { account_status: true },
    });
  if (current.account_status !== "suspended") {
    throw new HttpException(
      `Seller account is not suspended (current status: ${current.account_status})`,
      400,
    );
  }
  // 3. Update seller status to active
  await MyGlobal.prisma.ecommerce_mall_sellers.update({
    where: { id: props.sellerId },
    data: {
      account_status: "active",
      updated_at: new Date(),
    },
  });
  // 4. Create snapshot recording the status change
  await MyGlobal.prisma.ecommerce_mall_seller_snapshots.create({
    data: {
      id: v4(),
      ecommerce_mall_seller_id: props.sellerId,
      ecommerce_mall_admin_id: props.admin.id,
      created_at: new Date(),
      previous_values: JSON.stringify({ account_status: "suspended" }),
      current_values: JSON.stringify({ account_status: "active" }),
    },
  });
  // 5. Fetch and transform the updated seller
  const updated =
    await MyGlobal.prisma.ecommerce_mall_sellers.findUniqueOrThrow({
      where: { id: props.sellerId },
      ...EcommerceMallSellerTransformer.select(),
    });
  return await EcommerceMallSellerTransformer.transform(updated);
}
