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
import { SuperadminPayload } from "../decorators/payload/SuperadminPayload";

export async function patchShoppingMallSuperAdminChannels(props: {
  superAdmin: SuperadminPayload;
  body: IShoppingMallChannel.IRequest;
}): Promise<IPageIShoppingMallChannel.ISummary> {
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 10;
  const skip = (page - 1) * limit;
  // Build where condition based on IRequest filters
  const whereInput = {
    ...((props.body.createdAfter || props.body.createdBefore) && {
      created_at: {
        ...(props.body.createdAfter && {
          gte: toISOStringSafe(props.body.createdAfter),
        }),
        ...(props.body.createdBefore && {
          lt: toISOStringSafe(props.body.createdBefore),
        }),
      },
    }),
    ...(props.body.name && {
      name: { contains: props.body.name, mode: "insensitive" },
    }),
    ...(props.body.status && { status: props.body.status }),
  } satisfies Prisma.shopping_mall_channelsWhereInput;
  // Fetch paginated data - select required fields for summary
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
  // Count total records matching criteria
  const total = await MyGlobal.prisma.shopping_mall_channels.count({
    where: whereInput,
  });
  // Transform each channel to ISummary (manual construction since no IShoppingMallChannel.ISummary transformer exists)
  const transformedData = data.map((channel) => ({
    name: channel.name,
    id: channel.id,
    description: channel.description === null ? undefined : channel.description,
  }));
  // Return correct structure: data array with pagination
  return {
    data: transformedData,
    pagination: {
      current: page,
      limit,
      records: total,
      pages: Math.ceil(total / limit),
    } satisfies IPage.IPagination,
  };
}
