import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IRedditCloneCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneCommunity";
import { IRedditCloneMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneMember";
import { IRedditClonePost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditClonePost";
import { IRedditClonePostImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditClonePostImage";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { RedditClonePostImageCollector } from "../collectors/RedditClonePostImageCollector";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { RedditClonePostImageTransformer } from "../transformers/RedditClonePostImageTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postRedditCloneMemberPostsPostIdImages(props: {
  member: MemberPayload;
  postId: string & tags.Format<"uuid">;
  body: IRedditClonePostImage.ICreate;
}): Promise<IRedditClonePostImage> {
  const post = await MyGlobal.prisma.reddit_clone_posts.findUniqueOrThrow({
    where: { id: props.postId },
    select: { id: true, post_type: true, deleted_at: true },
  });
  if (post.deleted_at !== null) {
    throw new HttpException("Post has been deleted", 403);
  }
  if (post.post_type !== "image") {
    throw new HttpException("Post type must be 'image' to add images", 400);
  }
  const existingImages =
    await MyGlobal.prisma.reddit_clone_post_images.findMany({
      where: {
        reddit_clone_post_id: props.postId,
        deleted_at: null,
      },
      select: { sequence: true },
      orderBy: { sequence: "desc" },
      take: 1,
    });
  const sequence =
    existingImages.length > 0 ? existingImages[0].sequence + 1 : 1;
  const fileUrl = "https://storage.example.com/images/placeholder.jpg";
  const created = await MyGlobal.prisma.reddit_clone_post_images.create({
    data: await RedditClonePostImageCollector.collect({
      body: props.body,
      post: { id: props.postId },
      fileUrl: fileUrl,
      sequence: sequence,
    }),
    ...RedditClonePostImageTransformer.select(),
  });
  return await RedditClonePostImageTransformer.transform(created);
}
