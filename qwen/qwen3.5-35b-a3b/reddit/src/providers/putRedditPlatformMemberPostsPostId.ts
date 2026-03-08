import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IRedditPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformCommunity";
import { IRedditPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformMember";
import { IRedditPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformPost";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { RedditPlatformPostTransformer } from "../transformers/RedditPlatformPostTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function putRedditPlatformMemberPostsPostId(props: {
  member: MemberPayload;
  postId: string & tags.Format<"uuid">;
  body: IRedditPlatformPost.IUpdate;
}): Promise<IRedditPlatformPost> {
  if (
    props.body.title === undefined &&
    props.body.content === undefined &&
    props.body.url === undefined &&
    props.body.image_url === undefined
  ) {
    throw new HttpException("At least one field must be provided", 400);
  }
  const existing =
    await MyGlobal.prisma.reddit_platform_posts.findUniqueOrThrow({
      where: { id: props.postId },
      select: {
        id: true,
        reddit_platform_member_id: true,
        reddit_platform_community_id: true,
        title: true,
        content: true,
        post_type: true,
        url: true,
        image_url: true,
        updated_at: true,
        deleted_at: true,
      },
    });
  if (existing.deleted_at !== null) {
    throw new HttpException("Post not found", 404);
  }
  const isAuthor = existing.reddit_platform_member_id === props.member.id;
  if (!isAuthor) {
    const isModerator =
      await MyGlobal.prisma.reddit_platform_community_moderators.findFirst({
        where: {
          user_id: props.member.id,
          community_id: existing.reddit_platform_community_id,
        },
      });
    if (isModerator === null) {
      throw new HttpException("Unauthorized to edit this post", 403);
    }
  }
  const updateData: Prisma.reddit_platform_postsUpdateInput = {
    ...(props.body.title !== undefined && { title: props.body.title }),
    ...(props.body.content !== undefined && { content: props.body.content }),
    ...(props.body.url !== undefined && { url: props.body.url }),
    ...(props.body.image_url !== undefined && {
      image_url: props.body.image_url,
    }),
    updated_at: new Date().toISOString(),
  };
  await MyGlobal.prisma.reddit_platform_posts.update({
    where: { id: props.postId },
    data: updateData,
  });
  const updated = await MyGlobal.prisma.reddit_platform_posts.findUniqueOrThrow(
    {
      where: { id: props.postId },
      ...RedditPlatformPostTransformer.select(),
    },
  );
  return await RedditPlatformPostTransformer.transform(updated);
}
