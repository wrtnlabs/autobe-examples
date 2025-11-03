import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { ICommunityBbsCommunityMemberSession } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityBbsCommunityMemberSession";
import { IPageICommunityBbsCommunityMemberSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityBbsCommunityMemberSession";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { ICommunityBbsCommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityBbsCommunityMember";
import { CommunitymemberPayload } from "../decorators/payload/CommunitymemberPayload";

export async function patchCommunityBbsCommunityMemberCommunityMembersUsernameSessions(props: {
  communityMember: CommunitymemberPayload;
  username: string;
  body: ICommunityBbsCommunityMemberSession.IRequest;
}): Promise<IPageICommunityBbsCommunityMemberSession.ISummary> {
  const { communityMember, username, body } = props;

  // Resolve target member by username and ensure not soft-deleted
  const target = await MyGlobal.prisma.community_bbs_communitymember.findFirst({
    where: {
      username: username,
      deleted_at: null,
      status: { not: "deleted_soft" },
    },
    select: {
      id: true,
      username: true,
      display_name: true,
      karma: true,
      created_at: true,
      updated_at: true,
    },
  });

  if (!target) {
    throw new HttpException("Not Found", 404);
  }

  // Authorization: only owner may view sessions
  if (communityMember.id !== target.id) {
    throw new HttpException("Unauthorized", 403);
  }

  // Prepare pagination params
  const limit = Number(body.limit ?? 25);
  const safeLimit = Math.max(1, Math.min(200, limit));
  const page = Number(body.page ?? 1);

  // Prepare current time for activeOnly filter
  const now = toISOStringSafe(new Date());

  // Build where clause inline for Prisma operations
  const whereClauseBase = {
    community_bbs_communitymember_id: target.id,
    ...(body.ip !== undefined && body.ip !== null && { ip: body.ip }),
    ...(((body.createdAtFrom !== undefined && body.createdAtFrom !== null) ||
      (body.createdAtTo !== undefined && body.createdAtTo !== null)) && {
      created_at: {
        ...(body.createdAtFrom !== undefined &&
          body.createdAtFrom !== null && { gte: body.createdAtFrom }),
        ...(body.createdAtTo !== undefined &&
          body.createdAtTo !== null && { lt: body.createdAtTo }),
      },
    }),
    ...(body.activeOnly === true && {
      OR: [{ expired_at: null }, { expired_at: { gt: now } }],
    }),
  };

  // Fetch results and count in parallel
  const [rows, total] = await Promise.all([
    MyGlobal.prisma.community_bbs_communitymember_sessions.findMany({
      where: whereClauseBase,
      orderBy: { created_at: "desc" },
      ...(body.cursor !== undefined && body.cursor !== null
        ? { cursor: { id: body.cursor }, skip: 1 }
        : {}),
      take: safeLimit,
      select: {
        id: true,
        community_bbs_communitymember_id: true,
        ip: true,
        href: true,
        referrer: true,
        created_at: true,
        expired_at: true,
      },
    }),
    MyGlobal.prisma.community_bbs_communitymember_sessions.count({
      where: whereClauseBase,
    }),
  ]);

  // Map DB rows to DTO summaries
  const data = rows.map((r) => ({
    id: r.id,
    member: {
      id: target.id,
      username: target.username,
      display_name:
        target.display_name === null ? undefined : target.display_name,
      karma: target.karma,
      created_at: toISOStringSafe(target.created_at),
      updated_at: toISOStringSafe(target.updated_at),
    },
    ip: r.ip,
    href: r.href === null ? undefined : r.href,
    referrer: r.referrer === null ? undefined : r.referrer,
    created_at: toISOStringSafe(r.created_at),
    expired_at: r.expired_at ? toISOStringSafe(r.expired_at) : null,
  }));

  const pagination = {
    current: Number(page),
    limit: Number(safeLimit),
    records: Number(total),
    pages: Number(Math.ceil(total / safeLimit)),
  };

  return {
    pagination,
    data,
  };
}
