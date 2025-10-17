import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import { MemberPayload } from "../decorators/payload/MemberPayload";

export async function postCommunityPlatformMemberCommunities(props: {
  member: any;
  body: ICommunityPlatformCommunity.ICreate;
}): Promise<ICommunityPlatformCommunity> {
  // Create the new community record
  const newCommunity =
    await MyGlobal.prisma.community_platform_communities.create({
      data: {
        id: v4() as string & tags.Format<"uuid">,
        name: props.body.name,
        description: props.body.description,
        created_at: toISOStringSafe(new Date()),
        is_public: true,
        nsfw: false,
        post_review_mode: false,
        comment_review_mode: false,
        member_count: 0,
        post_count: 0,
      },
    });

  // Create the moderator record linking the member to the community
  await MyGlobal.prisma.community_platform_moderator.create({
    data: {
      id: v4() as string & tags.Format<"uuid">,
      member_id: props.member.id,
      community_id: newCommunity.id,
      created_at: toISOStringSafe(new Date()),
    },
  });

  // Create the community settings record with default values
  await MyGlobal.prisma.community_platform_community_settings.create({
    data: {
      id: v4() as string & tags.Format<"uuid">,
      community_platform_community_id: newCommunity.id,
      created_at: toISOStringSafe(new Date()),
      updated_at: toISOStringSafe(new Date()),
      moderator_invite_only: false,
      allow_self_post: true,
    },
  });

  // Format and return the community object with proper type
  return {
    id: newCommunity.id,
    name: newCommunity.name,
    description: newCommunity.description,
    createdAt: toISOStringSafe(
      newCommunity.created_at,
    ) satisfies string as string,
    isPublic: newCommunity.is_public,
    nsfw: newCommunity.nsfw,
    postReviewMode: newCommunity.post_review_mode,
    commentReviewMode: newCommunity.comment_review_mode,
    memberCount: newCommunity.member_count,
    postCount: newCommunity.post_count,
  };
}
