import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IRedditCommunityCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunity";
import { IRedditCommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityMember";
import { IRedditCommunityPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityPost";
import { IRedditCommunityPostImageContent } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityPostImageContent";
import { IRedditCommunityPostLinkContent } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityPostLinkContent";
import { IRedditCommunityPostTextContent } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityPostTextContent";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { RedditCommunityPostTransformer } from "../transformers/RedditCommunityPostTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function putRedditCommunityPostsPostId(props: {
  postId: string & tags.Format<"uuid">;
  body: IRedditCommunityPost.IUpdate;
}): Promise<IRedditCommunityPost> {
  const post = await MyGlobal.prisma.reddit_community_posts.findUniqueOrThrow({
    where: { id: props.postId, deleted_at: null },
  });
  await MyGlobal.prisma.reddit_community_posts.update({
    where: { id: props.postId },
    data: {
      ...(props.body.title !== undefined && { title: props.body.title }),
      updated_at: new Date(),
    },
  });
  if (post.post_type === "text" && props.body.body !== undefined) {
    await MyGlobal.prisma.reddit_community_post_texts.update({
      where: { reddit_community_post_id: props.postId },
      data: {
        body: props.body.body,
        updated_at: new Date(),
      },
    });
  } else if (post.post_type === "link" && props.body.url !== undefined) {
    const domain = new URL(props.body.url).hostname;
    await MyGlobal.prisma.reddit_community_post_links.update({
      where: { reddit_community_post_id: props.postId },
      data: {
        url: props.body.url,
        domain: domain,
        updated_at: new Date(),
      },
    });
  } else if (post.post_type === "image" && props.body.imageUrl !== undefined) {
    await MyGlobal.prisma.reddit_community_post_images.update({
      where: { reddit_community_post_id: props.postId },
      data: {
        image_url: props.body.imageUrl,
        ...(props.body.thumbnailUrl !== undefined && {
          thumbnail_url: props.body.thumbnailUrl,
        }),
        updated_at: new Date(),
      },
    });
  }
  const updated =
    await MyGlobal.prisma.reddit_community_posts.findUniqueOrThrow({
      where: { id: props.postId },
      ...RedditCommunityPostTransformer.select(),
    });
  return await RedditCommunityPostTransformer.transform(updated);
}
