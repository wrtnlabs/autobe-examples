import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { ICommunityBbsCommentVote } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityBbsCommentVote";
import { CommunitymemberPayload } from "../decorators/payload/CommunitymemberPayload";

export async function postCommunityBbsCommunityMemberCommentsCommentIdVotes(props: {
  communityMember: CommunitymemberPayload;
  commentId: string & tags.Format<"uuid">;
  body: ICommunityBbsCommentVote.ICreate;
}): Promise<ICommunityBbsCommentVote> {
  const { communityMember, commentId, body } = props;

  // Business validation: ensure allowed vote values
  if (body.value !== 1 && body.value !== -1) {
    throw new HttpException("Bad Request: value must be 1 or -1", 400);
  }

  // Verify actor account and status
  const member = await MyGlobal.prisma.community_bbs_communitymember.findUnique(
    {
      where: { id: communityMember.id },
      select: { id: true, status: true },
    },
  );
  if (!member) throw new HttpException("Unauthorized", 401);
  if (member.status !== "registered_verified") {
    throw new HttpException("Forbidden: account not allowed to vote", 403);
  }

  // Verify comment existence
  const comment = await MyGlobal.prisma.community_bbs_comments.findUnique({
    where: { id: commentId },
    select: { id: true },
  });
  if (!comment)
    throw new HttpException("Not Found: comment does not exist", 404);

  const now = toISOStringSafe(new Date());
  const newValue = body.value;
  const voteKind = newValue === 1 ? "up" : "down";

  try {
    const result = await MyGlobal.prisma.$transaction(async (prisma) => {
      const existing = await prisma.community_bbs_comment_votes.findFirst({
        where: {
          community_bbs_comment_id: commentId,
          community_bbs_communitymember_id: communityMember.id,
        },
      });

      if (!existing) {
        const created = await prisma.community_bbs_comment_votes.create({
          data: {
            id: v4() as string & tags.Format<"uuid">,
            community_bbs_comment_id: commentId,
            community_bbs_communitymember_id: communityMember.id,
            value: newValue,
            vote_kind: voteKind,
            ip: body.ip ?? null,
            created_at: now,
            updated_at: now,
          },
        });

        await prisma.community_bbs_comments.update({
          where: { id: commentId },
          data: {
            score: { increment: newValue },
            ...(newValue === 1 && { upvotes: { increment: 1 } }),
            ...(newValue === -1 && { downvotes: { increment: 1 } }),
            updated_at: now,
          },
        });

        await prisma.community_bbs_audit_logs.create({
          data: {
            id: v4() as string & tags.Format<"uuid">,
            target_comment_id: commentId,
            actor_type: "community_member",
            actor_id: communityMember.id,
            entity: "comment_vote",
            action: "vote.create",
            payload: JSON.stringify({ value: newValue, ip: body.ip ?? null }),
            ip: body.ip ?? null,
            created_at: now,
            updated_at: now,
          },
        });

        return created;
      }

      // existing vote found
      if (existing.value === newValue) {
        const updated = await prisma.community_bbs_comment_votes.update({
          where: { id: existing.id },
          data: { updated_at: now, ip: body.ip ?? existing.ip ?? null },
        });

        await prisma.community_bbs_audit_logs.create({
          data: {
            id: v4() as string & tags.Format<"uuid">,
            target_comment_id: commentId,
            actor_type: "community_member",
            actor_id: communityMember.id,
            entity: "comment_vote",
            action: "vote.renew",
            payload: JSON.stringify({ value: newValue, ip: body.ip ?? null }),
            ip: body.ip ?? null,
            created_at: now,
            updated_at: now,
          },
        });

        return updated;
      }

      // Vote changed
      const delta = newValue - existing.value; // will be ±2
      const updated = await prisma.community_bbs_comment_votes.update({
        where: { id: existing.id },
        data: {
          value: newValue,
          vote_kind: voteKind,
          ip: body.ip ?? existing.ip ?? null,
          updated_at: now,
        },
      });

      await prisma.community_bbs_comments.update({
        where: { id: commentId },
        data: {
          score: { increment: delta },
          ...(existing.value === 1 &&
            newValue === -1 && { upvotes: { decrement: 1 } }),
          ...(existing.value === 1 &&
            newValue === -1 && { downvotes: { increment: 1 } }),
          ...(existing.value === -1 &&
            newValue === 1 && { downvotes: { decrement: 1 } }),
          ...(existing.value === -1 &&
            newValue === 1 && { upvotes: { increment: 1 } }),
          updated_at: now,
        },
      });

      await prisma.community_bbs_audit_logs.create({
        data: {
          id: v4() as string & tags.Format<"uuid">,
          target_comment_id: commentId,
          actor_type: "community_member",
          actor_id: communityMember.id,
          entity: "comment_vote",
          action: "vote.update",
          payload: JSON.stringify({
            from: existing.value,
            to: newValue,
            ip: body.ip ?? null,
          }),
          ip: body.ip ?? null,
          created_at: now,
          updated_at: now,
        },
      });

      return updated;
    });

    // Prepare return value with correct null/undefined patterns per DTO
    return {
      id: result.id,
      community_bbs_comment_id: result.community_bbs_comment_id,
      community_bbs_communitymember_id: result.community_bbs_communitymember_id,
      value: typia.assert<1 | -1>(result.value),
      vote_kind: result.vote_kind === "up" ? "up" : "down",
      ip: result.ip === null ? null : result.ip,
      created_at: result.created_at ? toISOStringSafe(result.created_at) : now,
      updated_at: result.updated_at ? toISOStringSafe(result.updated_at) : null,
      deleted_at: result.deleted_at ? toISOStringSafe(result.deleted_at) : null,
    };
  } catch (err) {
    if (err instanceof Prisma.PrismaClientKnownRequestError) {
      throw new HttpException("Conflict", 409);
    }
    throw new HttpException("Internal Server Error", 500);
  }
}
