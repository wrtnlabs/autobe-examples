import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IRedditCommunityGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityGuest";
import { MemberPayload } from "../decorators/payload/MemberPayload";

export async function deleteRedditCommunityMemberMembersUsername(props: {
  member: MemberPayload;
  username: string;
}): Promise<IRedditCommunityGuest> {
  const member = await MyGlobal.prisma.reddit_community_members.findUnique({
    where: { username: props.username },
  });

  if (!member) {
    throw new HttpException("Member not found", 404);
  }

  if (member.id !== props.member.id) {
    throw new HttpException("You can only delete your own account", 403);
  }

  const posts = await MyGlobal.prisma.reddit_community_posts.findMany({
    where: {
      reddit_community_member_id: member.id,
      deleted_at: null,
    },
    select: { id: true },
  });

  const comments = await MyGlobal.prisma.reddit_community_comments.findMany({
    where: {
      reddit_community_member_id: member.id,
      deleted_at: null,
    },
    select: { id: true },
  });

  const postIds = posts.map((p) => p.id);
  const commentIds = comments.map((c) => c.id);

  const [postVotesSum, commentVotesSum] = await Promise.all([
    postIds.length > 0
      ? MyGlobal.prisma.reddit_community_post_votes.aggregate({
          where: {
            reddit_community_post_id: { in: postIds },
          },
          _sum: {
            vote_type: true,
          },
        })
      : { _sum: { vote_type: null } },
    commentIds.length > 0
      ? MyGlobal.prisma.reddit_community_comment_votes.aggregate({
          where: {
            reddit_community_comment_id: { in: commentIds },
          },
          _sum: {
            vote_type: true,
          },
        })
      : { _sum: { vote_type: null } },
  ]);

  const postKarma = postVotesSum._sum?.vote_type ?? 0;
  const commentKarma = commentVotesSum._sum?.vote_type ?? 0;
  const totalKarma = postKarma + commentKarma;

  await MyGlobal.prisma.reddit_community_members.delete({
    where: { id: member.id },
  });

  return {
    total_posts: posts.length,
    total_comments: comments.length,
    post_karma: postKarma,
    comment_karma: commentKarma,
    total_karma: totalKarma,
  };
}
