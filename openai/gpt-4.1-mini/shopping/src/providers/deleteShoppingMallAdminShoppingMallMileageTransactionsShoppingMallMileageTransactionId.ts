import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { AdminPayload } from "../decorators/payload/AdminPayload";

export async function deleteShoppingMallAdminShoppingMallMileageTransactionsShoppingMallMileageTransactionId(props: {
  admin: AdminPayload;
  shoppingMallMileageTransactionId: string & tags.Format<"uuid">;
}): Promise<void> {
  const found =
    await MyGlobal.prisma.shopping_mall_mileage_transactions.findUnique({
      where: { id: props.shoppingMallMileageTransactionId },
    });

  if (found === null) {
    throw new HttpException("Mileage transaction not found", 404);
  }

  await MyGlobal.prisma.shopping_mall_mileage_transactions.delete({
    where: { id: props.shoppingMallMileageTransactionId },
  });
}
