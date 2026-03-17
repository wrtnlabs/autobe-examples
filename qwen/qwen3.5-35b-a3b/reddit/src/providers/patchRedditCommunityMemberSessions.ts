import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIRedditCommunityMemberSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditCommunityMemberSession";
import { IRedditCommunityDateTimeRange } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityDateTimeRange";
import { IRedditCommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityMember";
import { IRedditCommunityMemberSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityMemberSession";
import { IRedditCommunityUserProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityUserProfile";
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

export async function patchRedditCommunityMemberSessions(props: {
  member: MemberPayload;
  body: IRedditCommunityMemberSession.IRequest;
}): Promise<IPageIRedditCommunityMemberSession.ISummary> {
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 20;
  const skip = (page - 1) * limit;
  const whereInput: Prisma.reddit_community_member_sessionsWhereInput = {
    member_id: props.member.id,
    deleted_at: props.body.deleted_at === true ? undefined : null,
  };
  if (props.body.created_at) {
    const createdAtRange = props.body.created_at;
    whereInput.created_at = {} as Prisma.DateTimeFilter;
    if (createdAtRange.gte) {
      whereInput.created_at.gte = createdAtRange.gte;
    }
    if (createdAtRange.lte) {
      whereInput.created_at.lte = createdAtRange.lte;
    }
  }
  if (props.body.expired_at) {
    const expiredAtRange = props.body.expired_at;
    whereInput.expired_at = {} as Prisma.DateTimeFilter;
    if (expiredAtRange.gte) {
      whereInput.expired_at.gte = expiredAtRange.gte;
    }
    if (expiredAtRange.lte) {
      whereInput.expired_at.lte = expiredAtRange.lte;
    }
  }
  if (props.body.ip) {
    whereInput.ip = props.body.ip;
  }
  const orderByInput = (
    props.body.sort === "ip"
      ? { ip: (props.body.direction ?? "desc") as "asc" | "desc" }
      : props.body.sort === "expired_at"
        ? { expired_at: (props.body.direction ?? "desc") as "asc" | "desc" }
        : { created_at: (props.body.direction ?? "desc") as "asc" | "desc" }
  ) satisfies Prisma.reddit_community_member_sessionsOrderByWithRelationInput;
  const data = await MyGlobal.prisma.reddit_community_member_sessions.findMany({
    where: whereInput,
    skip,
    take: limit,
    orderBy: orderByInput,
    include: {
      member: {
        select: {
          id: true,
          username: true,
          created_at: true,
        },
      },
    },
  });
  const total = await MyGlobal.prisma.reddit_community_member_sessions.count({
    where: whereInput,
  });
  const transformedData = await ArrayUtil.asyncMap(data, async (session) => {
    const member = session.member;
    return {
      id: session.id,
      member: {
        id: member.id,
        username: member.username,
        created_at: toISOStringSafe(member.created_at),
      },
      ip: session.ip,
      href: session.href,
      referrer: session.referrer,
      created_at: toISOStringSafe(session.created_at),
      updated_at: toISOStringSafe(session.updated_at),
      expired_at: toISOStringSafe(session.expired_at),
    } satisfies IRedditCommunityMemberSession.ISummary;
  });
  return {
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: Math.ceil(total / limit),
    } satisfies IPage.IPagination,
    data: transformedData,
  } satisfies IPageIRedditCommunityMemberSession.ISummary;
}
