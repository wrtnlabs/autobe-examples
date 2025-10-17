import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IEconDiscussPostVote } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconDiscussPostVote";
import { IEEconDiscussVoteType } from "@ORGANIZATION/PROJECT-api/lib/structures/IEEconDiscussVoteType";
import { MemberPayload } from "../decorators/payload/MemberPayload";

export async function postEconDiscussMemberPostsPostIdVotes(props: {
  member: MemberPayload;
  postId: string & tags.Format<"uuid">;
  body: IEconDiscussPostVote.ICreate;
}): Promise<void> {
  const { member, postId, body } = props;

  // 1) Verify target post exists and is not soft-deleted
  const post = await MyGlobal.prisma.econ_discuss_posts.findUnique({
    where: { id: postId },
    select: { id: true, econ_discuss_user_id: true, deleted_at: true },
  });
  if (!post || post.deleted_at !== null) {
    throw new HttpException("Not Found", 404);
  }

  // 2) Forbid self-vote
  if (post.econ_discuss_user_id === member.id) {
    throw new HttpException("Forbidden: You cannot vote on your own post", 403);
  }

  // 3) Check existing vote by composite unique key
  const existing = await MyGlobal.prisma.econ_discuss_post_votes.findUnique({
    where: {
      econ_discuss_user_id_econ_discuss_post_id: {
        econ_discuss_user_id: member.id,
        econ_discuss_post_id: postId,
      },
    },
    select: { id: true, vote_type: true },
  });

  if (existing) {
    if (existing.vote_type === body.vote_type) {
      return; // Idempotent - no change needed
    }
    const now = toISOStringSafe(new Date());
    await MyGlobal.prisma.econ_discuss_post_votes.update({
      where: { id: existing.id },
      data: {
        vote_type: body.vote_type,
        status: "switched",
        updated_at: now,
      },
    });
    return;
  }

  // 4) Create new vote (handle race via unique violation)
  const now = toISOStringSafe(new Date());
  try {
    await MyGlobal.prisma.econ_discuss_post_votes.create({
      data: {
        id: v4(),
        econ_discuss_user_id: member.id,
        econ_discuss_post_id: postId,
        vote_type: body.vote_type,
        status: "active",
        created_at: now,
        updated_at: now,
      },
    });
    return;
  } catch (err) {
    if (
      err instanceof Prisma.PrismaClientKnownRequestError &&
      err.code === "P2002"
    ) {
      // Another concurrent request created the row; re-evaluate idempotency
      const current = await MyGlobal.prisma.econ_discuss_post_votes.findUnique({
        where: {
          econ_discuss_user_id_econ_discuss_post_id: {
            econ_discuss_user_id: member.id,
            econ_discuss_post_id: postId,
          },
        },
        select: { id: true, vote_type: true },
      });
      if (!current) return; // Should not happen, but safe-guard
      if (current.vote_type === body.vote_type) return; // Idempotent
      const later = toISOStringSafe(new Date());
      await MyGlobal.prisma.econ_discuss_post_votes.update({
        where: { id: current.id },
        data: {
          vote_type: body.vote_type,
          status: "switched",
          updated_at: later,
        },
      });
      return;
    }
    throw err;
  }
}
