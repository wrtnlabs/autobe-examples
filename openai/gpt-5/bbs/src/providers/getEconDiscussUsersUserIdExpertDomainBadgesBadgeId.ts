import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IEconDiscussExpertDomainBadge } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconDiscussExpertDomainBadge";
import { IEconDiscussTopic } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconDiscussTopic";

export async function getEconDiscussUsersUserIdExpertDomainBadgesBadgeId(props: {
  userId: string & tags.Format<"uuid">;
  badgeId: string & tags.Format<"uuid">;
}): Promise<IEconDiscussExpertDomainBadge> {
  const row = await MyGlobal.prisma.econ_discuss_expert_domain_badges.findFirst(
    {
      where: {
        id: props.badgeId,
        user_id: props.userId,
        deleted_at: null,
      },
      select: {
        id: true,
        user_id: true,
        econ_discuss_topic_id: true,
        verified_at: true,
        valid_until: true,
        revoked_at: true,
        revoked_reason: true,
        created_at: true,
        updated_at: true,
        topic: {
          select: {
            id: true,
            code: true,
            name: true,
          },
        },
      },
    },
  );

  if (!row) {
    throw new HttpException("Not Found", 404);
  }

  const verifiedAt = toISOStringSafe(row.verified_at);
  const createdAt = toISOStringSafe(row.created_at);
  const updatedAt = toISOStringSafe(row.updated_at);
  const validUntil = row.valid_until ? toISOStringSafe(row.valid_until) : null;
  const revokedAt = row.revoked_at ? toISOStringSafe(row.revoked_at) : null;

  const nowIso = toISOStringSafe(new Date());
  const status: "active" | "expired" | "revoked" =
    revokedAt !== null
      ? "revoked"
      : validUntil !== null && validUntil < nowIso
        ? "expired"
        : "active";

  return {
    id: props.badgeId,
    userId: props.userId,
    topicId: row.econ_discuss_topic_id as string & tags.Format<"uuid">,
    topic: row.topic
      ? {
          id: row.topic.id as string & tags.Format<"uuid">,
          code: row.topic.code,
          name: row.topic.name,
        }
      : undefined,
    verifiedAt,
    validUntil,
    revokedAt,
    revokedReason: null,
    status,
    createdAt,
    updatedAt,
  };
}
