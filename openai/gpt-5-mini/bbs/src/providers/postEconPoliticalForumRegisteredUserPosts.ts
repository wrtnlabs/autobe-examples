import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IEconPoliticalForumPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconPoliticalForumPost";
import { RegistereduserPayload } from "../decorators/payload/RegistereduserPayload";

export async function postEconPoliticalForumRegisteredUserPosts(props: {
  registeredUser: RegistereduserPayload;
  body: IEconPoliticalForumPost.ICreate;
}): Promise<IEconPoliticalForumPost> {
  const { registeredUser, body } = props;

  // Authentication existence check
  if (!registeredUser || !registeredUser.id)
    throw new HttpException("Unauthorized", 401);

  // Content validation
  if (
    typeof body.content !== "string" ||
    body.content.length < 10 ||
    body.content.length > 50000
  ) {
    throw new HttpException(
      "Bad Request: content length must be between 10 and 50000 characters",
      400,
    );
  }

  // Load author from DB and validate status
  let user;
  try {
    user =
      await MyGlobal.prisma.econ_political_forum_registereduser.findUniqueOrThrow(
        {
          where: { id: registeredUser.id },
        },
      );
  } catch (err) {
    throw new HttpException("Unauthorized", 401);
  }

  if (user.deleted_at !== null) throw new HttpException("Unauthorized", 401);
  if (user.is_banned === true)
    throw new HttpException("Forbidden: user is banned", 403);

  // Load thread with category
  let thread;
  try {
    thread =
      await MyGlobal.prisma.econ_political_forum_threads.findUniqueOrThrow({
        where: { id: body.thread_id },
        include: { category: true },
      });
  } catch (err) {
    throw new HttpException("Not Found: thread", 404);
  }

  if (thread.deleted_at !== null)
    throw new HttpException("Not Found: thread", 404);
  const category = thread.category;
  if (!category) throw new HttpException("Not Found: category", 404);

  // Category gating: email verification
  if (category.requires_verification === true && user.email_verified !== true) {
    throw new HttpException(
      "Forbidden: email verification required to post in this category",
      403,
    );
  }

  // Parent integrity & nesting depth enforcement
  const MAX_DEPTH = 3;
  if (body.parent_id !== undefined && body.parent_id !== null) {
    let depth = 1;
    // Strip typia tags from the incoming body.parent_id so we can compare/assign plain ids
    let currentParentId = body.parent_id satisfies string | null | undefined as
      | string
      | null
      | undefined;

    while (currentParentId !== null && currentParentId !== undefined) {
      const parent =
        await MyGlobal.prisma.econ_political_forum_posts.findUnique({
          where: { id: currentParentId },
        });
      if (!parent) throw new HttpException("Not Found: parent post", 404);
      if (parent.thread_id !== body.thread_id)
        throw new HttpException(
          "Conflict: parent post belongs to a different thread",
          409,
        );
      if (parent.deleted_at !== null)
        throw new HttpException("Conflict: parent post is deleted", 409);
      if (depth >= MAX_DEPTH)
        throw new HttpException("Conflict: reply nesting depth exceeded", 409);
      depth += 1;
      // parent.parent_id is a plain string | null from Prisma; assign back to the plain local variable
      currentParentId = parent.parent_id ?? null;
    }
  }

  // Rate limiting (simple sliding window using DB): max 10 posts per 60 seconds
  const windowMs = 60_000;
  const recentCount = await MyGlobal.prisma.econ_political_forum_posts.count({
    where: {
      author_id: user.id,
      created_at: { gte: new Date(Date.now() - windowMs) },
    },
  });
  if (recentCount >= 10)
    throw new HttpException("Too Many Requests: rate limit exceeded", 429);

  // Prepare timestamps
  const now = toISOStringSafe(new Date());

  // Create canonical post record
  const created = await MyGlobal.prisma.econ_political_forum_posts.create({
    data: {
      id: v4() as string & tags.Format<"uuid">,
      thread_id: body.thread_id,
      author_id: user.id,
      parent_id: body.parent_id ?? null,
      content: body.content,
      is_edited: false,
      edited_at: null,
      is_hidden: category.is_moderated ? true : false,
      created_at: now,
      updated_at: now,
      deleted_at: null,
    },
  });

  // Synchronous audit log entry
  await MyGlobal.prisma.econ_political_forum_audit_logs.create({
    data: {
      id: v4() as string & tags.Format<"uuid">,
      registereduser_id: user.id,
      post_id: created.id,
      action_type: "create",
      target_type: "post",
      target_identifier: created.id,
      details: `Post created in thread ${thread.id}`,
      created_at: now,
      created_by_system: false,
    },
  });

  // Fire-and-forget background side-effect marker (non-blocking)
  void (async () => {
    try {
      await MyGlobal.prisma.econ_political_forum_audit_logs.create({
        data: {
          id: v4() as string & tags.Format<"uuid">,
          registereduser_id: user.id,
          post_id: created.id,
          action_type: "enqueue",
          target_type: "post",
          target_identifier: created.id,
          details: "Enqueued notification/indexing jobs",
          created_at: toISOStringSafe(new Date()),
          created_by_system: true,
        },
      });
    } catch (err) {
      // Intentionally swallow background errors
    }
  })();

  // Map DB result into IEconPoliticalForumPost format with correct null/undefined handling
  return {
    id: created.id as string & tags.Format<"uuid">,
    thread_id: created.thread_id as string & tags.Format<"uuid">,
    author_id: created.author_id as string & tags.Format<"uuid">,
    parent_id:
      created.parent_id === null
        ? null
        : (created.parent_id as string & tags.Format<"uuid">),
    content: created.content,
    is_edited: created.is_edited,
    edited_at: created.edited_at ? toISOStringSafe(created.edited_at) : null,
    is_hidden: created.is_hidden,
    created_at: toISOStringSafe(created.created_at),
    updated_at: toISOStringSafe(created.updated_at),
    deleted_at: created.deleted_at
      ? toISOStringSafe(created.deleted_at)
      : undefined,
  };
}
