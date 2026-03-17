import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIRedditCommunityCommentSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditCommunityCommentSnapshot";
import { IRedditCommunityCommentSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommentSnapshot";
import { IRedditCommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityMember";
import { IRedditCommunityUserProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityUserProfile";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchRedditCommunityCommentsCommentIdSnapshots(props: {
  commentId: string & tags.Format<"uuid">;
  body: IRedditCommunityCommentSnapshot.IRequest;
}): Promise<IPageIRedditCommunityCommentSnapshot.ISummary> {
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 20;
  const sort = props.body.sort ?? "version";
  const order = props.body.order ?? "asc";
  const comment =
    await MyGlobal.prisma.reddit_community_comments.findUniqueOrThrow({
      where: { id: props.commentId },
      select: { id: true },
    });
  const orderBy =
    sort === "created_at"
      ? ({
          created_at: order === "asc" ? "asc" : ("desc" as const),
        } as Prisma.reddit_community_comment_snapshotsOrderByWithRelationInput)
      : ({
          version: order === "asc" ? "asc" : ("desc" as const),
        } as Prisma.reddit_community_comment_snapshotsOrderByWithRelationInput);
  const skip = (page - 1) * limit;
  const data =
    await MyGlobal.prisma.reddit_community_comment_snapshots.findMany({
      where: { comment_id: props.commentId },
      orderBy: [orderBy],
      skip,
      take: limit,
      include: { author: true },
    });
  const total = await MyGlobal.prisma.reddit_community_comment_snapshots.count({
    where: { comment_id: props.commentId },
  });
  return {
    data: data.map((s) => ({
      id: s.id,
      content: s.content,
      version: s.version,
      created_at: toISOStringSafe(s.created_at),
      author: {
        id: s.author.id,
        username: s.author.username,
        created_at: toISOStringSafe(s.author.created_at),
      },
    })),
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: Math.ceil(total / limit),
    },
  };
}
