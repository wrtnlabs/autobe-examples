import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IShoppingMallSellerResponse } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerResponse";
import { SellerPayload } from "../decorators/payload/SellerPayload";

export async function putShoppingMallSellerSellerResponsesResponseId(props: {
  seller: SellerPayload;
  responseId: string & tags.Format<"uuid">;
  body: IShoppingMallSellerResponse.IUpdate;
}): Promise<IShoppingMallSellerResponse> {
  const { seller, responseId, body } = props;

  const existingResponse =
    await MyGlobal.prisma.shopping_mall_seller_responses.findUnique({
      where: { id: responseId },
    });

  if (!existingResponse) {
    throw new HttpException("Seller response not found", 404);
  }

  if (existingResponse.shopping_mall_seller_id !== seller.id) {
    throw new HttpException(
      "Unauthorized: You can only update your own responses",
      403,
    );
  }

  const createdAtTime = existingResponse.created_at.getTime();
  const currentTime = Date.now();
  const sevenDaysInMillis = 7 * 24 * 60 * 60 * 1000;

  if (currentTime - createdAtTime > sevenDaysInMillis) {
    throw new HttpException(
      "Edit window expired: Responses can only be edited within 7 days of creation",
      400,
    );
  }

  const updated = await MyGlobal.prisma.shopping_mall_seller_responses.update({
    where: { id: responseId },
    data: {
      response_text: body.response_text ?? undefined,
      status: "pending_moderation",
      updated_at: toISOStringSafe(new Date()),
    },
  });

  return {
    id: updated.id as string & tags.Format<"uuid">,
    response_text: updated.response_text,
  };
}
