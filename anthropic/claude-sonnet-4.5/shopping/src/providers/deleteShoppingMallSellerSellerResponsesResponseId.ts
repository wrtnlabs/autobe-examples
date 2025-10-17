import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { SellerPayload } from "../decorators/payload/SellerPayload";

export async function deleteShoppingMallSellerSellerResponsesResponseId(props: {
  seller: SellerPayload;
  responseId: string & tags.Format<"uuid">;
}): Promise<void> {
  const { seller, responseId } = props;

  const sellerResponse =
    await MyGlobal.prisma.shopping_mall_seller_responses.findUniqueOrThrow({
      where: { id: responseId },
    });

  if (sellerResponse.shopping_mall_seller_id !== seller.id) {
    throw new HttpException(
      "Unauthorized: You can only delete your own responses",
      403,
    );
  }

  await MyGlobal.prisma.shopping_mall_seller_responses.update({
    where: { id: responseId },
    data: {
      deleted_at: toISOStringSafe(new Date()),
      updated_at: toISOStringSafe(new Date()),
    },
  });
}
