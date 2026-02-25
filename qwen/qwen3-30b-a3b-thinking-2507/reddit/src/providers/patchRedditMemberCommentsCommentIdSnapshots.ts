import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIRedditProfileSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditProfileSnapshot";
import { IRedditProfileSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditProfileSnapshot";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchRedditMemberCommentsCommentIdSnapshots(props: {
  member: MemberPayload;
  commentId: string & tags.Format<"uuid">;
  body: IRedditProfileSnapshot.IRequest;
}): Promise<IPageIRedditProfileSnapshot.ISummary> {
  const comment = await MyGlobal.prisma.reddit_comments.findUniqueOrThrow({
    where: { id: props.commentId },
  });
  if (comment.user_id !== props.member.id) {
    throw new HttpException("Forbidden", 403);
  }
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 10;
  const skip = (page - 1) * limit;
  const whereClause: Prisma.reddit_comment_snapshotsWhereInput = {
    reddit_comment_id: props.commentId,
    deleted_at: props.body.deleted ? { not: null } : { equals: null },
  };
  const data = await MyGlobal.prisma.reddit_comment_snapshots.findMany({
    where: whereClause,
    orderBy: { created_at: "desc" },
    skip,
    take: limit,
  });
  const total = await MyGlobal.prisma.reddit_comment_snapshots.count({
    where: whereClause,
  });
  return {
    data: data.map((snapshot) => ({
      content: snapshot.content,
      post_id: snapshot.post_id,
      author_id: snapshot.user_id,
      created_at: toISOStringSafe(snapshot.created_at),
      updated_at: toISOStringSafe(snapshot.updated_at),
      deleted_at: snapshot.deleted_at
        ? toISOStringSafe(snapshot.deleted_at)
        : null,
    })),
    pagination: {
      current: page,
      limit,
      records: total,
      pages: Math.ceil(total / limit),
    },
  };
}
