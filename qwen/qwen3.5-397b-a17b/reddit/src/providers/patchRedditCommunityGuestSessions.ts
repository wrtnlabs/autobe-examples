import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIRedditCommunityMemberSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditCommunityMemberSession";
import { IRedditCommunityMemberSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityMemberSession";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { GuestPayload } from "../decorators/payload/GuestPayload";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchRedditCommunityGuestSessions(props: {
  guest: GuestPayload;
  body: IRedditCommunityMemberSession.IRequest;
}): Promise<IPageIRedditCommunityMemberSession.ISummary> {
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 20;
  const skip = (page - 1) * limit;
  const sortParts = (props.body.sort ?? "created_at:desc").split(":");
  const sortField = sortParts[0];
  const sortDirection = (sortParts[1] ?? "desc") as "asc" | "desc";
  const whereConditions: Prisma.reddit_community_guest_sessionsWhereInput[] = [
    { reddit_community_guest_id: props.guest.id },
  ];
  if (props.body.expired !== undefined) {
    if (props.body.expired) {
      whereConditions.push({ expired_at: { lt: new Date() } });
    } else {
      whereConditions.push({ expired_at: { gte: new Date() } });
    }
  }
  if (props.body.createdAtFrom !== undefined) {
    whereConditions.push({
      created_at: { gte: new Date(props.body.createdAtFrom) },
    });
  }
  if (props.body.createdAtTo !== undefined) {
    whereConditions.push({
      created_at: { lte: new Date(props.body.createdAtTo) },
    });
  }
  if (props.body.ip !== undefined) {
    whereConditions.push({ ip: { startsWith: props.body.ip } });
  }
  const whereInput: Prisma.reddit_community_guest_sessionsWhereInput =
    whereConditions.length === 1
      ? whereConditions[0]
      : { AND: whereConditions };
  const orderByInput: Prisma.reddit_community_guest_sessionsOrderByWithRelationInput =
    {
      [sortField]: sortDirection,
    };
  const records =
    await MyGlobal.prisma.reddit_community_guest_sessions.findMany({
      where: whereInput,
      skip,
      take: limit,
      orderBy: orderByInput,
      select: {
        id: true,
        ip: true,
        href: true,
        referrer: true,
        created_at: true,
        expired_at: true,
      },
    });
  const total = await MyGlobal.prisma.reddit_community_guest_sessions.count({
    where: whereInput,
  });
  return {
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: Math.ceil(total / limit),
    } satisfies IPage.IPagination,
    data: records.map(
      (record) =>
        ({
          id: record.id,
          ip: record.ip,
          href: record.href,
          referrer: record.referrer,
          created_at: toISOStringSafe(record.created_at),
          expired_at: toISOStringSafe(record.expired_at),
        }) satisfies IRedditCommunityMemberSession.ISummary,
    ),
  };
}
