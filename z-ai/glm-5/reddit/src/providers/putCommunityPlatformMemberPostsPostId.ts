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
      author_id: true,
      title: true,
      content_type: true,
      text_content: true,
      link_url: true,
      image_url: true,
      score: true,
      comment_count: true,
      updated_at: true,
      deleted_at: true,
    },
  });
  if (post === null) {
    throw new HttpException("Post not found", 404);
  }
  if (post.deleted_at !== null) {
    throw new HttpException("Post not found", 404);
  }
  if (post.author_id !== props.member.id) {
    throw new HttpException("Forbidden", 403);
  }
  const now = new Date();
  const updateData = {
    ...(props.body.title !== undefined && { title: props.body.title }),
    ...(post.content_type === "text" &&
      props.body.text_content !== undefined && {
        text_content: props.body.text_content,
      }),
    ...(post.content_type === "link" &&
      props.body.link_url !== undefined && {
        link_url: props.body.link_url,
      }),
    ...(post.content_type === "image" &&
      props.body.image_url !== undefined && {
        image_url: props.body.image_url,
      }),
    updated_at: now,
  } satisfies Prisma.community_platform_postsUpdateInput;
  await MyGlobal.prisma.$transaction([
    MyGlobal.prisma.community_platform_post_snapshots.create({
      data: {
        id: v4(),
        post_id: post.id,
        editor_id: props.member.id,
        title: post.title,
        content_type: post.content_type,
        text_content: post.text_content,
        link_url: post.link_url,
        image_url: post.image_url,
        score: post.score,
        comment_count: post.comment_count,
        updated_at: post.updated_at,
        created_at: now,
      },
    }),
    MyGlobal.prisma.community_platform_posts.update({
      where: { id: props.postId },
      data: updateData,
    }),
  ]);
  const updatedPost =
    await MyGlobal.prisma.community_platform_posts.findUniqueOrThrow({
      where: { id: props.postId },
      ...CommunityPlatformPostTransformer.select(),
    });
  return await CommunityPlatformPostTransformer.transform(updatedPost);
}
