import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { ICommunityPortalVote } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPortalVote";
import { MemberPayload } from "../decorators/payload/MemberPayload";

export async function putCommunityPortalMemberPostsPostIdVotesVoteId(props: {
  member: MemberPayload;
  postId: string & tags.Format<"uuid">;
  voteId: string & tags.Format<"uuid">;
  body: ICommunityPortalVote.IUpdate;
}): Promise<ICommunityPortalVote> {
  const { member, postId, voteId, body } = props;

  // Retrieve existing vote
  const existing = await MyGlobal.prisma.community_portal_votes.findUnique({
    where: { id: voteId },
  });

  if (!existing || existing.deleted_at !== null) {
    throw new HttpException("Not Found", 404);
  }

  // Ensure the vote targets the specified post
  if (existing.post_id !== postId) {
    throw new HttpException(
      "Bad Request: vote does not belong to the specified post",
      400,
    );
  }

  // Authorization: only the vote owner may update
  if (existing.user_id !== member.id) {
    throw new HttpException(
      "Forbidden: only the vote owner can modify this resource",
      403,
    );
  }

  // Business validation: value must be provided
  if (body.value === undefined || body.value === null) {
    throw new HttpException("Bad Request: value is required", 400);
  }

  // Perform update (inline data object to preserve clear type errors)
  const updated = await MyGlobal.prisma.community_portal_votes.update({
    where: { id: voteId },
    data: {
      value: body.value ?? undefined,
      updated_at: toISOStringSafe(new Date()),
    },
  });

  // Map database result to API DTO, converting dates to ISO strings
  return {
    id: updated.id as string & tags.Format<"uuid">,
    user_id: updated.user_id as string & tags.Format<"uuid">,
    post_id:
      updated.post_id === null
        ? null
        : (updated.post_id as string & tags.Format<"uuid">),
    comment_id:
      updated.comment_id === null
        ? null
        : (updated.comment_id as string & tags.Format<"uuid">),
    value: updated.value as unknown as 1 | -1,
    created_at: toISOStringSafe(updated.created_at),
    updated_at: toISOStringSafe(updated.updated_at),
    deleted_at: updated.deleted_at
      ? toISOStringSafe(updated.deleted_at)
      : undefined,
  };
}
