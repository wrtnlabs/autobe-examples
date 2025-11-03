import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";
import { IPageIDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardMember";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { ModeratorPayload } from "../decorators/payload/ModeratorPayload";

export async function patchDiscussionBoardModeratorMembers(props: {
  moderator: ModeratorPayload;
  body: IDiscussionBoardMember.IRequest;
}): Promise<IPageIDiscussionBoardMember.ISummary> {
  const { moderator, body } = props;

  // Pagination defaults and validation
  const page = Number(body.page ?? 1);
  const requestedLimit = Number(body.limit ?? 20);
  if (!Number.isFinite(page) || page < 1)
    throw new HttpException("Invalid page", 400);
  if (!Number.isFinite(requestedLimit) || requestedLimit < 1)
    throw new HttpException("Invalid limit", 400);

  const limit = Math.min(requestedLimit, 100);
  const skip = (page - 1) * limit;

  // Build where conditions inline
  const where: Record<string, unknown> = {
    ...(body.includeDeleted ? {} : { deleted_at: null }),
    ...(body.role !== undefined && { role: body.role }),
    ...(body.mfaEnabled !== undefined &&
      body.mfaEnabled !== null && { mfa_enabled: body.mfaEnabled }),
    ...(body.username !== undefined &&
      body.username !== null && { username: { contains: body.username } }),
    ...((body.createdAtFrom !== undefined && body.createdAtFrom !== null) ||
    (body.createdAtTo !== undefined && body.createdAtTo !== null)
      ? {
          created_at: {
            ...(body.createdAtFrom !== undefined &&
              body.createdAtFrom !== null && { gte: body.createdAtFrom }),
            ...(body.createdAtTo !== undefined &&
              body.createdAtTo !== null && { lte: body.createdAtTo }),
          },
        }
      : {}),
    ...(body.email !== undefined &&
      body.email !== null && { email: body.email }),
  };

  // Privileged action: audit when email filter used
  if (body.email !== undefined && body.email !== null) {
    await MyGlobal.prisma.discussion_board_audit_logs.create({
      data: {
        id: v4() as string & tags.Format<"uuid">,
        event_type: "member.search.email",
        // 'metadata' exists on discussion_board_audit_logs; event_payload does not
        metadata: JSON.stringify({
          moderator_id: moderator.id,
          email: body.email,
        }),
        event_timestamp: toISOStringSafe(new Date()),
        actor_type: "moderator",
        actor_id: moderator.id,
        created_at: toISOStringSafe(new Date()),
        updated_at: toISOStringSafe(new Date()),
      },
    });
  }

  // Inline orderBy mapping
  const orderBy =
    body.sortBy === "createdAt"
      ? { created_at: "asc" as const }
      : body.sortBy === "-createdAt"
        ? { created_at: "desc" as const }
        : body.sortBy === "username"
          ? { username: "asc" as const }
          : body.sortBy === "-username"
            ? { username: "desc" as const }
            : { created_at: "desc" as const };

  const [rows, total] = await Promise.all([
    MyGlobal.prisma.discussion_board_member.findMany({
      where,
      orderBy,
      skip,
      take: limit,
      select: {
        id: true,
        username: true,
        display_name: true,
        created_at: true,
      },
    }),
    MyGlobal.prisma.discussion_board_member.count({ where }),
  ]);

  const data = rows.map((r) => ({
    id: r.id as string & tags.Format<"uuid">,
    username: r.username,
    display_name:
      r.display_name === null ? null : (r.display_name ?? undefined),
    created_at: toISOStringSafe(r.created_at),
  }));

  const pages = Math.ceil(total / limit);

  return {
    pagination: {
      current: Number(page),
      limit: Number(limit),
      records: total,
      pages: Number(pages),
    },
    data,
  };
}
