import { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import { ICommunityPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPost";
import { ICommunityPlatformPostImage } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPostImage";
import { ICommunityPlatformPostLink } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPostLink";
import { ICommunityPlatformPostText } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPostText";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { CommunityPlatformPostTransformer } from "../transformers/CommunityPlatformPostTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getCommunityPlatformMemberCommunitiesCommunityIdModerationActionsModerationActionIdPosts(props: {
  member: MemberPayload;
  communityId: string & tags.Format<"uuid">;
  moderationActionId: string & tags.Format<"uuid">;
}): Promise<ICommunityPlatformPost> {
  await MyGlobal.prisma.community_platform_communities.findUniqueOrThrow({
    where: { id: props.communityId },
    select: { id: true },
  });
  const authority =
    await MyGlobal.prisma.community_platform_community_moderators.findFirst({
      where: {
        community_platform_community_id: props.communityId,
        community_platform_member_id: props.member.id,
        deleted_at: null,
      },
      select: {
        id: true,
        role: true,
        owner: {
          select: {
            community_platform_community_moderator_id: true,
          },
        },
      },
    });
  if (
    authority === null ||
    (authority.role !== "owner" &&
      authority.role !== "moderator" &&
      authority.owner === null)
  ) {
    throw new HttpException("Forbidden", 403);
  }
  const moderationAction =
    await MyGlobal.prisma.community_platform_moderation_actions.findUniqueOrThrow(
      {
        where: { id: props.moderationActionId },
        select: {
          id: true,
          community_platform_community_id: true,
        },
      },
    );
  if (moderationAction.community_platform_community_id !== props.communityId) {
    throw new HttpException("Not Found", 404);
  }
  const target =
    await MyGlobal.prisma.community_platform_moderation_action_posts.findUniqueOrThrow(
      {
        where: {
          community_platform_moderation_action_id: props.moderationActionId,
        },
        select: {
          community_platform_post_id: true,
        },
      },
    );
  const scopedPost =
    await MyGlobal.prisma.community_platform_posts.findUniqueOrThrow({
      where: { id: target.community_platform_post_id },
      select: {
        id: true,
        community_platform_community_id: true,
      },
    });
  if (scopedPost.community_platform_community_id !== props.communityId) {
    throw new HttpException("Not Found", 404);
  }
  const post = await MyGlobal.prisma.community_platform_posts.findUniqueOrThrow(
    {
      where: { id: target.community_platform_post_id },
      ...CommunityPlatformPostTransformer.select(),
    },
  );
  return await CommunityPlatformPostTransformer.transform(post);
}
