import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IRedditLikeMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeMember";
import { IRedditLikePostSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikePostSnapshot";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { GuestPayload } from "../decorators/payload/GuestPayload";
import { RedditLikeMemberAtSummaryTransformer } from "../transformers/RedditLikeMemberAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getRedditLikeGuestPostsPostIdSnapshotsSnapshotId(props: {
  guest: GuestPayload;
  postId: string;
  snapshotId: string;
}): Promise<IRedditLikePostSnapshot> {
  const snapshot =
    await MyGlobal.prisma.reddit_like_post_snapshots.findUniqueOrThrow({
      where: { id: props.snapshotId },
      select: {
        id: true,
        post: {
          select: { id: true },
        } satisfies Prisma.reddit_like_postsFindManyArgs,
        author: RedditLikeMemberAtSummaryTransformer.select(),
        title: true,
        type: true,
        content: true,
        url: true,
        image_url: true,
        vote_score: true,
        comment_count: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
        snapshot_created_at: true,
      },
    });
  return {
    id: snapshot.id,
    postId: snapshot.post.id,
    author: await RedditLikeMemberAtSummaryTransformer.transform(
      snapshot.author,
    ),
    title: snapshot.title,
    type: snapshot.type as "text" | "link" | "image",
    content: snapshot.content ?? "",
    url: snapshot.url ?? "",
    imageUrl: snapshot.image_url ?? "",
    score: snapshot.vote_score,
    commentCount: snapshot.comment_count,
    createdAt: snapshot.created_at.toISOString(),
    updatedAt: snapshot.updated_at ? snapshot.updated_at.toISOString() : null,
    deletedAt: snapshot.deleted_at ? snapshot.deleted_at.toISOString() : null,
    snapshotCreatedAt: snapshot.snapshot_created_at.toISOString(),
  };
}
