import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { ICommunityForumCommunityModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityForumCommunityModerator";
import { IPageICommunityForumCommunityModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityForumCommunityModerator";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { ICommunityForumCommunityUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityForumCommunityUser";
import { AdministratorPayload } from "../decorators/payload/AdministratorPayload";

export async function patchCommunityForumAdministratorModerators(props: {
  administrator: AdministratorPayload;
  body: ICommunityForumCommunityModerator.IRequest;
}): Promise<IPageICommunityForumCommunityModerator.ISummary> {
  // Parse pagination parameters with defaults
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 100;
  const skip = (page - 1) * limit;

  // Parse sorting parameters with defaults
  const sortBy = props.body.sort_by ?? "created_at";
  const order = props.body.order ?? "desc";

  // Build Prisma orderBy clause
  const orderBy: Prisma.community_forum_moderatorsOrderByWithRelationInput = {
    [sortBy]: order,
  };

  // Build search filter if provided
  const search = props.body.search;

  // Create where condition for search
  const where: Prisma.community_forum_moderatorsWhereInput = {};

  if (search) {
    where.user = {
      OR: [
        { username: { contains: search, mode: "insensitive" } },
        { email: { contains: search, mode: "insensitive" } },
      ],
    };
  }

  // Execute queries for data and count
  const [moderators, total] = await Promise.all([
    MyGlobal.prisma.community_forum_moderators.findMany({
      where,
      skip,
      take: limit,
      orderBy,
      include: {
        user: true,
      },
    }),
    MyGlobal.prisma.community_forum_moderators.count({
      where,
    }),
  ]);

  // Transform to API response format
  const data = moderators.map((moderator) => ({
    id: moderator.id,
    community_forum_user_id: moderator.community_forum_user_id,
    user: {
      id: moderator.user.id,
      username: moderator.user.username,
    },
    created_at: toISOStringSafe(moderator.created_at),
    updated_at: toISOStringSafe(moderator.updated_at),
  }));

  // Calculate pagination metadata
  const totalPages = Math.ceil(total / limit);

  return {
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: totalPages,
    },
    data,
  };
}
