import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IRedditLikePostRevision } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikePostRevision";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { RedditLikePostRevisionCollector } from "../collectors/RedditLikePostRevisionCollector";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postRedditLikeMemberPostsPostIdRevisions(props: {
  member: MemberPayload;
  postId: string & tags.Format<"uuid">;
  body: IRedditLikePostRevision.ICreate;
}): Promise<void> {
  // Verify the post exists and belongs to the member
  const post = await MyGlobal.prisma.reddit_like_posts.findUniqueOrThrow({
    where: { id: props.postId },
    select: { id: true, author_id: true },
  });
  if (post.author_id !== props.member.id) {
    throw new HttpException("Forbidden", 403);
  }
  // Get the current revision count to compute the new revision number
  const maxRevision =
    await MyGlobal.prisma.reddit_like_post_revisions.aggregate({
      where: { reddit_like_post_id: props.postId },
      _max: { revision_number: true },
    });
  const revisionNumber = (maxRevision._max.revision_number ?? 0) + 1;
  // Create the revision snapshot using the collector
  await MyGlobal.prisma.reddit_like_post_revisions.create({
    data: await RedditLikePostRevisionCollector.collect({
      body: props.body,
      redditLikePosts: post,
      revisionNumber,
    }),
  });
}
