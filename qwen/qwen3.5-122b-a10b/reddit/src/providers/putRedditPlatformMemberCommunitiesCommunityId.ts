import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IRedditPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformCommunity";
import { IRedditPlatformFile } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformFile";
import { IRedditPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformMember";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { RedditPlatformCommunityTransformer } from "../transformers/RedditPlatformCommunityTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function putRedditPlatformMemberCommunitiesCommunityId(props: {
  member: MemberPayload;
  communityId: string & tags.Format<"uuid">;
  body: IRedditPlatformCommunity.IUpdate;
}): Promise<IRedditPlatformCommunity> {
  // Find community and verify it exists and is not soft-deleted
  const community =
    await MyGlobal.prisma.reddit_platform_communities.findUnique({
      where: { id: props.communityId },
      select: {
        id: true,
        owner_id: true,
        deleted_at: true,
      },
    });
  if (community === null) {
    throw new HttpException("Community not found", 404);
  }
  if (community.deleted_at !== null) {
    throw new HttpException("Community has been deleted", 404);
  }
  // Check authorization: owner or moderator
  const isOwner = community.owner_id === props.member.id;
  if (!isOwner) {
    // Check if member is a moderator
    const moderator =
      await MyGlobal.prisma.reddit_platform_community_moderators.findFirst({
        where: {
          reddit_platform_member_id: props.member.id,
          reddit_platform_community_id: props.communityId,
          deleted_at: null,
        },
      });
    if (moderator === null) {
      throw new HttpException("Forbidden", 403);
    }
  }
  // Validate description length if provided
  if (props.body.description !== undefined) {
    const desc = props.body.description ?? null;
    if (desc !== null) {
      if (desc.length < 10 || desc.length > 500) {
        throw new HttpException(
          "Description must be between 10 and 500 characters",
          400,
        );
      }
    }
  }
  // Validate icon_id references valid file if provided
  if (props.body.icon_id !== undefined) {
    const iconId = props.body.icon_id ?? null;
    if (iconId !== null) {
      const file = await MyGlobal.prisma.reddit_platform_files.findFirst({
        where: {
          id: iconId,
          deleted_at: null,
        },
      });
      if (file === null) {
        throw new HttpException("Invalid icon file reference", 400);
      }
    }
  }
  // Update the community
  await MyGlobal.prisma.reddit_platform_communities.update({
    where: { id: props.communityId },
    data: {
      ...(props.body.description !== undefined && {
        description: props.body.description ?? null,
      }),
      ...(props.body.icon_id !== undefined && {
        icon_id: props.body.icon_id ?? null,
      }),
      updated_at: new Date(),
    },
  });
  // Return the updated community
  const updated =
    await MyGlobal.prisma.reddit_platform_communities.findUniqueOrThrow({
      where: { id: props.communityId },
      ...RedditPlatformCommunityTransformer.select(),
    });
  return await RedditPlatformCommunityTransformer.transform(updated);
}
