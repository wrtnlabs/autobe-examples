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
import { IShoppingMallChannel } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallChannel";
import { IPageIShoppingMallChannel } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallChannel";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { AdminPayload } from "../decorators/payload/AdminPayload";

export async function patchShoppingMallAdminChannels(props: {
  admin: AdminPayload;
  body: IShoppingMallChannel.IRequest;
}): Promise<IPageIShoppingMallChannel.ISummary> {
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 10;
  const skip = (page - 1) * limit;
  // Build where condition with filters from body
  const whereInput = {
    ...(props.body.name && {
      name: { contains: props.body.name, mode: "insensitive" },
    }),
    ...(props.body.status && {
      status: props.body.status,
    }),
    ...(props.body.createdAfter && {
      created_at: { gte: props.body.createdAfter },
    }),
    ...(props.body.createdBefore && {
      created_at: { lt: props.body.createdBefore },
    }),
  } satisfies Prisma.shopping_mall_channelsWhereInput;
  // Fetch paginated data - select all fields required by IShoppingMallChannel.ISummary
  const data = await MyGlobal.prisma.shopping_mall_channels.findMany({
    where: whereInput,
    skip,
    take: limit,
    orderBy: { created_at: "desc" },
    select: {
      id: true,
      name: true,
      description: true,
    },
  });
  // Count total records
  const total = await MyGlobal.prisma.shopping_mall_channels.count({
    where: whereInput,
  });
  // Transform each item to match IShoppingMallChannel.ISummary
  const transformedData = data.map((channel) => ({
    id: channel.id,
    name: channel.name,
    description: channel.description !== null ? channel.description : undefined,
  }));
  // Return with correct type structure
  return {
    data: transformedData,
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: Math.ceil(total / limit),
    } satisfies IPage.IPagination,
  };
}
