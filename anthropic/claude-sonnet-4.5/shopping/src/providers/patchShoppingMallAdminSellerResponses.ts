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
import { AdminPayload } from "../decorators/payload/AdminPayload";

export async function patchShoppingMallAdminSellerResponses(props: {
  admin: AdminPayload;
  body: IShoppingMallSellerResponse.IRequest;
}): Promise<IPageIShoppingMallSellerResponse.ISummary> {
  const { admin, body } = props;

  const page = body.page ?? 1;
  const pageSize = 20;
  const skip = (page - 1) * pageSize;

  const [responses, totalCount] = await Promise.all([
    MyGlobal.prisma.shopping_mall_seller_responses.findMany({
      where: {
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
      take: pageSize,
    }),
    MyGlobal.prisma.shopping_mall_seller_responses.count({
      where: {
        deleted_at: null,
      },
    }),
  ]);

  const data = responses.map((response) => ({
    id: response.id as string & tags.Format<"uuid">,
    response_text: response.response_text,
  }));

  const totalPages = Math.ceil(totalCount / pageSize);

  return {
    pagination: {
      current: Number(page),
      limit: Number(pageSize),
      records: Number(totalCount),
      pages: Number(totalPages),
    },
    data: data,
  };
}
