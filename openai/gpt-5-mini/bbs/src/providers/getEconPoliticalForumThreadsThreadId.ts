import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IEconPoliticalForumThread } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconPoliticalForumThread";

export async function getEconPoliticalForumThreadsThreadId(props: {
  threadId: string & tags.Format<"uuid">;
}): Promise<IEconPoliticalForumThread> {
  const { threadId } = props;

  // Fetch thread with its category to evaluate visibility rules
  const thread = await MyGlobal.prisma.econ_political_forum_threads.findUnique({
    where: { id: threadId },
    include: { category: true },
  });

  if (!thread) {
    throw new HttpException("Not Found", 404);
  }

  // Soft-deleted thread is not visible to public callers
  if (thread.deleted_at) {
    throw new HttpException("Not Found", 404);
  }

  const category = thread.category;
  if (!category) {
    // Defensive: if relation missing, treat as not found
    throw new HttpException("Not Found", 404);
  }

  // If category is soft-deleted, do not reveal thread
  if (category.deleted_at) {
    throw new HttpException("Not Found", 404);
  }

  // Category-level visibility: moderated or requires verification
  // No auth provided in props, so public caller is not privileged
  if (category.is_moderated || category.requires_verification) {
    throw new HttpException("Forbidden", 403);
  }

  try {
    return {
      id: thread.id as string & tags.Format<"uuid">,
      category_id: thread.category_id as string & tags.Format<"uuid">,
      author_id: thread.author_id as string & tags.Format<"uuid">,
      title: thread.title,
      slug: thread.slug,
      status: thread.status,
      pinned: thread.pinned,
      created_at: toISOStringSafe(thread.created_at),
      updated_at: toISOStringSafe(thread.updated_at),
      deleted_at: thread.deleted_at ? toISOStringSafe(thread.deleted_at) : null,
    } satisfies IEconPoliticalForumThread;
  } catch (err) {
    throw new HttpException("Internal Server Error", 500);
  }
}
