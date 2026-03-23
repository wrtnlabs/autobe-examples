import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IRedditLikeCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeCommunity";
import { IRedditLikeMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeMember";
import { IRedditLikePost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikePost";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { RedditLikePostTransformer } from "../transformers/RedditLikePostTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function putRedditLikeMemberPostsPostId(props: {
  member: MemberPayload;
  postId: string & tags.Format<"uuid">;
  body: IRedditLikePost.IUpdate;
}): Promise<IRedditLikePost> {
  const post = await MyGlobal.prisma.reddit_like_posts.findUniqueOrThrow({
    where: { id: props.postId, deleted_at: null },
    select: {
      id: true,
      author_id: true,
      type: true,
      title: true,
      content: true,
      url: true,
      image_url: true,
    },
  });
  if (post.author_id !== props.member.id) {
    throw new HttpException("Forbidden", 403);
  }
  const updateData: Prisma.reddit_like_postsUpdateInput = {
    title: props.body.title ?? post.title,
    content: props.body.content ?? post.content,
    url: props.body.url ?? post.url,
    image_url: props.body.image_url ?? post.image_url,
    updated_at: new Date(),
  };
  await MyGlobal.prisma.reddit_like_posts.update({
    where: { id: props.postId },
    data: updateData,
  });
  const updated = await MyGlobal.prisma.reddit_like_posts.findUniqueOrThrow({
    where: { id: props.postId },
    ...RedditLikePostTransformer.select(),
  });
  return await RedditLikePostTransformer.transform(updated);
}
