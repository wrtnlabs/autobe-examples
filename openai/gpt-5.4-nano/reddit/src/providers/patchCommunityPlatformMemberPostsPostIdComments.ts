import { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import { ICommunityPlatformPostVoteComment } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPostVoteComment";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageICommunityPlatformPostVoteComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformPostVoteComment";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { CommunityPlatformPostVoteCommentTransformer } from "../transformers/CommunityPlatformPostVoteCommentTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchCommunityPlatformMemberPostsPostIdComments(props: {
  member: MemberPayload;
  postId: string & tags.Format<"uuid">;
  body: ICommunityPlatformPostVoteComment.IRequest;
}): Promise<IPageICommunityPlatformPostVoteComment.ISummary> {
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 20;
  const sort = props.body.sort ?? "new";
  const post = await MyGlobal.prisma.community_platform_posts.findUniqueOrThrow(
    {
      where: { id: props.postId },
      select: { id: true, deleted_at: true },
    },
  );
  if (post.deleted_at !== null) {
    throw new HttpException("Post not found", 404);
  }
  const skip = (page - 1) * limit;
  const select = CommunityPlatformPostVoteCommentTransformer.select();
  const allComments =
    await MyGlobal.prisma.community_platform_comments.findMany({
      where: {
        community_platform_post_id: props.postId,
        deleted_at: null,
      },
      select: select as any,
    });
  const total = allComments.length;
  const commentsWithVotes = await (async () => {
    if (sort === "new") {
      return allComments.slice().sort((a: any, b: any) => {
        return (
          (toISOStringSafe(a.posted_at as never) ?? "").localeCompare(
            toISOStringSafe(b.posted_at as never) ?? "",
          ) * -1
        );
      });
    }
    const commentIds = allComments.map((c: any) => c.id as string);
    const voteDirections =
      await MyGlobal.prisma.community_platform_comment_votes.groupBy({
        by: ["comment_id", "vote_direction"],
        where: {
          comment_id: { in: commentIds },
          deleted_at: null,
        },
        _count: { id: true },
      });
    const dirMap = new Map<
      string,
      {
        up: number;
        down: number;
        total: number;
      }
    >();
    for (const row of voteDirections) {
      const id = row.comment_id;
      const voteDir = row.vote_direction;
      const count = row._count.id;
      const current = dirMap.get(id) ?? { up: 0, down: 0, total: 0 };
      if (voteDir > 0) current.up += count;
      else if (voteDir < 0) current.down += count;
      current.total += count;
      dirMap.set(id, current);
    }
    return allComments.slice().sort((a: any, b: any) => {
      const av = dirMap.get(a.id) ?? { up: 0, down: 0, total: 0 };
      const bv = dirMap.get(b.id) ?? { up: 0, down: 0, total: 0 };
      const aScore = av.up - av.down;
      const bScore = bv.up - bv.down;
      const aCount = av.total;
      const bCount = bv.total;
      if (sort === "best") {
        if (bScore !== aScore) return bScore - aScore;
        return (toISOStringSafe(b.posted_at as never) ?? "").localeCompare(
          toISOStringSafe(a.posted_at as never) ?? "",
        );
      }
      const aAbs = Math.abs(aScore);
      const bAbs = Math.abs(bScore);
      if (aAbs !== bAbs) return aAbs - bAbs;
      if (bCount !== aCount) return bCount - aCount;
      return (toISOStringSafe(b.posted_at as never) ?? "").localeCompare(
        toISOStringSafe(a.posted_at as never) ?? "",
      );
    });
  })();
  const pageComments = commentsWithVotes.slice(skip, skip + limit);
  const data = await ArrayUtil.asyncMap(pageComments, (c) =>
    CommunityPlatformPostVoteCommentTransformer.transform(
      c as unknown as Parameters<
        typeof CommunityPlatformPostVoteCommentTransformer.transform
      >[0],
    ),
  );
  return {
    data: data as unknown as IPageICommunityPlatformPostVoteComment.ISummary["data"],
    pagination: {
      current: page,
      limit,
      records: total,
      pages: Math.ceil(total / limit),
    } satisfies IPage.IPagination,
  };
}
