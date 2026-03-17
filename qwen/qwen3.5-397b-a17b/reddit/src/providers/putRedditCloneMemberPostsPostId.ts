import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IRedditCloneCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneCommunity";
import { IRedditCloneMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneMember";
import { IRedditClonePost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditClonePost";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { RedditClonePostTransformer } from "../transformers/RedditClonePostTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function putRedditCloneMemberPostsPostId(props: {
  member: MemberPayload;
  postId: string & tags.Format<"uuid">;
  body: IRedditClonePost.IUpdate;
}): Promise<IRedditClonePost> {
  const post = await MyGlobal.prisma.reddit_clone_posts.findUniqueOrThrow({
    where: { id: props.postId },
    select: {
      id: true,
      member_id: true,
      post_type: true,
      deleted_at: true,
    },
  });
  if (post.deleted_at !== null) {
    throw new HttpException("Post is deleted", 403);
  }
  if (post.member_id !== props.member.id) {
    throw new HttpException("Forbidden", 403);
  }
  const updated = await MyGlobal.prisma.$transaction(async (tx) => {
    if (props.body.title !== undefined) {
      await tx.reddit_clone_posts.update({
        where: { id: props.postId },
        data: {
          title: props.body.title,
          updated_at: new Date(),
        },
      });
    }
    if (post.post_type === "TEXT" && props.body.text !== undefined) {
      await tx.reddit_clone_post_texts.update({
        where: { reddit_clone_post_id: props.postId },
        data: {
          body: props.body.text,
          updated_at: new Date(),
        },
      });
    }
    if (post.post_type === "LINK" && props.body.url !== undefined) {
      await tx.reddit_clone_post_links.update({
        where: { reddit_clone_post_id: props.postId },
        data: {
          url: props.body.url,
        },
      });
    }
    if (post.post_type === "IMAGE" && props.body.imageUri !== undefined) {
      await tx.reddit_clone_post_images.update({
        where: { reddit_clone_post_id: props.postId },
        data: {
          file_uri: props.body.imageUri,
          updated_at: new Date(),
        },
      });
    }
    return tx.reddit_clone_posts.findUniqueOrThrow({
      where: { id: props.postId },
      ...RedditClonePostTransformer.select(),
    });
  });
  return await RedditClonePostTransformer.transform(updated);
}
