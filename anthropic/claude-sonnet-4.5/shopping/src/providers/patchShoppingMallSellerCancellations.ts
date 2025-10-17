import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IShoppingMallCancellation } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCancellation";
import { IPageIShoppingMallCancellation } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallCancellation";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { SellerPayload } from "../decorators/payload/SellerPayload";

export async function patchShoppingMallSellerCancellations(props: {
  seller: SellerPayload;
  body: IShoppingMallCancellation.IRequest;
}): Promise<IPageIShoppingMallCancellation> {
  const { seller, body } = props;

  const page = Number(body.page ?? 1);
  const limit = Number(body.limit ?? 10);
  const skip = (page - 1) * limit;

  const [cancellations, total] = await Promise.all([
    MyGlobal.prisma.shopping_mall_cancellations.findMany({
      where: {
        OR: [
          { requester_seller_id: seller.id },
          { approver_seller_id: seller.id },
        ],
        ...(body.cancellation_status !== undefined &&
          body.cancellation_status !== null && {
            cancellation_status: body.cancellation_status,
          }),
      },
      select: {
        id: true,
        cancellation_status: true,
      },
      orderBy: {
        requested_at: "desc",
      },
      skip: skip,
      take: limit,
    }),
    MyGlobal.prisma.shopping_mall_cancellations.count({
      where: {
        OR: [
          { requester_seller_id: seller.id },
          { approver_seller_id: seller.id },
        ],
        ...(body.cancellation_status !== undefined &&
          body.cancellation_status !== null && {
            cancellation_status: body.cancellation_status,
          }),
      },
    }),
  ]);

  const data = cancellations.map((cancellation) => ({
    id: cancellation.id as string & tags.Format<"uuid">,
    cancellation_status: cancellation.cancellation_status,
  }));

  const pages = Math.ceil(total / limit);

  return {
    pagination: {
      current: Number(page),
      limit: Number(limit),
      records: total,
      pages: pages,
    },
    data: data,
  };
}
