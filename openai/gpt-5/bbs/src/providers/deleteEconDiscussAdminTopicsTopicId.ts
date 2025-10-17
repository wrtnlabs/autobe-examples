import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { AdminPayload } from "../decorators/payload/AdminPayload";

export async function deleteEconDiscussAdminTopicsTopicId(props: {
  admin: AdminPayload;
  topicId: string & tags.Format<"uuid">;
}): Promise<void> {
  const { admin, topicId } = props;

  // Authorization: ensure the caller is an active admin with policy guards
  const adminRecord = await MyGlobal.prisma.econ_discuss_admins.findFirst({
    where: {
      user_id: admin.id,
      deleted_at: null,
      user: {
        is: {
          deleted_at: null,
        },
      },
      OR: [
        { enforced_2fa: false },
        {
          AND: [
            { enforced_2fa: true },
            { user: { is: { mfa_enabled: true } } },
          ],
        },
      ],
    },
    select: { id: true },
  });
  if (adminRecord === null) {
    throw new HttpException("Forbidden", 403);
  }

  // Fetch the target topic
  const topic = await MyGlobal.prisma.econ_discuss_topics.findUnique({
    where: { id: topicId },
    select: { id: true, deleted_at: true },
  });
  if (topic === null) {
    throw new HttpException("Not Found", 404);
  }

  // Idempotent behavior: if already archived, succeed silently
  if (topic.deleted_at !== null) return;

  const now = toISOStringSafe(new Date());

  // Soft delete by setting deleted_at (and maintain updated_at)
  await MyGlobal.prisma.econ_discuss_topics.update({
    where: { id: topicId },
    data: {
      deleted_at: now,
      updated_at: now,
    },
  });
}
