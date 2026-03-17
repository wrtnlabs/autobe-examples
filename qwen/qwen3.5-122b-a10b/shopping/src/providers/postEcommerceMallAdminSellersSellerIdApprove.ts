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

export async function postEcommerceMallAdminSellersSellerIdApprove(props: {
  admin: AdminPayload;
  sellerId: string & tags.Format<"uuid">;
}): Promise<IEcommerceMallSeller> {
  const seller = await MyGlobal.prisma.ecommerce_mall_sellers.findUniqueOrThrow(
    {
      where: { id: props.sellerId },
    },
  );
  if (seller.deleted_at !== null) {
    throw new HttpException("Seller not found", 404);
  }
  if (seller.approval_status !== "pending") {
    throw new HttpException("Seller is not in pending status", 400);
  }
  const now = new Date();
  await MyGlobal.prisma.$transaction(async (tx) => {
    await tx.ecommerce_mall_sellers.update({
      where: { id: props.sellerId },
      data: {
        approval_status: "approved",
        updated_at: now,
      },
    });
    await tx.ecommerce_mall_seller_snapshots.create({
      data: {
        id: v4() as string & tags.Format<"uuid">,
        created_at: now,
        previous_values: JSON.stringify({ approval_status: "pending" }),
        current_values: JSON.stringify({ approval_status: "approved" }),
        ecommerce_mall_seller_id: props.sellerId,
        ecommerce_mall_admin_id: props.admin.id,
      },
    });
  });
  const updated =
    await MyGlobal.prisma.ecommerce_mall_sellers.findUniqueOrThrow({
      where: { id: props.sellerId },
      ...EcommerceMallSellerTransformer.select(),
    });
  return await EcommerceMallSellerTransformer.transform(updated);
}
