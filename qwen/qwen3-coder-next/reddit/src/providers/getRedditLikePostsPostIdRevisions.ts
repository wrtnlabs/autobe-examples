import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IRedditLikeCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeCommunity";
import { IRedditLikeMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeMember";
import { IRedditLikePost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikePost";
import { IRedditLikePostRevision } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikePostRevision";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { RedditLikePostRevisionTransformer } from "../transformers/RedditLikePostRevisionTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getRedditLikePostsPostIdRevisions(props: {
  postId: string & tags.Format<"uuid">;
}): Promise<IRedditLikePostRevision[]> {
  const post = await MyGlobal.prisma.reddit_like_posts.findUnique({
    where: { id: props.postId },
  });
  if (!post) {
    throw new HttpException("Post not found", 404);
  }
  const revisions = await MyGlobal.prisma.reddit_like_post_revisions.findMany({
    where: { reddit_like_post_id: props.postId },
    orderBy: { revision_number: "asc" },
    ...RedditLikePostRevisionTransformer.select(),
  });
  return await ArrayUtil.asyncMap(
    revisions,
    RedditLikePostRevisionTransformer.transform,
  );
}
