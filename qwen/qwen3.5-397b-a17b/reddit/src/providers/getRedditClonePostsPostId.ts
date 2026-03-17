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
import { RedditClonePostTransformer } from "../transformers/RedditClonePostTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getRedditClonePostsPostId(props: {
  postId: string & tags.Format<"uuid">;
}): Promise<IRedditClonePost> {
  const post = await MyGlobal.prisma.reddit_clone_posts.findUniqueOrThrow({
    where: {
      id: props.postId,
      deleted_at: null,
    },
    ...RedditClonePostTransformer.select(),
  });
  const votes = await MyGlobal.prisma.reddit_clone_votes.groupBy({
    by: ["vote_type"],
    where: {
      target_id: props.postId,
      target_type: "POST",
      deleted_at: null,
    },
    _count: {
      vote_type: true,
    },
  });
  const upvotes =
    votes.find((v) => v.vote_type === "UPVOTE")?._count.vote_type ?? 0;
  const downvotes =
    votes.find((v) => v.vote_type === "DOWNVOTE")?._count.vote_type ?? 0;
  const voteScore = upvotes - downvotes;
  const transformed = await RedditClonePostTransformer.transform(post);
  return {
    ...transformed,
    vote_score: voteScore,
  };
}
