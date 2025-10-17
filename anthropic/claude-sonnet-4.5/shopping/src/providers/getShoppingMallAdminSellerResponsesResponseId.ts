import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IShoppingMallSellerResponse } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerResponse";
import { AdminPayload } from "../decorators/payload/AdminPayload";

export async function getShoppingMallAdminSellerResponsesResponseId(props: {
  admin: AdminPayload;
  responseId: string & tags.Format<"uuid">;
}): Promise<IShoppingMallSellerResponse> {
  const { responseId } = props;

  const sellerResponse =
    await MyGlobal.prisma.shopping_mall_seller_responses.findUniqueOrThrow({
      where: { id: responseId },
      select: {
        id: true,
        response_text: true,
      },
    });

  return {
    id: sellerResponse.id as string & tags.Format<"uuid">,
    response_text: sellerResponse.response_text,
  };
}
