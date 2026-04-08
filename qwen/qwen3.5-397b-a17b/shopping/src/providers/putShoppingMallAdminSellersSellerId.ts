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
import { ShoppingMallSellerTransformer } from "../transformers/ShoppingMallSellerTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function putShoppingMallAdminSellersSellerId(props: {
  admin: AdminPayload;
  sellerId: string & tags.Format<"uuid">;
  body: IShoppingMallSeller.IUpdate;
}): Promise<IShoppingMallSeller> {
  // Verify seller exists and is not deleted
  await MyGlobal.prisma.shopping_mall_sellers.findUniqueOrThrow({
    where: {
      id: props.sellerId,
      deleted_at: null,
    },
  });
  // Validate: if rejecting, rejection_reason must be provided and non-empty
  if (props.body.approval_status === "rejected") {
    if (
      props.body.rejection_reason === undefined ||
      props.body.rejection_reason === null ||
      props.body.rejection_reason.trim().length === 0
    ) {
      throw new HttpException(
        "Rejection reason is required when rejecting a seller application",
        400,
      );
    }
  }
  // Update the seller record
  await MyGlobal.prisma.shopping_mall_sellers.update({
    where: {
      id: props.sellerId,
    },
    data: {
      ...(props.body.approval_status !== undefined && {
        approval_status: props.body.approval_status,
      }),
      ...(props.body.rejection_reason !== undefined && {
        rejection_reason: props.body.rejection_reason,
      }),
      updated_at: new Date(),
    },
  });
  // Fetch and return the updated seller
  const updated = await MyGlobal.prisma.shopping_mall_sellers.findUniqueOrThrow(
    {
      where: {
        id: props.sellerId,
      },
      ...ShoppingMallSellerTransformer.select(),
    },
  );
  return await ShoppingMallSellerTransformer.transform(updated);
}
