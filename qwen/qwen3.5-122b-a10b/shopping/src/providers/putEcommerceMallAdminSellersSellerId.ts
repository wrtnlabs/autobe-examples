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

export async function putEcommerceMallAdminSellersSellerId(props: {
  admin: AdminPayload;
  sellerId: string & tags.Format<"uuid">;
  body: IEcommerceMallSeller.IUpdate;
}): Promise<IEcommerceMallSeller> {
  // 1. Fetch existing seller (throws 404 if not found or deleted)
  const seller = await MyGlobal.prisma.ecommerce_mall_sellers.findUniqueOrThrow(
    {
      where: { id: props.sellerId },
      select: {
        id: true,
        shop_name: true,
        shop_description: true,
        approval_status: true,
        account_status: true,
        rejection_reason: true,
        deleted_at: true,
      },
    },
  );
  // 2. Validate shop_name uniqueness if being updated
  if (props.body.shop_name !== undefined) {
    const duplicate = await MyGlobal.prisma.ecommerce_mall_sellers.findFirst({
      where: {
        shop_name: {
          equals: props.body.shop_name,
          mode: "insensitive",
        },
        id: { not: props.sellerId },
        deleted_at: null,
      },
    });
    if (duplicate !== null) {
      throw new HttpException("Shop name already exists", 409);
    }
  }
  // 3. Prepare previous and current values for snapshot
  const previousValues = JSON.stringify({
    shop_name: seller.shop_name,
    shop_description: seller.shop_description,
  });
  const currentValues = JSON.stringify({
    shop_name: props.body.shop_name ?? seller.shop_name,
    shop_description: props.body.shop_description ?? seller.shop_description,
  });
  // 4. Update seller and create snapshot in transaction
  const [updated] = await MyGlobal.prisma.$transaction([
    MyGlobal.prisma.ecommerce_mall_sellers.update({
      where: { id: props.sellerId },
      data: {
        ...(props.body.shop_name !== undefined && {
          shop_name: props.body.shop_name,
        }),
        ...(props.body.shop_description !== undefined && {
          shop_description: props.body.shop_description,
        }),
        ...(props.body.approval_status !== undefined && {
          approval_status: props.body.approval_status,
        }),
        ...(props.body.account_status !== undefined && {
          account_status: props.body.account_status,
        }),
        ...(props.body.rejection_reason !== undefined && {
          rejection_reason: props.body.rejection_reason,
        }),
        updated_at: new Date(),
      },
    }),
    MyGlobal.prisma.ecommerce_mall_seller_snapshots.create({
      data: {
        id: v4() as string & tags.Format<"uuid">,
        ecommerce_mall_seller_id: props.sellerId,
        ecommerce_mall_admin_id: props.admin.id,
        created_at: new Date(),
        previous_values: previousValues,
        current_values: currentValues,
      },
    }),
  ]);
  // 5. Transform and return
  return await EcommerceMallSellerTransformer.transform(updated);
}
