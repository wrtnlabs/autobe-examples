import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIRedditLikePostSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditLikePostSnapshot";
import { IRedditLikeMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeMember";
import { IRedditLikePostSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikePostSnapshot";
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

export async function patchRedditLikeMemberPostsPostIdSnapshots(props: {
  member: MemberPayload;
  postId: string;
  body: IRedditLikePostSnapshot.IRequest;
}): Promise<IPageIRedditLikePostSnapshot> {
  const limit = Math.min(Math.max(props.body.limit ?? 10, 1), 100);
  const page = Math.max(props.body.page ?? 1, 1);
  const skip = (page - 1) * limit;
  const [snapshots, total] = await Promise.all([
    MyGlobal.prisma.reddit_like_post_snapshots.findMany({
      where: { post_id: props.postId },
      orderBy: { snapshot_created_at: "desc" },
      skip: skip,
      take: limit,
      select: {
        id: true,
        post_id: true,
        author_id: true,
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
        author: {
          select: {
            id: true,
            username: true,
            display_name: true,
            bio: true,
            avatar_url: true,
            karma_score: true,
            created_at: true,
          },
        },
      },
    }),
    MyGlobal.prisma.reddit_like_post_snapshots.count({
      where: { post_id: props.postId },
    }),
  ]);
  return {
    data: await ArrayUtil.asyncMap(snapshots, async (s) => {
      const authorSummary = s.author
        ? ({
            id: s.author.id as string & tags.Format<"uuid">,
            username: s.author.username,
            display_name: s.author.display_name,
            bio: s.author.bio ?? null,
            avatar_url: s.author.avatar_url ?? null,
            karma_score: s.author.karma_score,
            created_at: s.author.created_at.toISOString() as string &
              tags.Format<"date-time">,
          } satisfies IRedditLikeMember.ISummary)
        : ({
            id: s.author_id as string & tags.Format<"uuid">,
            username: "",
            display_name: "",
            bio: null,
            avatar_url: null,
            karma_score: 0,
            created_at: new Date().toISOString() as string &
              tags.Format<"date-time">,
          } satisfies IRedditLikeMember.ISummary);
      return {
        id: s.id as string & tags.Format<"uuid">,
        postId: s.post_id as string & tags.Format<"uuid">,
        author: authorSummary,
        title: s.title,
        type: s.type as "text" | "link" | "image",
        content: s.content ?? "",
        url: (s.url ?? "") as string & tags.Format<"uri">,
        imageUrl: (s.image_url ?? "") as string & tags.Format<"uri">,
        score: s.vote_score,
        commentCount: s.comment_count,
        createdAt: s.created_at.toISOString() as string &
          tags.Format<"date-time">,
        updatedAt: s.updated_at?.toISOString() ?? null,
        deletedAt: s.deleted_at?.toISOString() ?? null,
        snapshotCreatedAt: s.snapshot_created_at.toISOString() as string &
          tags.Format<"date-time">,
      } satisfies IRedditLikePostSnapshot;
    }),
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: limit > 0 ? Math.ceil(total / limit) : 0,
    } satisfies IPage.IPagination,
  };
}
