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

export async function postEcommerceMallAdminSellersSellerIdReject(props: {
  admin: AdminPayload;
  sellerId: string & tags.Format<"uuid">;
  body: IEcommerceMallSeller.IUpdate;
}): Promise<IEcommerceMallSeller> {
  // 1. Fetch seller and verify exists
  const seller = await MyGlobal.prisma.ecommerce_mall_sellers.findUniqueOrThrow(
    {
      where: { id: props.sellerId },
      select: {
        id: true,
        approval_status: true,
        rejection_reason: true,
        shop_name: true,
        shop_description: true,
      },
    },
  );
  // 2. Validate seller is in pending status
  if (seller.approval_status !== "pending") {
    throw new HttpException("Seller is not in pending approval status", 409);
  }
  // 3. Validate rejection reason is provided and not empty
  if (
    props.body.rejection_reason === undefined ||
    props.body.rejection_reason === null ||
    props.body.rejection_reason.trim().length === 0
  ) {
    throw new HttpException("Rejection reason is required", 400);
  }
  // 4. Create snapshot data
  const previousValues = JSON.stringify({
    approval_status: seller.approval_status,
    rejection_reason: seller.rejection_reason,
  });
  const currentValues = JSON.stringify({
    approval_status: "rejected",
    rejection_reason: props.body.rejection_reason,
  });
  // 5. Update seller and create snapshot in transaction
  await MyGlobal.prisma.$transaction([
    MyGlobal.prisma.ecommerce_mall_sellers.update({
      where: { id: props.sellerId },
      data: {
        approval_status: "rejected",
        rejection_reason: props.body.rejection_reason,
        updated_at: new Date(),
      },
    }),
    MyGlobal.prisma.ecommerce_mall_seller_snapshots.create({
      data: {
        id: v4(),
        ecommerce_mall_seller_id: props.sellerId,
        ecommerce_mall_admin_id: props.admin.id,
        created_at: new Date(),
        previous_values: previousValues,
        current_values: currentValues,
      },
    }),
  ]);
  // 6. Fetch and return updated seller with transformer
  const result = await MyGlobal.prisma.ecommerce_mall_sellers.findUniqueOrThrow(
    {
      where: { id: props.sellerId },
      ...EcommerceMallSellerTransformer.select(),
    },
  );
  return await EcommerceMallSellerTransformer.transform(result);
}
