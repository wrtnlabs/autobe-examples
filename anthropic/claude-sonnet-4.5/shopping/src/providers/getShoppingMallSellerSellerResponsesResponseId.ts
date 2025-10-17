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

export async function getShoppingMallSellerSellerResponsesResponseId(props: {
  seller: SellerPayload;
  responseId: string & tags.Format<"uuid">;
}): Promise<IShoppingMallSellerResponse> {
  const { seller, responseId } = props;

  const response =
    await MyGlobal.prisma.shopping_mall_seller_responses.findUniqueOrThrow({
      where: { id: responseId },
      select: {
        id: true,
        shopping_mall_seller_id: true,
        response_text: true,
      },
    });

  if (response.shopping_mall_seller_id !== seller.id) {
    throw new HttpException(
      "Unauthorized: You can only view your own responses",
      403,
    );
  }

  return {
    id: response.id as string & tags.Format<"uuid">,
    response_text: response.response_text,
  };
}
