import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IShoppingMallSellerResponse } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerResponse";
import { IPageIShoppingMallSellerResponse } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallSellerResponse";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { SellerPayload } from "../decorators/payload/SellerPayload";

export async function patchShoppingMallSellerSellerResponses(props: {
  seller: SellerPayload;
  body: IShoppingMallSellerResponse.IRequest;
}): Promise<IPageIShoppingMallSellerResponse.ISummary> {
  const { seller, body } = props;

  const page = body.page ?? 1;
  const limit = 20;
  const skip = (page - 1) * limit;

  const [responses, total] = await Promise.all([
    MyGlobal.prisma.shopping_mall_seller_responses.findMany({
      where: {
        shopping_mall_seller_id: seller.id,
        deleted_at: null,
      },
      select: {
        id: true,
        response_text: true,
      },
      orderBy: {
        created_at: "desc",
      },
      skip: skip,
      take: limit,
    }),
    MyGlobal.prisma.shopping_mall_seller_responses.count({
      where: {
        shopping_mall_seller_id: seller.id,
        deleted_at: null,
      },
    }),
  ]);

  return {
    pagination: {
      current: Number(page),
      limit: Number(limit),
      records: total,
      pages: Math.ceil(total / limit),
    },
    data: responses.map((response) => ({
      id: response.id as string & tags.Format<"uuid">,
      response_text: response.response_text,
    })),
  };
}
