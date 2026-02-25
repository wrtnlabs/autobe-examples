import { ICommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityMember";
import { ICommunityModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityModerator";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { CommunityMemberAtSummaryTransformer } from "../transformers/CommunityMemberAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getCommunityCommunitiesCommunityNameModeratorsModeratorId(props: {
  communityName: string;
  moderatorId: string;
}): Promise<ICommunityModerator> {
  // Find the community by name (case-insensitive lookup)
  const community = await MyGlobal.prisma.community_communities.findFirst({
    where: {
      name: {
        equals: props.communityName,
        mode: "insensitive",
      },
      deleted_at: null,
    },
    select: { id: true },
  });
  if (!community) {
    throw new HttpException("Community not found", 404);
  }
  // Query the moderator by ID with nested relations
  const moderator = await MyGlobal.prisma.community_moderators.findUnique({
    where: { id: props.moderatorId },
    select: {
      id: true,
      is_owner: true,
      created_at: true,
      community_id: true,
      member: CommunityMemberAtSummaryTransformer.select(),
      appointer: CommunityMemberAtSummaryTransformer.select(),
    },
  });
  if (!moderator) {
    throw new HttpException("Moderator not found", 404);
  }
  // Verify the moderator belongs to the specified community
  if (moderator.community_id !== community.id) {
    throw new HttpException("Moderator not found in this community", 404);
  }
  // Transform and return the response
  return {
    id: moderator.id,
    is_owner: moderator.is_owner,
    created_at: moderator.created_at.toISOString(),
    member: await CommunityMemberAtSummaryTransformer.transform(
      moderator.member,
    ),
    appointer: moderator.appointer
      ? await CommunityMemberAtSummaryTransformer.transform(moderator.appointer)
      : null,
  };
}
