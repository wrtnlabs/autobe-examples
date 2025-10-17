import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IRedditCommunityCommunityModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunityModerator";
import { IPageIRedditCommunityCommunityModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditCommunityCommunityModerator";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { AdminPayload } from "../decorators/payload/AdminPayload";

export async function patchRedditCommunityAdminCommunitiesCommunityIdCommunityModerators(props: {
  admin: AdminPayload;
  communityId: string & tags.Format<"uuid">;
  body: IRedditCommunityCommunityModerator.IRequest;
}): Promise<IPageIRedditCommunityCommunityModerator.ISummary> {
  const { admin, communityId, body } = props;

  const page = (body.page ?? 1) as number &
    tags.Type<"int32"> &
    tags.Minimum<0> as number;
  const limit = (body.limit ?? 10) as number &
    tags.Type<"int32"> &
    tags.Minimum<0> as number;
  const skip = (page - 1) * limit;

  const where = {
    community_id: communityId,
    ...(body.member_id !== undefined &&
      body.member_id !== null && { member_id: body.member_id }),
    ...(body.assigned_after !== undefined &&
      body.assigned_after !== null && {
        assigned_at: { gte: body.assigned_after },
      }),
    ...(body.assigned_before !== undefined &&
      body.assigned_before !== null && {
        assigned_at: {
          ...(body.assigned_after !== undefined && body.assigned_after !== null
            ? {}
            : undefined),
          lte: body.assigned_before,
        },
      }),
  };

  const orderValue = (body.order === "asc" ? "asc" : "desc") as "asc" | "desc";

  const orderBy = body.sort_by
    ? { [body.sort_by]: orderValue }
    : { assigned_at: "desc" as "desc" };

  const [results, total] = await Promise.all([
    MyGlobal.prisma.reddit_community_community_moderators.findMany({
      where,
      orderBy,
      skip,
      take: limit,
      select: {
        id: true,
        member_id: true,
        community_id: true,
        assigned_at: true,
      },
    }),
    MyGlobal.prisma.reddit_community_community_moderators.count({ where }),
  ]);

  const data = results.map((r) => ({
    id: r.id,
    member_id: r.member_id,
    community_id: r.community_id,
    assigned_at: toISOStringSafe(r.assigned_at),
  }));

  return {
    pagination: {
      current: Number(page),
      limit: Number(limit),
      records: total,
      pages: Math.ceil(total / limit),
    },
    data,
  };
}
