import { ICommunityGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityGuest";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageICommunityGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityGuest";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchCommunityGuests(props: {
  body: ICommunityGuest.IRequest;
}): Promise<IPageICommunityGuest.ISummary> {
  const page = 1;
  const limit = 100;
  const skip = (page - 1) * limit;
  // No filtering properties exist on IRequest, so use empty where input
  const whereInput: Prisma.community_guestsWhereInput = {};
  // Fetch data
  const data = await MyGlobal.prisma.community_guests.findMany({
    where: whereInput,
    skip,
    take: limit,
    orderBy: {
      created_at: "desc",
      id: "asc",
    },
  });
  // Fetch total count
  const total = await MyGlobal.prisma.community_guests.count({
    where: whereInput,
  });
  // Transform data to ICommunityGuest.ISummary
  const transformed = data.map((record) => ({
    id: record.id,
    device_fingerprint: record.device_fingerprint,
    created_at: toISOStringSafe(record.created_at),
    deleted_at:
      record.deleted_at === null ? null : toISOStringSafe(record.deleted_at),
  }));
  // Return paginated response
  return {
    data: transformed,
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: Math.ceil(total / limit),
    } satisfies IPage.IPagination,
  };
}
