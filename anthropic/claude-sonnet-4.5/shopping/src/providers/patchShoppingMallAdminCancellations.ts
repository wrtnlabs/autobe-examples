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
import { AdminPayload } from "../decorators/payload/AdminPayload";

export async function patchShoppingMallAdminCancellations(props: {
  admin: AdminPayload;
  body: IShoppingMallCancellation.IRequest;
}): Promise<IPageIShoppingMallCancellation> {
  const { body } = props;

  const page = body.page ?? 1;
  const limit = body.limit ?? 10;
  const skip = (page - 1) * limit;

  const [cancellations, total] = await Promise.all([
    MyGlobal.prisma.shopping_mall_cancellations.findMany({
      where: {
        ...(body.cancellation_status !== undefined &&
          body.cancellation_status !== null && {
            cancellation_status: body.cancellation_status,
          }),
      },
      orderBy: { created_at: "desc" },
      skip: skip,
      take: limit,
      select: {
        id: true,
        cancellation_status: true,
      },
    }),
    MyGlobal.prisma.shopping_mall_cancellations.count({
      where: {
        ...(body.cancellation_status !== undefined &&
          body.cancellation_status !== null && {
            cancellation_status: body.cancellation_status,
          }),
      },
    }),
  ]);

  const pages = Math.ceil(total / limit);

  return {
    pagination: {
      current: Number(page),
      limit: Number(limit),
      records: total,
      pages: pages,
    },
    data: cancellations.map((c) => ({
      id: c.id as string & tags.Format<"uuid">,
      cancellation_status: c.cancellation_status,
    })),
  };
}
