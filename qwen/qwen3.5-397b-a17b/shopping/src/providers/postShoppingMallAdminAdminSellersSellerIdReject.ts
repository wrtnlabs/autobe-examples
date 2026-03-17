import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { AdminPayload } from "../decorators/payload/AdminPayload";
import { ShoppingMallSellerTransformer } from "../transformers/ShoppingMallSellerTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postShoppingMallAdminAdminSellersSellerIdReject(props: {
  admin: AdminPayload;
  sellerId: string & tags.Format<"uuid">;
  body: IShoppingMallSeller.IReject;
}): Promise<IShoppingMallSeller> {
  const seller = await MyGlobal.prisma.shopping_mall_sellers.findUniqueOrThrow({
    where: { id: props.sellerId },
  });
  if (seller.approval_status !== "PENDING") {
    throw new HttpException(
      "Seller registration is not in PENDING status",
      400,
    );
  }
  if (
    props.body.reason === null ||
    props.body.reason === undefined ||
    props.body.reason.trim().length === 0
  ) {
    throw new HttpException(
      "Rejection reason is required and cannot be empty",
      400,
    );
  }
  await MyGlobal.prisma.shopping_mall_sellers.update({
    where: { id: props.sellerId },
    data: {
      approval_status: "REJECTED",
      rejection_reason: props.body.reason,
      approved_by_admin_id: props.admin.id,
      updated_at: new Date(),
    },
  });
  const updated = await MyGlobal.prisma.shopping_mall_sellers.findUniqueOrThrow(
    {
      where: { id: props.sellerId },
      ...ShoppingMallSellerTransformer.select(),
    },
  );
  return await ShoppingMallSellerTransformer.transform(updated);
}
