import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IRedditCommunityGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityGuest";

export async function getRedditCommunityMembersUsernameProfile(props: {
  username: string;
}): Promise<IRedditCommunityGuest> {
  const member = await MyGlobal.prisma.reddit_community_members.findUnique({
    where: { username: props.username },
  });

  if (!member) {
    throw new HttpException("Member not found", 404);
  }

  const [totalPosts, totalComments, postKarma, commentKarma] =
    await Promise.all([
      MyGlobal.prisma.reddit_community_posts.count({
        where: { reddit_community_member_id: member.id },
      }),
      MyGlobal.prisma.reddit_community_comments.count({
        where: { reddit_community_member_id: member.id },
      }),
      MyGlobal.prisma.reddit_community_post_votes
        .aggregate({
          where: { post: { reddit_community_member_id: member.id } },
          _sum: { vote_type: true },
        })
        .then((result) => result._sum?.vote_type ?? 0),
      MyGlobal.prisma.reddit_community_comment_votes
        .aggregate({
          where: { comment: { reddit_community_member_id: member.id } },
          _sum: { vote_type: true },
        })
        .then((result) => result._sum?.vote_type ?? 0),
    ]);

  const totalKarma = postKarma + commentKarma;

  return {
    total_posts: totalPosts,
    total_comments: totalComments,
    post_karma: postKarma,
    comment_karma: commentKarma,
    total_karma: totalKarma,
  };
}
