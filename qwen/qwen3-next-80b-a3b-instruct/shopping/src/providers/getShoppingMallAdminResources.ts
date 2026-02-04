import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPageIShoppingMallChannel } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallChannel";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IShoppingMallChannel } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallChannel";
import { AdminPayload } from "../decorators/payload/AdminPayload";

export async function getShoppingMallAdminResources(props: {
  admin: AdminPayload;
}): Promise<IPageIShoppingMallChannel> {
  // Default pagination values since no request body parameters are defined in operation spec
  const page = 1;
  const limit = 100;
  const skip = (page - 1) * limit;
  // Query all shopping_mall_channels records
  const data = await MyGlobal.prisma.shopping_mall_channels.findMany({
    skip,
    take: limit,
    orderBy: {
      id: "asc",
    },
  });
  // Count total records
  const total = await MyGlobal.prisma.shopping_mall_channels.count();
  // Transform to response format
  return {
    data: data.map((channel) => ({
      id: channel.id as string & tags.Format<"uuid">,
    })),
    pagination: {
      current: page as number & tags.Type<"int32"> & tags.Minimum<0>,
      limit: limit as number & tags.Type<"int32"> & tags.Minimum<0>,
      records: total as number & tags.Type<"int32"> & tags.Minimum<0>,
      pages: Math.ceil(total / limit) as number &
        tags.Type<"int32"> &
        tags.Minimum<0>,
    } satisfies IPage.IPagination,
  };
}
