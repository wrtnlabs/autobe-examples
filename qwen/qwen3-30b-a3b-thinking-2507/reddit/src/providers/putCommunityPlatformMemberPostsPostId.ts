import { ICommunityPlatformComment } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformComment";
import { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
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
import { CommunityPlatformPostTransformer } from "../transformers/CommunityPlatformPostTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function putCommunityPlatformMemberPostsPostId(props: {
  member: MemberPayload;
  postId: string & tags.Format<"uuid">;
  body: ICommunityPlatformPost.IUpdate;
}): Promise<ICommunityPlatformPost> {
  const post = await MyGlobal.prisma.community_platform_posts.findUnique({
    where: { id: props.postId },
    select: {
      id: true,
      title: true,
      content_type: true,
      author_id: true,
      updated_at: true,
      deleted_at: true,
    },
  });
  if (!post) throw new HttpException("Post not found", 404);
  if (post.deleted_at)
    throw new HttpException("Post has been soft-deleted", 403);
  if (post.author_id !== props.member.id)
    throw new HttpException("Unauthorized: Not the post author", 403);
  const updated = await MyGlobal.prisma.community_platform_posts.update({
    where: { id: props.postId },
    data: {
      title: props.body.title,
      content_type: props.body.content_type,
      updated_at: toISOStringSafe(new Date()),
    },
  });
  const fullPost = await MyGlobal.prisma.community_platform_posts.findUnique({
    where: { id: props.postId },
    select: {
      id: true,
      title: true,
      content_type: true,
      created_at: true,
      updated_at: true,
      deleted_at: true,
      community: {
        select: {
          id: true,
          name: true,
          description: true,
          icon_url: true,
          created_at: true,
          updated_at: true,
          deleted_at: true,
          owner: true,
        },
      },
      author: {
        select: {
          id: true,
          name: true,
          description: true,
          icon_url: true,
          owner: true,
          created_at: true,
          updated_at: true,
        },
      },
    },
  });
  if (!fullPost) throw new HttpException("Post not found", 404);
  return await CommunityPlatformPostTransformer.transform(fullPost);
}
