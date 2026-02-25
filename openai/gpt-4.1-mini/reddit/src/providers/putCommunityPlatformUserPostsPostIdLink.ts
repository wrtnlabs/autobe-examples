import { ICommunityPlatformPostLink } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPostLink";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { UserPayload } from "../decorators/payload/UserPayload";
import { CommunityPlatformPostLinkTransformer } from "../transformers/CommunityPlatformPostLinkTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function putCommunityPlatformUserPostsPostIdLink(props: {
  user: UserPayload;
  postId: string & tags.Format<"uuid">;
  body: ICommunityPlatformPostLink.ICreate;
}): Promise<ICommunityPlatformPostLink> {
  // Verify the post exists and is 'link' type
  const post = await MyGlobal.prisma.community_platform_posts.findUniqueOrThrow(
    {
      where: { id: props.postId },
      select: {
        id: true,
        author_user_id: true,
        post_type: true,
        community_id: true,
      },
    },
  );
  if (post.post_type !== "link") {
    throw new HttpException("Post is not a link type", 400);
  }
  // Ensure the user is either the author or a moderator of the post's community
  if (post.author_user_id !== props.user.id) {
    const moderator =
      await MyGlobal.prisma.community_platform_community_moderators.findFirst({
        where: {
          community_id: post.community_id,
          community_platform_member_id: props.user.id,
        },
      });
    if (!moderator) {
      throw new HttpException("Forbidden", 403);
    }
  }
  // Validate URL format
  try {
    new URL(props.body.url);
  } catch {
    throw new HttpException("Invalid URL format", 400);
  }
  // Perform update in a transaction
  const updatedRaw = await MyGlobal.prisma.$transaction(async (tx) => {
    await tx.community_platform_post_links.update({
      where: { community_platform_post_id: props.postId },
      data: {
        url: props.body.url,
        updated_at: new Date(),
      },
    });
    return tx.community_platform_post_links.findUniqueOrThrow({
      where: { community_platform_post_id: props.postId },
      select: {
        id: true,
        community_platform_post_id: true,
        url: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
      },
    });
  });
  // Return updated record using transformer to convert dates
  return CommunityPlatformPostLinkTransformer.transform(updatedRaw);
}
