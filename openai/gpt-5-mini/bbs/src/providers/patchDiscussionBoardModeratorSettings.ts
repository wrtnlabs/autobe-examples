import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IDiscussionBoardSetting } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSetting";
import { IPageIDiscussionBoardSetting } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardSetting";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { ModeratorPayload } from "../decorators/payload/ModeratorPayload";

export async function patchDiscussionBoardModeratorSettings(props: {
  moderator: ModeratorPayload;
  body: IDiscussionBoardSetting.IRequest;
}): Promise<IPageIDiscussionBoardSetting.ISummary> {
  const { moderator, body } = props;

  // Ensure moderator exists and is not soft-deleted
  const moderatorRecord =
    await MyGlobal.prisma.discussion_board_moderator.findUnique({
      where: { id: moderator.id },
    });
  if (!moderatorRecord || moderatorRecord.deleted_at) {
    throw new HttpException(
      "Unauthorized: moderator not found or inactive",
      403,
    );
  }

  // Collect keys from request
  const keys = body.settings.map((s) => s.key);

  // Verify keys exist and are active (not soft-deleted)
  const existing = await MyGlobal.prisma.discussion_board_settings.findMany({
    where: {
      key: { in: keys },
      deleted_at: null,
    },
  });

  const existingKeys = new Set(existing.map((e) => e.key));
  const missing = keys.filter((k) => !existingKeys.has(k));
  if (missing.length > 0) {
    // Transactional behavior required: reject entire batch if any key missing
    throw new HttpException(`Settings not found: ${missing.join(", ")}`, 404);
  }

  const now = toISOStringSafe(new Date());

  // Perform atomic updates and create audit entries within a single transaction
  const updatedRows = await MyGlobal.prisma.$transaction(async (tx) => {
    const updatedCollection: typeof existing = [];

    for (const item of body.settings) {
      const updated = await tx.discussion_board_settings.update({
        where: { key: item.key },
        data: {
          value: item.value,
          is_active: item.is_active ?? undefined,
          updated_at: now,
        },
      });

      // Audit the change
      await tx.discussion_board_moderation_audit.create({
        data: {
          id: v4() as string & tags.Format<"uuid">,
          actor_moderator_id: moderator.id,
          event_type: "setting.updated",
          event_payload: JSON.stringify({
            key: item.key,
            value: item.value,
            is_active: item.is_active ?? null,
            changed_by: moderator.id,
            changed_at: now,
          }),
          occurred_at: now,
        },
      });

      updatedCollection.push(updated);
    }

    return updatedCollection;
  });

  // Map results to API DTO shape and convert dates to ISO strings
  const data = updatedRows.map((r) => ({
    id: r.id as string & tags.Format<"uuid">,
    key: r.key,
    value: r.value,
    description: r.description ?? null,
    isActive: r.is_active,
    createdAt: toISOStringSafe(r.created_at),
    updatedAt: toISOStringSafe(r.updated_at),
  }));

  // Simple pagination summary for the returned batch
  const pagination = {
    current: Number(1),
    limit: Number(data.length),
    records: Number(data.length),
    pages: Number(Math.max(1, Math.ceil(data.length / (data.length || 1)))),
  };

  return {
    pagination,
    data,
  };
}
