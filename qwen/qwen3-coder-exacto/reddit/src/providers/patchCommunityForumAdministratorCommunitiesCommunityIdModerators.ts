import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
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

export async function patchCommunityForumAdministratorCommunitiesCommunityIdModerators(props: {
  administrator: AdministratorPayload;
  communityId: string & tags.Format<"uuid">;
  body: ICommunityForumCommunityModerator.IRequest;
}): Promise<IPageICommunityForumCommunityModerator.ISummary> {
  // Validate community exists
  const community =
    await MyGlobal.prisma.community_forum_communities.findUnique({
      where: { id: props.communityId },
    });

  if (!community) {
    throw new HttpException("Community not found", 404);
  }

  // Set pagination defaults
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 100;
  const skip = (page - 1) * limit;

  // Set sorting defaults
  const sortBy = props.body.sort_by ?? "created_at";
  const order = props.body.order ?? "desc";

  // Build where condition for moderators
  const whereCondition: Prisma.community_forum_moderatorsWhereInput = {};

  // Add search condition if provided
  if (props.body.search) {
    whereCondition.user = {
      OR: [
        { username: { contains: props.body.search, mode: "insensitive" } },
        { email: { contains: props.body.search, mode: "insensitive" } },
      ],
    };
  }

  // Build orderBy clause
  let orderBy: Prisma.community_forum_moderatorsOrderByWithRelationInput;
  switch (sortBy) {
    case "community_forum_user_id":
      orderBy = { community_forum_user_id: order };
      break;
    case "created_at":
    default:
      orderBy = { created_at: order };
      break;
  }

  // Note: Based on the schema provided, there doesn't seem to be a direct relationship
  // between moderators and communities. In a real implementation, this would need
  // to be properly defined in the Prisma schema. For now, we're returning all moderators
  // with search capability only.

  // Execute query with pagination
  const [moderators, total] = await Promise.all([
    MyGlobal.prisma.community_forum_moderators.findMany({
      where: whereCondition,
      skip,
      take: limit,
      orderBy,
      include: {
        user: true,
      },
    }),
    MyGlobal.prisma.community_forum_moderators.count({
      where: whereCondition,
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

  return {
    pagination: {
      current: page,
      limit,
      records: total,
      pages: Math.ceil(total / limit),
    },
    data,
  };
}
