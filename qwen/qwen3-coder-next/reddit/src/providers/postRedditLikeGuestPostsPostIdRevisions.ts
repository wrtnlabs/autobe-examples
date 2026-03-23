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
import { GuestPayload } from "../decorators/payload/GuestPayload";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postRedditLikeGuestPostsPostIdRevisions(props: {
  guest: GuestPayload;
  postId: string & tags.Format<"uuid">;
  body: IRedditLikePostRevision.ICreate;
}): Promise<void> {
  const post = await MyGlobal.prisma.reddit_like_posts.findUniqueOrThrow({
    where: { id: props.postId },
  });
  const maxRevision =
    await MyGlobal.prisma.reddit_like_post_revisions.findFirst({
      where: { reddit_like_post_id: props.postId },
      orderBy: { revision_number: "desc" },
      select: { revision_number: true },
    });
  const revisionNumber = (maxRevision?.revision_number ?? 0) + 1;
  await MyGlobal.prisma.reddit_like_post_revisions.create({
    data: await RedditLikePostRevisionCollector.collect({
      body: props.body,
      redditLikePosts: post,
      revisionNumber,
    }),
  });
}
