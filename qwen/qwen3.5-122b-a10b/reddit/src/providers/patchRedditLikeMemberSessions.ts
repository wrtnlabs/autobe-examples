import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIRedditLikeGuestSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditLikeGuestSession";
import { IRedditLikeGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeGuest";
import { IRedditLikeGuestSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeGuestSession";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchRedditLikeMemberSessions(props: {
  member: MemberPayload;
  body: IRedditLikeGuestSession.IRequest;
}): Promise<IPageIRedditLikeGuestSession.ISummary> {
  // Calculate pagination
  const page = props.body.page ?? 1;
  const limit = Math.min(Math.max(props.body.limit ?? 10, 1), 100);
  const skip = (page - 1) * limit;
  // Build where clause - filter by authenticated member's sessions
  const whereInput: Prisma.reddit_like_member_sessionsWhereInput = {
    reddit_like_member_id: props.member.id,
  };
  // Apply IP filter
  if (props.body.ip !== undefined) {
    whereInput.ip = props.body.ip;
  }
  // Apply created_at range filter
  if (
    props.body.created_at_from !== undefined ||
    props.body.created_at_to !== undefined
  ) {
    whereInput.created_at = {};
    if (props.body.created_at_from !== undefined) {
      whereInput.created_at.gte = new Date(props.body.created_at_from);
    }
    if (props.body.created_at_to !== undefined) {
      whereInput.created_at.lte = new Date(props.body.created_at_to);
    }
  }
  // Apply expired_at range filter
  if (
    props.body.expired_at_from !== undefined ||
    props.body.expired_at_to !== undefined
  ) {
    whereInput.expired_at = {};
    if (props.body.expired_at_from !== undefined) {
      whereInput.expired_at.gte = new Date(props.body.expired_at_from);
    }
    if (props.body.expired_at_to !== undefined) {
      whereInput.expired_at.lte = new Date(props.body.expired_at_to);
    }
  }
  // Build orderBy
  const orderByInput: Prisma.reddit_like_member_sessionsOrderByWithRelationInput =
    props.body.sort && props.body.order
      ? { [props.body.sort]: props.body.order }
      : { created_at: "desc" };
  // Query member sessions
  const records = await MyGlobal.prisma.reddit_like_member_sessions.findMany({
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
  // Get total count
  const total = await MyGlobal.prisma.reddit_like_member_sessions.count({
    where: whereInput,
  });
  // Transform records to guest session summary format
  const data: IRedditLikeGuestSession.ISummary[] = await ArrayUtil.asyncMap(
    records,
    async (record) => {
      const sessionSummary: IRedditLikeGuestSession.ISummary = {
        id: record.id,
        reddit_like_guest: {
          id: props.member.id,
          created_at: toISOStringSafe(record.created_at),
          updated_at: toISOStringSafe(record.created_at),
          deleted_at: null,
        },
        ip: record.ip,
        href: record.href ?? null,
        referrer: record.referrer ?? null,
        created_at: toISOStringSafe(record.created_at),
        updated_at: toISOStringSafe(record.created_at),
        expired_at: toISOStringSafe(record.expired_at),
      };
      return sessionSummary;
    },
  );
  const pagination: IPage.IPagination = {
    current: page,
    limit: limit,
    records: total,
    pages: Math.ceil(total / limit),
  };
  const result: IPageIRedditLikeGuestSession.ISummary = {
    pagination: pagination,
    data: data,
  };
  return result;
}
