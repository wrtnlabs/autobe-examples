import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IRedditCommunityCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunity";
import { IRedditCommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityMember";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { RedditCommunityCommunityTransformer } from "../transformers/RedditCommunityCommunityTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function putRedditCommunityCommunitiesCommunityId(props: {
  communityId: string;
  body: IRedditCommunityCommunity.IUpdate;
}): Promise<IRedditCommunityCommunity> {
  // Fetch the community and its owner
  const community =
    await MyGlobal.prisma.reddit_community_communities.findUniqueOrThrow({
      where: { id: props.communityId },
      select: { id: true, name: true, owner_user_id: true },
    });
  // Verify current user is the owner using MyGlobal.actor from auth context
  if (!MyGlobal.actor || community.owner_user_id !== MyGlobal.actor.id) {
    throw new HttpException("Forbidden", 403);
  }
  // Store body as local variable for reuse
  const { name, description, icon_url } = props.body;
  // Check name uniqueness if being updated
  if (name !== undefined) {
    const existing =
      await MyGlobal.prisma.reddit_community_communities.findUnique({
        where: { name },
      });
    if (existing && existing.id !== props.communityId) {
      throw new HttpException("Community name already exists", 400);
    }
  }
  // Validate icon_url if provided
  if (icon_url !== undefined && icon_url !== null) {
    try {
      const url = new URL(icon_url);
      if (url.protocol !== "https:") {
        throw new HttpException("icon_url must be a valid HTTPS URI", 400);
      }
      const ext = url.pathname.toLowerCase().split(".").pop() ?? "";
      if (!["jpg", "jpeg", "png", "webp"].includes(ext)) {
        throw new HttpException(
          "icon_url must be JPG, PNG, or WEBP format",
          400,
        );
      }
    } catch {
      throw new HttpException("icon_url must be a valid HTTPS URI", 400);
    }
  }
  // Update the community
  const updated = await MyGlobal.prisma.reddit_community_communities.update({
    where: { id: props.communityId },
    data: {
      ...(name !== undefined && { name }),
      ...(description !== undefined && { description }),
      ...(icon_url !== undefined && { icon_url }),
      updated_at: new Date().toISOString(),
    },
    ...RedditCommunityCommunityTransformer.select(),
  });
  // Transform and return
  return await RedditCommunityCommunityTransformer.transform(updated);
}
