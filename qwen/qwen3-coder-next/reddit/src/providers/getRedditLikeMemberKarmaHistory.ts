import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
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

export async function getRedditLikeMemberKarmaHistory(props: {
  member: MemberPayload;
}): Promise<IRedditLikeMember.IKarmaHistory[]> {
  const postVotes = await MyGlobal.prisma.reddit_like_post_votes.findMany({
    where: {
      post: {
        author_id: props.member.id,
        deleted_at: null,
      },
    },
    include: {
      post: {
        select: {
          author: {
            select: {
              id: true,
              created_at: true,
            },
          },
        },
      },
    },
  });
  const commentVotes = await MyGlobal.prisma.reddit_like_comment_votes.findMany(
    {
      where: {
        comment: {
          author_id: props.member.id,
          deleted_at: null,
        },
      },
      include: {
        comment: {
          select: {
            author: {
              select: {
                id: true,
                created_at: true,
              },
            },
          },
        },
      },
    },
  );
  const postHistory = postVotes.map((vote) => ({
    id: vote.id,
    content_id: vote.post_id,
    content_type: "post" as const,
    vote_value: vote.value,
    vote_created_at: toISOStringSafe(vote.created_at) ?? "",
    karma_change: vote.value,
    author: {
      id: vote.post.author.id,
      created_at: toISOStringSafe(vote.post.author.created_at) ?? "",
      entity_type: "post" as const,
      title: vote.post.author.id,
      content: "",
      score: 0,
      hit_count: 0,
    } satisfies IRedditLikeMember.ISummary,
  }));
  const commentHistory = commentVotes.map((vote) => ({
    id: vote.id,
    content_id: vote.reddit_like_comment_id,
    content_type: "comment" as const,
    vote_value: vote.value,
    vote_created_at: toISOStringSafe(vote.created_at) ?? "",
    karma_change: vote.value,
    author: {
      id: vote.comment.author.id,
      created_at: toISOStringSafe(vote.comment.author.created_at) ?? "",
      entity_type: "comment" as const,
      title: vote.comment.author.id,
      content: "",
      score: 0,
      hit_count: 0,
    } satisfies IRedditLikeMember.ISummary,
  }));
  return [...postHistory, ...commentHistory];
}
