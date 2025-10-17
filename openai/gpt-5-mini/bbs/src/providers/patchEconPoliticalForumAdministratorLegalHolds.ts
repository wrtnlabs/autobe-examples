import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IEconPoliticalForumLegalHold } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconPoliticalForumLegalHold";
import { IPageIEconPoliticalForumLegalHold } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEconPoliticalForumLegalHold";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { AdministratorPayload } from "../decorators/payload/AdministratorPayload";

export async function patchEconPoliticalForumAdministratorLegalHolds(props: {
  administrator: AdministratorPayload;
  body: IEconPoliticalForumLegalHold.IRequest;
}): Promise<IPageIEconPoliticalForumLegalHold> {
  const { administrator, body } = props;

  // Authorization: verify administrator enrollment
  const admin =
    await MyGlobal.prisma.econ_political_forum_administrator.findFirst({
      where: { registereduser_id: administrator.id, deleted_at: null },
    });
  if (!admin) throw new HttpException("Unauthorized", 403);

  // Validate pagination inputs
  const limit = body.limit !== undefined ? Number(body.limit) : 20;
  if (limit <= 0 || limit > 200)
    throw new HttpException("Bad Request: limit out of range", 400);
  const page = body.page !== undefined ? Number(body.page) : 1;
  if (page <= 0) throw new HttpException("Bad Request: page must be >= 1", 400);

  const sortField = body.sort === "hold_start" ? "hold_start" : "created_at";
  const direction = body.direction === "asc" ? "asc" : "desc";

  // Build where condition
  const whereCondition = {
    ...(body.holderId !== undefined &&
      body.holderId !== null && { registereduser_id: body.holderId }),
    ...(body.postId !== undefined &&
      body.postId !== null && { post_id: body.postId }),
    ...(body.threadId !== undefined &&
      body.threadId !== null && { thread_id: body.threadId }),
    ...(body.moderationCaseId !== undefined &&
      body.moderationCaseId !== null && {
        moderation_case_id: body.moderationCaseId,
      }),
    ...(body.holdReason !== undefined &&
      body.holdReason !== null && { hold_reason: body.holdReason }),
    ...(body.isActive !== undefined &&
      body.isActive !== null && { is_active: body.isActive }),
    ...((body.holdStartFrom !== undefined && body.holdStartFrom !== null) ||
    (body.holdStartTo !== undefined && body.holdStartTo !== null)
      ? {
          hold_start: {
            ...(body.holdStartFrom !== undefined &&
              body.holdStartFrom !== null && { gte: body.holdStartFrom }),
            ...(body.holdStartTo !== undefined &&
              body.holdStartTo !== null && { lte: body.holdStartTo }),
          },
        }
      : {}),
    deleted_at: null,
  };

  // Determine pagination style
  const take = limit;
  const skip = (page - 1) * limit;

  // Execute queries
  const [rows, total] = await Promise.all([
    MyGlobal.prisma.econ_political_forum_legal_holds.findMany({
      where: whereCondition,
      orderBy:
        sortField === "created_at"
          ? { created_at: direction === "asc" ? "asc" : "desc" }
          : { hold_start: direction === "asc" ? "asc" : "desc" },
      skip,
      take,
      select: {
        id: true,
        registereduser_id: true,
        post_id: true,
        thread_id: true,
        moderation_case_id: true,
        hold_reason: true,
        hold_start: true,
        hold_end: true,
        is_active: true,
        notes: true,
        created_at: true,
      },
    }),
    MyGlobal.prisma.econ_political_forum_legal_holds.count({
      where: whereCondition,
    }),
  ]);

  // Record audit log for read
  await MyGlobal.prisma.econ_political_forum_audit_logs.create({
    data: {
      id: v4() as string & tags.Format<"uuid">,
      registereduser_id: administrator.id,
      action_type: "read",
      target_type: "legal_hold_search",
      target_identifier: null,
      details: JSON.stringify({ criteria: body, page, limit }),
      created_at: toISOStringSafe(new Date()),
      created_by_system: false,
    },
  });

  // Map results
  const data = rows.map((r) => ({
    id: r.id,
    registereduser_id:
      r.registereduser_id === null ? null : r.registereduser_id,
    post_id: r.post_id === null ? null : r.post_id,
    thread_id: r.thread_id === null ? null : r.thread_id,
    moderation_case_id:
      r.moderation_case_id === null ? null : r.moderation_case_id,
    hold_reason: r.hold_reason as IEconPoliticalForumLegalHold["hold_reason"],
    hold_start: toISOStringSafe(r.hold_start),
    hold_end: r.hold_end ? toISOStringSafe(r.hold_end) : null,
    is_active: r.is_active,
    notes: r.notes ?? null,
    created_at: toISOStringSafe(r.created_at),
  }));

  return {
    pagination: {
      current: Number(page),
      limit: Number(limit),
      records: total,
      pages: Math.ceil(total / limit),
    },
    data,
  };
}
