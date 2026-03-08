import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IRedditLikeCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeCommunity";
import { IRedditLikeMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeMember";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { RedditLikeCommunityTransformer } from "../transformers/RedditLikeCommunityTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function putRedditLikeMemberCommunitiesCommunityName(props: {
  member: MemberPayload;
  communityName: string;
  body: IRedditLikeCommunity.IUpdate;
}): Promise<IRedditLikeCommunity> {
  // Find the community by name
  const community = await MyGlobal.prisma.reddit_like_communities.findUnique({
    where: { name: props.communityName },
  });
  if (community === null) {
    throw new HttpException("Community not found", 404);
  }
  // Check authorization: only owner or admin can update
  if (community.member_id !== props.member.id) {
    // Check if member is admin
    const isAdmin = await MyGlobal.prisma.reddit_like_admins.findUnique({
      where: { id: props.member.id },
    });
    if (isAdmin === null) {
      throw new HttpException("Forbidden", 403);
    }
  }
  // Apply partial updates
  const updateData: {
    description?: string;
    icon_url?: string | null;
    updated_at: Date;
  } = { updated_at: new Date() };
  if (props.body.description !== undefined) {
    updateData.description = props.body.description;
  }
  if (props.body.icon_url !== undefined) {
    updateData.icon_url = props.body.icon_url;
  }
  // Update the community
  const updated = await MyGlobal.prisma.reddit_like_communities.update({
    where: { id: community.id },
    data: updateData,
    ...RedditLikeCommunityTransformer.select(),
  });
  return await RedditLikeCommunityTransformer.transform(updated);
}
