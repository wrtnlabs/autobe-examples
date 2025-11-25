import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function deleteShoppingMallOrdersOrderNumberReturnsId(props: {
  orderNumber: string;
  id: string & tags.Format<"uuid">;
}): Promise<void> {
  const returnRequest =
    await MyGlobal.prisma.shopping_mall_order_returns.findUnique({
      where: {
        id: props.id,
      },
    });

  if (!returnRequest) {
    throw new HttpException("Return request not found", 404);
  }

  if (!["requested", "denied"].includes(returnRequest.return_status)) {
    throw new HttpException(
      "Return request cannot be deleted. Must be in requested or denied status.",
      403,
    );
  }

  await MyGlobal.prisma.shopping_mall_order_returns.delete({
    where: {
      id: props.id,
    },
  });
}
