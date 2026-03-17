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

export async function putCommunityPlatformMemberPostsPostIdLinksLinkId(props: {
  member: MemberPayload;
  postId: string & tags.Format<"uuid">;
  linkId: string & tags.Format<"uuid">;
  body: ICommunityPlatformPost.IUpdate;
}): Promise<ICommunityPlatformPost> {
  const post = await MyGlobal.prisma.community_platform_posts.findUniqueOrThrow(
    {
      where: { id: props.postId },
      select: {
        id: true,
        community_platform_member_id: true,
        post_type: true,
        status: true,
      },
    },
  );
  const link =
    await MyGlobal.prisma.community_platform_post_links.findUniqueOrThrow({
      where: { id: props.linkId },
      select: {
        id: true,
        community_platform_post_id: true,
      },
    });
  if (link.community_platform_post_id !== post.id) {
    throw new HttpException("Invalid nested resource reference", 400);
  }
  if (post.community_platform_member_id !== props.member.id) {
    throw new HttpException("Forbidden", 403);
  }
  if (post.post_type !== "link") {
    throw new HttpException("Post is not a link post", 400);
  }
  if (post.status !== "active") {
    throw new HttpException("Post is not editable", 400);
  }
  if (props.body.body !== undefined || props.body.image !== undefined) {
    throw new HttpException("Request body does not match link post type", 400);
  }
  if (props.body.title !== undefined || props.body.target_url !== undefined) {
    await MyGlobal.prisma.$transaction(async (prisma) => {
      if (props.body.title !== undefined) {
        await prisma.community_platform_posts.update({
          where: { id: props.postId },
          data: {
            title: props.body.title,
            updated_at: new Date(),
          },
        });
      } else if (props.body.target_url !== undefined) {
        await prisma.community_platform_posts.update({
          where: { id: props.postId },
          data: {
            updated_at: new Date(),
          },
        });
      }
      if (props.body.target_url !== undefined) {
        await prisma.community_platform_post_links.update({
          where: { id: props.linkId },
          data: {
            target_url: props.body.target_url,
            domain_display: new URL(props.body.target_url).hostname,
            updated_at: new Date(),
          },
        });
      }
    });
  }
  const updated =
    await MyGlobal.prisma.community_platform_posts.findUniqueOrThrow({
      where: { id: props.postId },
      ...CommunityPlatformPostTransformer.select(),
    });
  return await CommunityPlatformPostTransformer.transform(updated);
}
