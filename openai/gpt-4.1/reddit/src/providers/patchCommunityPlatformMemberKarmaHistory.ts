import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { ICommunityPlatformKarmaHistory } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformKarmaHistory";
import { IPageICommunityPlatformKarmaHistory } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformKarmaHistory";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { MemberPayload } from "../decorators/payload/MemberPayload";

export async function patchCommunityPlatformMemberKarmaHistory(props: {
  member: MemberPayload;
  body: ICommunityPlatformKarmaHistory.IRequest;
}): Promise<IPageICommunityPlatformKarmaHistory> {
  const { member, body } = props;

  // Members can only access their own karma history
  const member_id = body.member_id ?? member.id;
  if (member_id !== member.id) {
    throw new HttpException(
      "Unauthorized: You can only access your own karma history.",
      403,
    );
  }

  const {
    community_id,
    event_type,
    after,
    before,
    sort = "event_time-desc",
    page = 1,
    limit = 20,
  } = body;

  const where = {
    community_platform_member_id: member_id,
    deleted_at: null,
    ...(community_id !== undefined &&
      community_id !== null && {
        community_platform_community_id: community_id,
      }),
    ...(event_type !== undefined && {
      event_type,
    }),
    ...(after !== undefined || before !== undefined
      ? {
          event_time: {
            ...(after !== undefined && { gte: after }),
            ...(before !== undefined && { lt: before }),
          },
        }
      : {}),
  };

  const orderBy =
    sort === "event_time-asc"
      ? { event_time: "asc" as Prisma.SortOrder }
      : { event_time: "desc" as Prisma.SortOrder };

  const skip = (Number(page) - 1) * Number(limit);
  const take = Number(limit);

  const [records, total] = await Promise.all([
    MyGlobal.prisma.community_platform_karma_history.findMany({
      where,
      orderBy,
      skip,
      take,
    }),
    MyGlobal.prisma.community_platform_karma_history.count({ where }),
  ]);

  return {
    pagination: {
      current: Number(page),
      limit: Number(limit),
      records: total,
      pages: Math.ceil(total / Number(limit)),
    },
    data: records.map((row) => ({
      id: row.id,
      community_platform_member_id: row.community_platform_member_id,
      community_platform_community_id:
        row.community_platform_community_id !== undefined
          ? row.community_platform_community_id
          : undefined,
      community_platform_post_id:
        row.community_platform_post_id !== undefined
          ? row.community_platform_post_id
          : undefined,
      community_platform_comment_id:
        row.community_platform_comment_id !== undefined
          ? row.community_platform_comment_id
          : undefined,
      event_type: row.event_type,
      change_amount: row.change_amount,
      event_context: row.event_context,
      event_time: toISOStringSafe(row.event_time),
      created_at: toISOStringSafe(row.created_at),
      deleted_at:
        row.deleted_at !== undefined && row.deleted_at !== null
          ? toISOStringSafe(row.deleted_at)
          : row.deleted_at,
    })),
  };
}
