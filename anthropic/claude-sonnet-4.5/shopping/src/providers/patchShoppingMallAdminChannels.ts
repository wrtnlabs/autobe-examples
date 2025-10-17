import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IShoppingMallChannel } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallChannel";
import { IPageIShoppingMallChannel } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallChannel";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { AdminPayload } from "../decorators/payload/AdminPayload";

export async function patchShoppingMallAdminChannels(props: {
  admin: AdminPayload;
  body: IShoppingMallChannel.IRequest;
}): Promise<IPageIShoppingMallChannel> {
  const { admin, body } = props;

  const page = body.page ?? 0;
  const limit = 20;
  const skip = page * limit;

  const whereCondition = {
    deleted_at: null,
  };

  const [channels, totalRecords] = await Promise.all([
    MyGlobal.prisma.shopping_mall_channels.findMany({
      where: whereCondition,
      orderBy: { created_at: "desc" },
      skip: skip,
      take: limit,
      select: {
        id: true,
        channel_code: true,
        channel_name: true,
      },
    }),
    MyGlobal.prisma.shopping_mall_channels.count({
      where: whereCondition,
    }),
  ]);

  const totalPages = Math.ceil(totalRecords / limit);

  return {
    pagination: {
      current: Number(page),
      limit: Number(limit),
      records: totalRecords,
      pages: totalPages,
    },
    data: channels,
  };
}
