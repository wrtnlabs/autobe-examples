import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { ICommunityPortalSubscription } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPortalSubscription";
import { IPageICommunityPortalSubscription } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPortalSubscription";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { MemberPayload } from "../decorators/payload/MemberPayload";

export async function patchCommunityPortalMemberSubscriptions(props: {
  member: MemberPayload;
  body: ICommunityPortalSubscription.IRequest;
}): Promise<IPageICommunityPortalSubscription.ISummary> {
  const { member, body } = props;

  const limit = Number(body.limit ?? 20) as number;
  const offset = Number(body.offset ?? 0) as number;

  if (limit <= 0)
    throw new HttpException("Bad Request: limit must be positive", 400);
  if (offset < 0)
    throw new HttpException("Bad Request: offset must be non-negative", 400);

  const activeOnly =
    body.activeOnly === undefined ? true : Boolean(body.activeOnly);

  if (body.communityId !== undefined && body.communityId !== null) {
    const community =
      await MyGlobal.prisma.community_portal_communities.findUnique({
        where: { id: body.communityId },
      });
    if (!community) throw new HttpException("Not Found", 404);
  }

  const [rows, total] = await Promise.all([
    MyGlobal.prisma.community_portal_subscriptions.findMany({
      where: {
        ...(activeOnly ? { deleted_at: null } : {}),
        ...(body.communityId !== undefined && body.communityId !== null
          ? { community_id: body.communityId }
          : {}),
        user_id: member.id,
      },
      orderBy:
        body.sort === "created_at.asc"
          ? { created_at: "asc" as const }
          : { created_at: "desc" as const },
      skip: offset,
      take: limit,
      select: { id: true, user_id: true, community_id: true, created_at: true },
    }),
    MyGlobal.prisma.community_portal_subscriptions.count({
      where: {
        ...(activeOnly ? { deleted_at: null } : {}),
        ...(body.communityId !== undefined && body.communityId !== null
          ? { community_id: body.communityId }
          : {}),
        user_id: member.id,
      },
    }),
  ]);

  return {
    pagination: {
      current: Number(offset),
      limit: Number(limit),
      records: Number(total),
      pages: Math.ceil(Number(total) / Number(limit)),
    },
    data: rows.map((r) => ({
      id: r.id as string & tags.Format<"uuid">,
      user_id: r.user_id as string & tags.Format<"uuid">,
      community_id: r.community_id as string & tags.Format<"uuid">,
      created_at: toISOStringSafe(r.created_at),
    })),
  };
}
