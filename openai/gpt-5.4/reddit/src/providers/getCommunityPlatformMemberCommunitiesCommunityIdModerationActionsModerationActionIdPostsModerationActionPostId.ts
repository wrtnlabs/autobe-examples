import { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import { ICommunityPlatformCommunityModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunityModerator";
import { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import { ICommunityPlatformModerationAction } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformModerationAction";
import { ICommunityPlatformModerationActionPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformModerationActionPost";
import { ICommunityPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPost";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { CommunityPlatformModerationActionPostTransformer } from "../transformers/CommunityPlatformModerationActionPostTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getCommunityPlatformMemberCommunitiesCommunityIdModerationActionsModerationActionIdPostsModerationActionPostId(props: {
  member: MemberPayload;
  communityId: string & tags.Format<"uuid">;
  moderationActionId: string & tags.Format<"uuid">;
  moderationActionPostId: string & tags.Format<"uuid">;
}): Promise<ICommunityPlatformModerationActionPost> {
  const community =
    await MyGlobal.prisma.community_platform_communities.findFirstOrThrow({
      where: {
        id: props.communityId,
        deleted_at: null,
      },
      select: {
        id: true,
        member: {
          select: {
            id: true,
          },
        } satisfies Prisma.community_platform_membersFindManyArgs,
      },
    });
  if (community.member.id !== props.member.id) {
    const moderator =
      await MyGlobal.prisma.community_platform_community_moderators.findFirst({
        where: {
          community_platform_community_id: props.communityId,
          community_platform_member_id: props.member.id,
          status: "active",
          deleted_at: null,
        },
        select: {
          id: true,
        },
      });
    if (moderator === null) {
      throw new HttpException("Forbidden", 403);
    }
  }
  const moderationActionPost =
    await MyGlobal.prisma.community_platform_moderation_action_posts.findFirstOrThrow(
      {
        where: {
          id: props.moderationActionPostId,
          community_platform_moderation_action_id: props.moderationActionId,
          deleted_at: null,
          moderationAction: {
            id: props.moderationActionId,
            community_platform_community_id: props.communityId,
            deleted_at: null,
            community: {
              id: props.communityId,
              deleted_at: null,
            },
            communityModerator: {
              status: "active",
              deleted_at: null,
            },
          },
          post: {
            community_platform_community_id: props.communityId,
            deleted_at: null,
          },
        },
        ...CommunityPlatformModerationActionPostTransformer.select(),
      },
    );
  return await CommunityPlatformModerationActionPostTransformer.transform(
    moderationActionPost,
  );
}
