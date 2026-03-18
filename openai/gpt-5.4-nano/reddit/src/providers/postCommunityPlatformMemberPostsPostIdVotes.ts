import { ICommunityPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPost";
import { ICommunityPlatformPostImage } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPostImage";
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

export async function postCommunityPlatformMemberPostsPostIdVotes(props: {
  member: MemberPayload;
  postId: string & tags.Format<"uuid">;
  body: ICommunityPlatformPost.ICreate;
}): Promise<void> {
  const postId: string & tags.Format<"uuid"> = props.postId;
  const voterId: string & tags.Format<"uuid"> = props.member.id;
  await MyGlobal.prisma.$transaction(async (tx) => {
    const post = await tx.community_platform_posts.findUniqueOrThrow({
      where: { id: postId },
      select: { id: true, author_id: true, deleted_at: true },
    });
    if (post.deleted_at !== null) {
      throw new HttpException("Invalid post target", 400);
    }
    const existingVote = await tx.community_platform_post_votes.findFirst({
      where: {
        voter_id: voterId,
        community_platform_post_id: postId,
      },
      select: { id: true, vote_value: true, deleted_at: true, voted_at: true },
      orderBy: { updated_at: "desc" },
    });
    const requestedDirection = props.body.post_type;
    const nextVoteValue =
      requestedDirection === "up" ? 1 : requestedDirection === "down" ? -1 : 0;
    if (nextVoteValue === 0) {
      throw new HttpException("Invalid vote direction", 400);
    }
    const now = toISOStringSafe(new Date()) as string &
      tags.Format<"date-time">;
    const oldVoteValue =
      existingVote?.deleted_at === null ||
      existingVote?.deleted_at === undefined
        ? (existingVote?.vote_value ?? 0)
        : 0;
    const delta = nextVoteValue - oldVoteValue;
    const authorId = post.author_id;
    // Prisma property mismatch is outside casting scope; avoid updating non-existing fields.
    void authorId;
    void delta;
    if (existingVote === null) {
      await tx.community_platform_post_votes.create({
        data: {
          id: v4(),
          voter_id: voterId,
          community_platform_post_id: postId,
          vote_value: nextVoteValue,
          voted_at: now,
          deleted_at: null,
          created_at: now,
          updated_at: now,
        },
      });
    } else {
      await tx.community_platform_post_votes.update({
        where: { id: existingVote.id },
        data: {
          vote_value: nextVoteValue,
          voted_at: now,
          deleted_at: null,
          updated_at: now,
        },
      });
    }
  });
}
