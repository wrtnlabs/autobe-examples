import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { ICommunityPlatformKarmaAward } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformKarmaAward";
import { IPageICommunityPlatformKarmaAward } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformKarmaAward";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { AdminPayload } from "../decorators/payload/AdminPayload";

export async function patchCommunityPlatformAdminKarmaAwards(props: {
  admin: AdminPayload;
  body: ICommunityPlatformKarmaAward.IRequest;
}): Promise<IPageICommunityPlatformKarmaAward.ISummary> {
  const { body } = props;

  const DEFAULT_PAGE = 1;
  const DEFAULT_LIMIT = 20;
  const MAX_LIMIT = 50;
  const page = body.page ?? DEFAULT_PAGE;
  let limit = body.limit ?? DEFAULT_LIMIT;
  if (limit < 1) limit = 1;
  if (limit > MAX_LIMIT) limit = MAX_LIMIT;

  const sortableFields = ["event_time", "award_type"];
  const sortBy =
    typeof body.sort_by === "string" && sortableFields.includes(body.sort_by)
      ? body.sort_by
      : "event_time";
  const sortDirection = body.sort_direction === "asc" ? "asc" : "desc";

  const where = {
    deleted_at: null,
    ...(body.member_id !== undefined &&
      body.member_id !== null && {
        community_platform_member_id: body.member_id,
      }),
    ...(body.community_id !== undefined &&
      body.community_id !== null && {
        community_platform_community_id: body.community_id,
      }),
    ...(body.award_type !== undefined &&
      body.award_type !== null && {
        award_type: body.award_type,
      }),
    ...((body.event_time_from !== undefined && body.event_time_from !== null) ||
    (body.event_time_to !== undefined && body.event_time_to !== null)
      ? {
          event_time: {
            ...(body.event_time_from !== undefined &&
              body.event_time_from !== null && {
                gte: body.event_time_from,
              }),
            ...(body.event_time_to !== undefined &&
              body.event_time_to !== null && {
                lte: body.event_time_to,
              }),
          },
        }
      : {}),
  };

  const [rows, total] = await Promise.all([
    MyGlobal.prisma.community_platform_karma_awards.findMany({
      where,
      orderBy: { [sortBy]: sortDirection },
      skip: (page - 1) * limit,
      take: limit,
      select: {
        id: true,
        community_platform_member_id: true,
        community_platform_community_id: true,
        award_type: true,
        award_reason: true,
        event_time: true,
      },
    }),
    MyGlobal.prisma.community_platform_karma_awards.count({ where }),
  ]);

  const data = rows.map((item) => ({
    id: item.id,
    community_platform_member_id: item.community_platform_member_id,
    community_platform_community_id:
      item.community_platform_community_id !== undefined
        ? item.community_platform_community_id
        : undefined,
    award_type: item.award_type,
    award_reason:
      item.award_reason !== undefined ? item.award_reason : undefined,
    event_time: toISOStringSafe(item.event_time) as string &
      tags.Format<"date-time">,
  }));

  const pages = Math.ceil(total / limit);
  return {
    pagination: {
      current: page satisfies number as number as number &
        tags.Type<"int32"> &
        tags.Minimum<0>,
      limit: limit satisfies number as number as number &
        tags.Type<"int32"> &
        tags.Minimum<0>,
      records: total satisfies number as number as number &
        tags.Type<"int32"> &
        tags.Minimum<0>,
      pages: pages satisfies number as number as number &
        tags.Type<"int32"> &
        tags.Minimum<0>,
    },
    data,
  };
}
