import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IEconDiscussExpertDomainBadge } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconDiscussExpertDomainBadge";
import { IPageIEconDiscussExpertDomainBadge } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEconDiscussExpertDomainBadge";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IEconDiscussTopic } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconDiscussTopic";

export async function patchEconDiscussUsersUserIdExpertDomainBadges(props: {
  userId: string & tags.Format<"uuid">;
  body: IEconDiscussExpertDomainBadge.IRequest;
}): Promise<IPageIEconDiscussExpertDomainBadge.ISummary> {
  const { userId, body } = props;

  // Pagination defaults
  const page = Number(body.page ?? 1);
  const pageSize = Number(body.pageSize ?? 20);
  const skip = (page - 1) * pageSize;

  // Sorting defaults
  const sortBy = body.sortBy ?? "verified_at";
  const sortOrder = body.sortOrder ?? "desc";

  // Current time for status filters
  const nowIso = toISOStringSafe(new Date());

  const [rows, total] = await Promise.all([
    MyGlobal.prisma.econ_discuss_expert_domain_badges.findMany({
      where: {
        deleted_at: null,
        user_id: userId,
        ...(body.topicId !== undefined && {
          econ_discuss_topic_id: body.topicId,
        }),
        ...(body.status === "active" && {
          AND: [
            { revoked_at: null },
            { OR: [{ valid_until: null }, { valid_until: { gt: nowIso } }] },
          ],
        }),
        ...(body.status === "expired" && {
          valid_until: { lt: nowIso },
        }),
        ...(body.status === "revoked" && {
          revoked_at: { not: null },
        }),
      },
      select: {
        id: true,
        verified_at: true,
        valid_until: true,
        revoked_at: true,
        topic: {
          select: {
            id: true,
            code: true,
            name: true,
          },
        },
      },
      orderBy:
        sortBy === "verified_at"
          ? { verified_at: sortOrder }
          : sortBy === "created_at"
            ? { created_at: sortOrder }
            : { valid_until: sortOrder },
      skip,
      take: pageSize,
    }),
    MyGlobal.prisma.econ_discuss_expert_domain_badges.count({
      where: {
        deleted_at: null,
        user_id: userId,
        ...(body.topicId !== undefined && {
          econ_discuss_topic_id: body.topicId,
        }),
        ...(body.status === "active" && {
          AND: [
            { revoked_at: null },
            { OR: [{ valid_until: null }, { valid_until: { gt: nowIso } }] },
          ],
        }),
        ...(body.status === "expired" && {
          valid_until: { lt: nowIso },
        }),
        ...(body.status === "revoked" && {
          revoked_at: { not: null },
        }),
      },
    }),
  ]);

  const data = rows.map((row) => ({
    id: row.id as string & tags.Format<"uuid">,
    topic: {
      id: row.topic.id as string & tags.Format<"uuid">,
      code: row.topic.code,
      name: row.topic.name,
    },
    verifiedAt: toISOStringSafe(row.verified_at),
    validUntil: row.valid_until ? toISOStringSafe(row.valid_until) : null,
    revokedAt: row.revoked_at ? toISOStringSafe(row.revoked_at) : null,
  }));

  const pages = pageSize > 0 ? Math.ceil(total / pageSize) : 0;

  return {
    pagination: {
      current: Number(page),
      limit: Number(pageSize),
      records: total,
      pages,
    },
    data,
  };
}
