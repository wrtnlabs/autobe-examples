import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IEconPoliticalForumVote } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconPoliticalForumVote";
import { RegistereduserPayload } from "../decorators/payload/RegistereduserPayload";

export async function putEconPoliticalForumRegisteredUserPostsPostIdVotesVoteId(props: {
  registeredUser: RegistereduserPayload;
  postId: string & tags.Format<"uuid">;
  voteId: string & tags.Format<"uuid">;
  body: IEconPoliticalForumVote.IUpdate;
}): Promise<IEconPoliticalForumVote> {
  const { registeredUser, postId, voteId, body } = props;

  // Validate input value
  if (body.value === undefined || (body.value !== 1 && body.value !== -1)) {
    throw new HttpException(
      "Bad Request: 'value' must be provided and be either 1 or -1",
      400,
    );
  }

  // Verify post exists and is active
  const post = await MyGlobal.prisma.econ_political_forum_posts.findUnique({
    where: { id: postId },
    select: { id: true, deleted_at: true },
  });
  if (!post || post.deleted_at !== null) {
    throw new HttpException("Post not found", 404);
  }

  // Verify vote exists and is active
  const vote = await MyGlobal.prisma.econ_political_forum_votes.findUnique({
    where: { id: voteId },
    select: {
      id: true,
      registereduser_id: true,
      post_id: true,
      value: true,
      created_at: true,
      updated_at: true,
      deleted_at: true,
    },
  });
  if (!vote || vote.deleted_at !== null) {
    throw new HttpException("Vote not found", 404);
  }

  if (vote.post_id !== postId) {
    throw new HttpException("Vote not found for given post", 404);
  }

  // Ownership enforcement
  if (vote.registereduser_id !== registeredUser.id) {
    throw new HttpException(
      "Unauthorized: You can only update your own vote",
      403,
    );
  }

  // Business rule: prevent updates when post under active legal hold
  const legalHold =
    await MyGlobal.prisma.econ_political_forum_legal_holds.findFirst({
      where: { post_id: postId, is_active: true },
      select: { id: true },
    });
  if (legalHold) {
    throw new HttpException(
      "Forbidden: Post is under legal hold and cannot be modified",
      403,
    );
  }

  // Idempotency: return current representation if no change
  if (vote.value === body.value) {
    return {
      id: vote.id,
      registereduser_id: vote.registereduser_id,
      post_id: vote.post_id,
      value: typia.assert<1 | -1>(vote.value),
      created_at: toISOStringSafe(vote.created_at),
      updated_at: toISOStringSafe(vote.updated_at),
      deleted_at: vote.deleted_at
        ? toISOStringSafe(vote.deleted_at)
        : undefined,
    };
  }

  const now = toISOStringSafe(new Date());

  // Perform atomic update and audit creation within a transaction callback
  const result = await MyGlobal.prisma.$transaction(async (tx) => {
    const updated = await tx.econ_political_forum_votes.update({
      where: { id: voteId },
      data: {
        value: body.value,
        updated_at: now,
      },
      select: {
        id: true,
        registereduser_id: true,
        post_id: true,
        value: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
      },
    });

    await tx.econ_political_forum_audit_logs.create({
      data: {
        id: v4(),
        registereduser_id: registeredUser.id,
        action_type: "update_vote",
        target_type: "vote",
        target_identifier: voteId,
        details: `Vote updated to ${body.value}`,
        created_at: now,
        created_by_system: false,
      },
    });

    return updated;
  });

  return {
    id: result.id,
    registereduser_id: result.registereduser_id,
    post_id: result.post_id,
    value: typia.assert<1 | -1>(result.value),
    created_at: toISOStringSafe(result.created_at),
    updated_at: toISOStringSafe(result.updated_at),
    deleted_at: result.deleted_at
      ? toISOStringSafe(result.deleted_at)
      : undefined,
  };
}
