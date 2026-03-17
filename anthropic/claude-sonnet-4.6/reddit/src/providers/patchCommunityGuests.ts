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
import { CommunityGuestAtSummaryTransformer } from "../transformers/CommunityGuestAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchCommunityGuests(props: {
  body: ICommunityGuest.IRequest;
}): Promise<IPageICommunityGuest.ISummary> {
  const { body } = props;
  const page = body.page ?? 1;
  const limit = body.limit ?? 20;
  const skip = (page - 1) * limit;
  const orderBy = ((): Prisma.community_guestsOrderByWithRelationInput => {
    const sort = body.sort ?? "created_at DESC";
    const parts = sort.trim().split(/\s+/);
    const field = parts[0] ?? "created_at";
    const direction =
      (parts[1] ?? "DESC").toUpperCase() === "ASC"
        ? ("asc" as const)
        : ("desc" as const);
    if (field === "updated_at") return { updated_at: direction };
    if (field === "fingerprint") return { fingerprint: direction };
    return { created_at: direction };
  })();
  const whereInput = {
    ...(body.fingerprint !== undefined && {
      fingerprint: { contains: body.fingerprint },
    }),
    ...(body.createdAt !== undefined && {
      created_at: {
        ...(body.createdAt.gte != null && { gte: body.createdAt.gte }),
        ...(body.createdAt.lte != null && { lte: body.createdAt.lte }),
      },
    }),
    ...(body.updatedAt !== undefined && {
      updated_at: {
        ...(body.updatedAt.gte != null && { gte: body.updatedAt.gte }),
        ...(body.updatedAt.lte != null && { lte: body.updatedAt.lte }),
      },
    }),
  } satisfies Prisma.community_guestsWhereInput;
  const data = await MyGlobal.prisma.community_guests.findMany({
    where: whereInput,
    skip,
    take: limit,
    orderBy,
    ...CommunityGuestAtSummaryTransformer.select(),
  });
  const total = await MyGlobal.prisma.community_guests.count({
    where: whereInput,
  });
  return {
    data: await ArrayUtil.asyncMap(
      data,
      CommunityGuestAtSummaryTransformer.transform,
    ),
    pagination: {
      current: page,
      limit,
      records: total,
      pages: total === 0 ? 0 : Math.ceil(total / limit),
    } satisfies IPage.IPagination,
  };
}
