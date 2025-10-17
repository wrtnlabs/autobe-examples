import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IEconPoliticalForumThreadTag } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconPoliticalForumThreadTag";
import { RegistereduserPayload } from "../decorators/payload/RegistereduserPayload";

export async function postEconPoliticalForumRegisteredUserThreadsThreadIdTags(props: {
  registeredUser: RegistereduserPayload;
  threadId: string & tags.Format<"uuid">;
  body: IEconPoliticalForumThreadTag.ICreate;
}): Promise<IEconPoliticalForumThreadTag> {
  const { registeredUser, threadId, body } = props;

  // Ensure path parameter matches body
  if (body.thread_id !== threadId) {
    throw new HttpException(
      "Bad Request: threadId path parameter and body.thread_id mismatch",
      400,
    );
  }

  // Use transaction to avoid race conditions
  return await MyGlobal.prisma.$transaction(async (prisma) => {
    // Verify thread exists and active
    const thread = await prisma.econ_political_forum_threads.findFirst({
      where: { id: threadId, deleted_at: null },
      select: { id: true, author_id: true },
    });
    if (!thread) throw new HttpException("Thread not found", 404);

    // Verify tag exists and active
    const tag = await prisma.econ_political_forum_tags.findFirst({
      where: { id: body.tag_id, deleted_at: null },
      select: { id: true },
    });
    if (!tag) throw new HttpException("Tag not found", 404);

    // Authorization: thread author OR active moderator/admin
    const isAuthor = thread.author_id === registeredUser.id;
    if (!isAuthor) {
      const moderator = await prisma.econ_political_forum_moderator.findFirst({
        where: { registereduser_id: registeredUser.id, deleted_at: null },
        select: { id: true },
      });
      const admin = await prisma.econ_political_forum_administrator.findFirst({
        where: { registereduser_id: registeredUser.id, deleted_at: null },
        select: { id: true },
      });
      if (!moderator && !admin) {
        throw new HttpException(
          "Unauthorized: Only thread author or moderator/admin can attach tags",
          403,
        );
      }
    }

    const now = toISOStringSafe(new Date());

    // Check for existing mapping
    const existing = await prisma.econ_political_forum_thread_tags.findFirst({
      where: { thread_id: threadId, tag_id: body.tag_id },
    });

    if (existing) {
      // If active mapping exists, return it
      if (existing.deleted_at === null) {
        return {
          id: existing.id as string & tags.Format<"uuid">,
          thread_id: existing.thread_id as string & tags.Format<"uuid">,
          tag_id: existing.tag_id as string & tags.Format<"uuid">,
          created_at: toISOStringSafe(existing.created_at),
          deleted_at: null,
        } satisfies IEconPoliticalForumThreadTag;
      }

      // Reactivate soft-deleted mapping
      const reactivated = await prisma.econ_political_forum_thread_tags.update({
        where: { id: existing.id },
        data: { deleted_at: null },
      });

      await prisma.econ_political_forum_audit_logs.create({
        data: {
          id: v4() as string & tags.Format<"uuid">,
          registereduser_id: registeredUser.id,
          action_type: "reactivate_tag",
          target_type: "thread_tag",
          target_identifier: reactivated.id,
          details: JSON.stringify({ thread_id: threadId, tag_id: body.tag_id }),
          created_at: now,
          created_by_system: false,
        },
      });

      return {
        id: reactivated.id as string & tags.Format<"uuid">,
        thread_id: reactivated.thread_id as string & tags.Format<"uuid">,
        tag_id: reactivated.tag_id as string & tags.Format<"uuid">,
        created_at: toISOStringSafe(reactivated.created_at),
        deleted_at: null,
      } satisfies IEconPoliticalForumThreadTag;
    }

    // No existing mapping: attempt create, handle unique race
    try {
      const created = await prisma.econ_political_forum_thread_tags.create({
        data: {
          id: v4() as string & tags.Format<"uuid">,
          thread_id: threadId,
          tag_id: body.tag_id,
          created_at: now,
        },
      });

      await prisma.econ_political_forum_audit_logs.create({
        data: {
          id: v4() as string & tags.Format<"uuid">,
          registereduser_id: registeredUser.id,
          action_type: "attach_tag",
          target_type: "thread_tag",
          target_identifier: created.id,
          details: JSON.stringify({ thread_id: threadId, tag_id: body.tag_id }),
          created_at: now,
          created_by_system: false,
        },
      });

      return {
        id: created.id as string & tags.Format<"uuid">,
        thread_id: created.thread_id as string & tags.Format<"uuid">,
        tag_id: created.tag_id as string & tags.Format<"uuid">,
        created_at: toISOStringSafe(created.created_at),
        deleted_at: null,
      } satisfies IEconPoliticalForumThreadTag;
    } catch (e) {
      if (
        e instanceof Prisma.PrismaClientKnownRequestError &&
        e.code === "P2002"
      ) {
        // Unique constraint conflict - fetch canonical record
        const canonical =
          await prisma.econ_political_forum_thread_tags.findFirst({
            where: { thread_id: threadId, tag_id: body.tag_id },
          });
        if (!canonical)
          throw new HttpException("Conflict: failed to create mapping", 409);

        if (canonical.deleted_at === null) {
          return {
            id: canonical.id as string & tags.Format<"uuid">,
            thread_id: canonical.thread_id as string & tags.Format<"uuid">,
            tag_id: canonical.tag_id as string & tags.Format<"uuid">,
            created_at: toISOStringSafe(canonical.created_at),
            deleted_at: null,
          } satisfies IEconPoliticalForumThreadTag;
        }

        const reactivated =
          await prisma.econ_political_forum_thread_tags.update({
            where: { id: canonical.id },
            data: { deleted_at: null },
          });

        await prisma.econ_political_forum_audit_logs.create({
          data: {
            id: v4() as string & tags.Format<"uuid">,
            registereduser_id: registeredUser.id,
            action_type: "reactivate_tag",
            target_type: "thread_tag",
            target_identifier: reactivated.id,
            details: JSON.stringify({
              thread_id: threadId,
              tag_id: body.tag_id,
            }),
            created_at: now,
            created_by_system: false,
          },
        });

        return {
          id: reactivated.id as string & tags.Format<"uuid">,
          thread_id: reactivated.thread_id as string & tags.Format<"uuid">,
          tag_id: reactivated.tag_id as string & tags.Format<"uuid">,
          created_at: toISOStringSafe(reactivated.created_at),
          deleted_at: null,
        } satisfies IEconPoliticalForumThreadTag;
      }

      throw new HttpException("Internal Server Error", 500);
    }
  });
}
