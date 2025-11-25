import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IRedditCommunityMemberKarma } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityMemberKarma";

export async function getRedditCommunityMembersUsernameKarma(props: {
  username: string;
}): Promise<IRedditCommunityMemberKarma> {
  const member = await MyGlobal.prisma.reddit_community_members.findUnique({
    where: { username: props.username },
  });

  if (!member) {
    throw new HttpException("Member not found", 404);
  }

  const [postVotesAgg, commentVotesAgg] = await Promise.all([
    MyGlobal.prisma.reddit_community_post_votes.aggregate({
      where: {
        post: {
          reddit_community_member_id: member.id,
        },
      },
      _sum: {
        vote_type: true,
      },
    }),
    MyGlobal.prisma.reddit_community_comment_votes.aggregate({
      where: {
        comment: {
          reddit_community_member_id: member.id,
        },
      },
      _sum: {
        vote_type: true,
      },
    }),
  ]);

  const post_karma = postVotesAgg._sum.vote_type ?? 0;
  const comment_karma = commentVotesAgg._sum.vote_type ?? 0;
  const total_karma = post_karma + comment_karma;

  return {
    total_karma,
    post_karma,
    comment_karma,
  };
}
