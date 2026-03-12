import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IRedditCloneCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneCommunity";
import { IRedditCloneMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneMember";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { RedditCloneCommunityTransformer } from "../transformers/RedditCloneCommunityTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function putRedditCloneMemberCommunitiesCommunityId(props: {
  member: MemberPayload;
  communityId: string & tags.Format<"uuid">;
  body: IRedditCloneCommunity.IUpdate;
}): Promise<IRedditCloneCommunity> {
  // Reserved community names that cannot be used
  const reservedNames = [
    "admin",
    "moderator",
    "system",
    "official",
    "redditClone",
  ];
  // Check if community exists and verify ownership
  const existing =
    await MyGlobal.prisma.reddit_clone_communities.findUniqueOrThrow({
      where: {
        id: props.communityId,
        deleted_at: null,
      },
      select: {
        id: true,
        owner_id: true,
        name: true,
      },
    });
  // Verify the requesting member is the owner
  if (existing.owner_id !== props.member.id) {
    throw new HttpException("Forbidden", 403);
  }
  // Validate new name if provided
  if (props.body.name !== undefined) {
    // Check if name is reserved
    if (reservedNames.includes(props.body.name.toLowerCase())) {
      throw new HttpException("Community name is reserved", 400);
    }
    // Check if name is already taken by another active community
    const duplicate = await MyGlobal.prisma.reddit_clone_communities.findFirst({
      where: {
        name: props.body.name,
        deleted_at: null,
        id: { not: props.communityId },
      },
    });
    if (duplicate) {
      throw new HttpException("Community name already exists", 400);
    }
  }
  // Update the community with provided fields
  const updateData: Prisma.reddit_clone_communitiesUpdateInput = {
    updated_at: new Date(),
    ...(props.body.name !== undefined && { name: props.body.name }),
    ...(props.body.description !== undefined && {
      description: props.body.description,
    }),
    ...(props.body.icon !== undefined && { icon: props.body.icon }),
  };
  await MyGlobal.prisma.reddit_clone_communities.update({
    where: { id: props.communityId },
    data: updateData,
  });
  // Fetch and return the updated community
  const updated =
    await MyGlobal.prisma.reddit_clone_communities.findUniqueOrThrow({
      where: { id: props.communityId },
      ...RedditCloneCommunityTransformer.select(),
    });
  return await RedditCloneCommunityTransformer.transform(updated);
}
