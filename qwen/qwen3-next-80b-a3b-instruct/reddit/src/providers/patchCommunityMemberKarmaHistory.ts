import { ICommunityKarmaHistory } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityKarmaHistory";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageICommunityKarmaHistory } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityKarmaHistory";
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

export async function patchCommunityMemberKarmaHistory(props: {
  member: MemberPayload;
  body: ICommunityKarmaHistory.IRequest;
}): Promise<IPageICommunityKarmaHistory.ISummary> {
  // Since IRequest is an empty object {}, we have no access to page, limit, source_type, or reason
  // These are query parameters processed by NestJS externally, but not exposed in props
  // Implementation: Return all karma history for the authenticated user, ordered by created_at DESC
  // Hardcode pagination: page=1, limit=100 (max sensible value to avoid excessive data)
  const page = 1;
  const limit = 100;
  const skip = (page - 1) * limit;
  // Only filter by mem_id (available from props)
  const whereClause: Prisma.community_karma_historiesWhereInput = {
    mem_id: props.member.id,
  };
  const data = await MyGlobal.prisma.community_karma_histories.findMany({
    where: whereClause,
    skip,
    take: limit,
    orderBy: { created_at: "desc" },
    select: {
      id: true,
      source_type: true,
      source_id: true,
      delta_amount: true,
      reason: true,
      created_at: true,
    },
  });
  const total = await MyGlobal.prisma.community_karma_histories.count({
    where: whereClause,
  });
  return {
    data: data.map((item) => ({
      id: item.id as string & tags.Format<"uuid">,
      source_type: typia.assert<"post" | "comment">(item.source_type),
      source_id: item.source_id as (string & tags.Format<"uuid">) | null,
      delta_amount: item.delta_amount,
      reason: typia.assert<
        | "upvote_released"
        | "downvote_released"
        | "upvote_removed"
        | "downvote_removed"
      >(item.reason),
      created_at: toISOStringSafe(item.created_at),
    })),
    pagination: {
      current: page as number & tags.Type<"int32"> & tags.Minimum<0>,
      limit: limit as number & tags.Type<"int32"> & tags.Minimum<0>,
      records: total as number & tags.Type<"int32"> & tags.Minimum<0>,
      pages: Math.ceil(total / limit) as number &
        tags.Type<"int32"> &
        tags.Minimum<0>,
    },
  };
}
