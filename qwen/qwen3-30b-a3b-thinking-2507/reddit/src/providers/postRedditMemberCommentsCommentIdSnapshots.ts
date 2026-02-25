import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IRedditComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditComment";
import { IRedditCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunity";
import { IRedditMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditMember";
import { IRedditPostText } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPostText";
import { IRedditProfileSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditProfileSnapshot";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { RedditProfileSnapshotTransformer } from "../transformers/RedditProfileSnapshotTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postRedditMemberCommentsCommentIdSnapshots(props: {
  member: MemberPayload;
  commentId: string & tags.Format<"uuid">;
}): Promise<IRedditProfileSnapshot> {
  const comment = await MyGlobal.prisma.reddit_comments.findUniqueOrThrow({
    where: { id: props.commentId },
    select: {
      id: true,
      content: true,
      reddit_post_id: true,
      user_id: true,
      created_at: true,
      deleted_at: true,
    },
  });
  if (comment.deleted_at) {
    throw new HttpException("Comment is deleted", 404);
  }
  const commentCreated = new Date(comment.created_at);
  const now = new Date();
  const hoursSinceCreation =
    (now.getTime() - commentCreated.getTime()) / (1000 * 60 * 60);
  if (hoursSinceCreation > 24) {
    throw new HttpException("Edit window expired (24 hours)", 403);
  }
  if (comment.user_id !== props.member.id) {
    throw new HttpException("Unauthorized: Not comment author", 403);
  }
  const snapshot = await MyGlobal.prisma.reddit_comment_snapshots.create({
    data: {
      id: v4(),
      comment: {
        connect: { id: comment.id },
      },
      content: comment.content,
      post_id: comment.reddit_post_id,
      author_id: comment.user_id,
      created_at: now,
      updated_at: now,
    },
  });
  return await RedditProfileSnapshotTransformer.transform(snapshot);
}
