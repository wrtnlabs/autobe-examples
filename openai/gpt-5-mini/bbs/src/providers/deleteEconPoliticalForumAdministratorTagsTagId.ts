import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { AdministratorPayload } from "../decorators/payload/AdministratorPayload";

export async function deleteEconPoliticalForumAdministratorTagsTagId(props: {
  administrator: AdministratorPayload;
  tagId: string & tags.Format<"uuid">;
}): Promise<void> {
  const { administrator, tagId } = props;

  try {
    // Authorization - verify admin record still active
    const admin =
      await MyGlobal.prisma.econ_political_forum_administrator.findFirst({
        where: {
          registereduser_id: administrator.id,
          deleted_at: null,
        },
      });

    if (admin === null) {
      throw new HttpException("Unauthorized: administrator not enrolled", 403);
    }

    // Load tag and ensure not already deleted
    const tag = await MyGlobal.prisma.econ_political_forum_tags.findUnique({
      where: { id: tagId },
      select: { id: true, deleted_at: true },
    });

    if (tag === null || tag.deleted_at !== null) {
      throw new HttpException("Not Found", 404);
    }

    // Gather active thread associations for this tag
    const tagJoins =
      await MyGlobal.prisma.econ_political_forum_thread_tags.findMany({
        where: { tag_id: tagId, deleted_at: null },
        select: { thread_id: true },
      });

    const threadIds = Array.from(new Set(tagJoins.map((r) => r.thread_id)));

    // Check legal holds that prevent deletion: active holds on related threads or posts within those threads
    if (threadIds.length > 0) {
      const conflictingHold =
        (await MyGlobal.prisma.econ_political_forum_legal_holds.findFirst({
          where: {
            is_active: true,
            OR: [
              { thread_id: { in: threadIds } },
              // If any holds reference posts that belong to affected threads
              {
                post_id: {
                  in: await (async () => {
                    const posts =
                      await MyGlobal.prisma.econ_political_forum_posts.findMany(
                        {
                          where: { thread_id: { in: threadIds } },
                          select: { id: true },
                        },
                      );
                    return posts.map((p) => p.id);
                  })(),
                },
              },
            ],
          },
          select: { id: true, hold_reason: true },
        })) ?? null;

      if (conflictingHold) {
        throw new HttpException(
          `Conflict: active legal hold (${conflictingHold.id}) prevents deletion`,
          409,
        );
      }
    }

    const now = toISOStringSafe(new Date());

    // Soft-delete the tag (inline data object)
    await MyGlobal.prisma.econ_political_forum_tags.update({
      where: { id: tagId },
      data: { deleted_at: now },
    });

    // Soft-delete related join records to prevent new assignments
    await MyGlobal.prisma.econ_political_forum_thread_tags.updateMany({
      where: { tag_id: tagId, deleted_at: null },
      data: { deleted_at: now },
    });

    // Create audit log entry
    await MyGlobal.prisma.econ_political_forum_audit_logs.create({
      data: {
        id: v4() as string & tags.Format<"uuid">,
        registereduser_id: administrator.id,
        moderator_id: null,
        post_id: null,
        thread_id: null,
        report_id: null,
        moderation_case_id: null,
        action_type: "delete",
        target_type: "tag",
        target_identifier: tagId,
        details: `Administrator ${administrator.id} soft-deleted tag ${tagId}`,
        created_at: now,
        created_by_system: false,
      },
    });

    return;
  } catch (err) {
    if (err instanceof HttpException) throw err;
    throw new HttpException("Internal Server Error", 500);
  }
}
