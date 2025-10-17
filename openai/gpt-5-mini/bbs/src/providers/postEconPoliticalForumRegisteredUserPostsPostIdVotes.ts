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

export async function postEconPoliticalForumRegisteredUserPostsPostIdVotes(props: {
  registeredUser: RegistereduserPayload;
  postId: string & tags.Format<"uuid">;
  body: IEconPoliticalForumVote.ICreate;
}): Promise<IEconPoliticalForumVote> {
  const { registeredUser, postId, body } = props;

  // Verify post existence and active state
  const post =
    await MyGlobal.prisma.econ_political_forum_posts.findUniqueOrThrow({
      where: { id: postId },
      select: { id: true, author_id: true, deleted_at: true },
    });

  if (post.deleted_at !== null) {
    throw new HttpException("Not Found", 404);
  }

  // Authorization: prevent self-voting
  if (post.author_id === registeredUser.id) {
    throw new HttpException("Unauthorized: cannot vote on your own post", 403);
  }

  // Find existing active vote for the user-post pair
  const existing = await MyGlobal.prisma.econ_political_forum_votes.findFirst({
    where: {
      registereduser_id: registeredUser.id,
      post_id: postId,
      deleted_at: null,
    },
  });

  const now = toISOStringSafe(new Date());

  if (existing) {
    // Idempotent behavior: if the requested value matches current, return it
    if (existing.value === body.value) {
      return {
        id: existing.id as string & tags.Format<"uuid">,
        registereduser_id: existing.registereduser_id as string &
          tags.Format<"uuid">,
        post_id: existing.post_id as string & tags.Format<"uuid">,
        value: existing.value as 1 | -1,
        created_at: toISOStringSafe(existing.created_at),
        updated_at: toISOStringSafe(existing.updated_at),
        deleted_at: existing.deleted_at
          ? toISOStringSafe(existing.deleted_at)
          : null,
      };
    }

    // Update existing vote value
    const updated = await MyGlobal.prisma.econ_political_forum_votes.update({
      where: { id: existing.id },
      data: {
        value: body.value,
        updated_at: now,
      },
    });

    return {
      id: updated.id as string & tags.Format<"uuid">,
      registereduser_id: updated.registereduser_id as string &
        tags.Format<"uuid">,
      post_id: updated.post_id as string & tags.Format<"uuid">,
      value: updated.value as 1 | -1,
      created_at: toISOStringSafe(updated.created_at),
      updated_at: toISOStringSafe(updated.updated_at),
      deleted_at: updated.deleted_at
        ? toISOStringSafe(updated.deleted_at)
        : null,
    };
  }

  // Create new vote record
  const created = await MyGlobal.prisma.econ_political_forum_votes.create({
    data: {
      id: v4() as string & tags.Format<"uuid">,
      registereduser_id: registeredUser.id,
      post_id: postId,
      value: body.value,
      created_at: now,
      updated_at: now,
      deleted_at: null,
    },
  });

  return {
    id: created.id as string & tags.Format<"uuid">,
    registereduser_id: created.registereduser_id as string &
      tags.Format<"uuid">,
    post_id: created.post_id as string & tags.Format<"uuid">,
    value: created.value as 1 | -1,
    created_at: toISOStringSafe(created.created_at),
    updated_at: toISOStringSafe(created.updated_at),
    deleted_at: created.deleted_at ? toISOStringSafe(created.deleted_at) : null,
  };
}
