import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
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

export async function deleteRedditLikeCommunityMemberProfile(props: {
  member: MemberPayload;
}): Promise<void> {
  const memberId = props.member.id;
  const member = await MyGlobal.prisma.reddit_like_community_members.findUnique(
    {
      where: { id: memberId },
      select: { id: true, deleted_at: true },
    },
  );
  if (member === null || member.deleted_at !== null) {
    throw new HttpException("Member not found or already deleted", 404);
  }
  await MyGlobal.prisma.$transaction(async (tx) => {
    const posts = await tx.reddit_like_community_posts.findMany({
      where: { author_id: memberId },
      select: { id: true },
    });
    const postIds = posts.map((p) => p.id);
    const comments = await tx.reddit_like_community_comments.findMany({
      where: { member_id: memberId },
      select: { id: true },
    });
    const commentIds = comments.map((c) => c.id);
    const postVotes =
      postIds.length > 0
        ? await tx.reddit_like_community_post_votes.findMany({
            where: { reddit_like_community_post_id: { in: postIds } },
            select: {
              reddit_like_community_member_id: true,
              direction: true,
            },
          })
        : [];
    const commentVotes =
      commentIds.length > 0
        ? await tx.reddit_like_community_comment_votes.findMany({
            where: { reddit_like_community_comment_id: { in: commentIds } },
            select: {
              reddit_like_community_member_id: true,
              direction: true,
            },
          })
        : [];
    const karmaDeltas = new Map<string, number>();
    for (const vote of postVotes) {
      const voterId = vote.reddit_like_community_member_id;
      const delta = vote.direction === "up" ? -1 : 1;
      karmaDeltas.set(voterId, (karmaDeltas.get(voterId) ?? 0) + delta);
    }
    for (const vote of commentVotes) {
      const voterId = vote.reddit_like_community_member_id;
      const delta = vote.direction === "up" ? -1 : 1;
      karmaDeltas.set(voterId, (karmaDeltas.get(voterId) ?? 0) + delta);
    }
    for (const [voterId, delta] of karmaDeltas.entries()) {
      await tx.reddit_like_community_profiles.update({
        where: { reddit_like_community_member_id: voterId },
        data: { karma: { increment: delta } },
      });
    }
    await tx.reddit_like_community_reports.updateMany({
      where: { resolved_by_member_id: memberId },
      data: { resolved_by_member_id: null },
    });
    await tx.reddit_like_community_community_subscriptions.deleteMany({
      where: { member_id: memberId },
    });
    await tx.reddit_like_community_moderators.deleteMany({
      where: { reddit_like_community_member_id: memberId },
    });
    await tx.reddit_like_community_reports.deleteMany({
      where: { reported_by_member_id: memberId },
    });
    await tx.reddit_like_community_members.update({
      where: { id: memberId },
      data: { deleted_at: new Date() },
    });
  });
}


//--------------------------------------------------------------
// TEMPLATE CODE
//--------------------------------------------------------------
// Complete the code below, disregard the import part and return only the function part.
// 
// ```typescript
// import { ArrayUtil } from "@nestia/e2e";
// import { HttpException } from "@nestjs/common";
// import { Prisma } from "@prisma/sdk";
// import jwt from "jsonwebtoken";
// import typia, { tags } from "typia";
// import { v4 } from "uuid";
// import { MyGlobal } from "../MyGlobal";
// import { PasswordUtil } from "../utils/PasswordUtil";
// import { toISOStringSafe } from "../utils/toISOStringSafe"
// 
// import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
// 
// // DON'T CHANGE FUNCTION NAME AND PARAMETERS,
// // ONLY YOU HAVE TO WRITE THIS FUNCTION BODY, AND USE IMPORTED.
// export async function deleteRedditLikeCommunityMemberProfile(props: {
//   member: MemberPayload;
// }): Promise<void> {
//   await MyGlobal.prisma.....delete({
//     where: { ... },
//   });
// }
// ```
//--------------------------------------------------------------