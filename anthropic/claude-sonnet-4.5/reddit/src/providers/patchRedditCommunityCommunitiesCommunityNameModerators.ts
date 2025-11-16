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

export async function patchRedditCommunityCommunitiesCommunityNameModerators(props: {
  communityName: string;
  body: IRedditCommunityCommunityModerator.IRequest;
}): Promise<IPageIRedditCommunityCommunityModerator.ISummary> {
  const community =
    await MyGlobal.prisma.reddit_community_communities.findUnique({
      where: { name: props.communityName },
    });

  if (!community || community.deleted_at !== null) {
    throw new HttpException("Community not found", 404);
  }

  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 100;
  const skip = (page - 1) * limit;

  const buildWhereCondition = () => {
    const conditions: Record<string, unknown> = {
      community_id: community.id,
    };

    if (props.body.search) {
      conditions.member = {
        username: {
          contains: props.body.search,
          mode: "insensitive",
        },
        deleted_at: null,
      };
    } else {
      conditions.member = {
        deleted_at: null,
      };
    }

    return conditions;
  };

  const whereCondition = buildWhereCondition();

  const buildOrderBy = () => {
    const sort = props.body.sort ?? "assigned_at_desc";

    if (sort === "assigned_at_asc") {
      return { created_at: "asc" as const };
    } else if (sort === "assigned_at_desc") {
      return { created_at: "desc" as const };
    } else if (sort === "username_asc") {
      return { member: { username: "asc" as const } };
    } else if (sort === "username_desc") {
      return { member: { username: "desc" as const } };
    }
    return { created_at: "desc" as const };
  };

  const orderBy = buildOrderBy();

  const [moderatorAssignments, total] = await Promise.all([
    MyGlobal.prisma.reddit_community_community_moderators.findMany({
      where: whereCondition,
      skip,
      take: limit,
      orderBy,
      include: {
        member: true,
      },
    }),
    MyGlobal.prisma.reddit_community_community_moderators.count({
      where: whereCondition,
    }),
  ]);

  const data = moderatorAssignments.map((assignment) => ({
    id: assignment.member.id as string & tags.Format<"uuid">,
    username: assignment.member.username,
    display_name:
      assignment.member.display_name === null
        ? undefined
        : assignment.member.display_name,
    avatar_url:
      assignment.member.avatar_url === null
        ? undefined
        : (assignment.member.avatar_url as string & tags.Format<"uri">),
    post_karma: assignment.member.post_karma,
    comment_karma: assignment.member.comment_karma,
    created_at: toISOStringSafe(assignment.member.created_at),
  }));

  const totalPages = Math.ceil(total / limit);

  return {
    pagination: {
      current: page - 1,
      limit,
      records: total,
      pages: totalPages,
    },
    data,
  };
}
