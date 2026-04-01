import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIRedditLikeComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditLikeComment";
import { IRedditLikeComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeComment";
import { IRedditLikeMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeMember";
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

export async function patchRedditLikeMemberComments(props: {
  member: MemberPayload;
  body: IRedditLikeComment.IRequest;
}): Promise<IPageIRedditLikeComment.ISummary> {
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 20;
  const skip = (page - 1) * limit;
  const baseWhere = {
    ...(props.body.authorId !== null && { author_id: props.body.authorId }),
    ...(props.body.parentId !== null
      ? { parent_id: props.body.parentId }
      : { parent_id: null }),
    ...(props.body.search !== null &&
      props.body.search.length > 0 && {
        content: {
          contains: props.body.search,
          mode: "insensitive" as const,
        },
      }),
  } satisfies Prisma.reddit_like_commentsWhereInput;
  const whereInput: Prisma.reddit_like_commentsWhereInput = props.body
    .includeDeleted
    ? baseWhere
    : {
        ...baseWhere,
        OR: [{ is_deleted: false }, { author_id: props.member.id }],
      };
  const orderByInput = (
    props.body.sort === "BEST"
      ? { vote_score: "desc" as const }
      : props.body.sort === "NEW"
        ? { created_at: "desc" as const }
        : props.body.sort === "OLD"
          ? { created_at: "asc" as const }
          : props.body.sort === "TOP"
            ? { vote_score: "desc" as const }
            : props.body.sort === "CONTROVERSIAL"
              ? { vote_score: "asc" as const }
              : { created_at: "desc" as const }
  ) satisfies Prisma.reddit_like_commentsOrderByWithRelationInput;
  const comments = await MyGlobal.prisma.reddit_like_comments.findMany({
    where: whereInput,
    orderBy: orderByInput,
    skip,
    take: limit,
    select: {
      id: true,
      content: true,
      vote_score: true,
      is_edited: true,
      is_deleted: true,
      created_at: true,
      parent_id: true,
      author: {
        select: {
          id: true,
          email: true,
          username: true,
          email_verified: true,
          created_at: true,
        },
      },
      _count: {
        select: {
          replies: true,
        },
      },
    },
  });
  const total = await MyGlobal.prisma.reddit_like_comments.count({
    where: whereInput,
  });
  const data: IRedditLikeComment.ISummary[] = comments.map((comment) => ({
    id: comment.id,
    content: comment.content,
    author: {
      id: comment.author.id,
      email: comment.author.email,
      username: comment.author.username,
      emailVerified: comment.author.email_verified,
      createdAt: comment.author.created_at.toISOString(),
    },
    vote_score: comment.vote_score,
    is_edited: comment.is_edited,
    is_deleted: comment.is_deleted,
    created_at: comment.created_at.toISOString(),
    parent_id: comment.parent_id,
    reply_count: comment._count.replies,
  }));
  return {
    data,
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: Math.ceil(total / limit),
    },
  };
}
