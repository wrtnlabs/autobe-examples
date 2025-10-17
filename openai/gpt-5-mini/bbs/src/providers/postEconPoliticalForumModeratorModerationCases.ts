import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IEconPoliticalForumModerationCase } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconPoliticalForumModerationCase";
import { ModeratorPayload } from "../decorators/payload/ModeratorPayload";

export async function postEconPoliticalForumModeratorModerationCases(props: {
  moderator: ModeratorPayload;
  body: IEconPoliticalForumModerationCase.ICreate;
}): Promise<IEconPoliticalForumModerationCase> {
  const { moderator, body } = props;

  // Authorization: ensure moderator exists and is active
  const moderatorRecord =
    await MyGlobal.prisma.econ_political_forum_moderator.findFirst({
      where: {
        registereduser_id: moderator.id,
        deleted_at: null,
        is_active: true,
      },
    });
  if (!moderatorRecord)
    throw new HttpException(
      "Unauthorized: moderator not enrolled or inactive",
      403,
    );

  // Uniqueness: case_number must be unique among active records
  const existing =
    await MyGlobal.prisma.econ_political_forum_moderation_cases.findFirst({
      where: { case_number: body.case_number, deleted_at: null },
    });
  if (existing)
    throw new HttpException("Conflict: case_number already exists", 409);

  // Referential integrity checks for optional foreign keys
  if (
    body.assigned_moderator_id !== undefined &&
    body.assigned_moderator_id !== null
  ) {
    const assigned =
      await MyGlobal.prisma.econ_political_forum_moderator.findUnique({
        where: { id: body.assigned_moderator_id },
      });
    if (!assigned || assigned.deleted_at)
      throw new HttpException(
        "Bad Request: assigned_moderator_id not found",
        400,
      );
  }
  if (body.owner_admin_id !== undefined && body.owner_admin_id !== null) {
    const owner =
      await MyGlobal.prisma.econ_political_forum_administrator.findUnique({
        where: { id: body.owner_admin_id },
      });
    if (!owner || owner.deleted_at)
      throw new HttpException("Bad Request: owner_admin_id not found", 400);
  }
  if (body.lead_report_id !== undefined && body.lead_report_id !== null) {
    const report =
      await MyGlobal.prisma.econ_political_forum_reports.findUnique({
        where: { id: body.lead_report_id },
      });
    if (!report || report.deleted_at)
      throw new HttpException("Bad Request: lead_report_id not found", 400);
  }

  try {
    const now = toISOStringSafe(new Date());
    const id = v4() as string & tags.Format<"uuid">;

    const created =
      await MyGlobal.prisma.econ_political_forum_moderation_cases.create({
        data: {
          id,
          assigned_moderator_id: body.assigned_moderator_id ?? null,
          owner_admin_id: body.owner_admin_id ?? null,
          lead_report_id: body.lead_report_id ?? null,
          case_number: body.case_number,
          title: body.title ?? null,
          status: body.status,
          priority: body.priority,
          summary: body.summary ?? null,
          escalation_reason: body.escalation_reason ?? null,
          legal_hold: body.legal_hold,
          created_at: now,
          updated_at: now,
          closed_at: null,
          deleted_at: null,
        },
      });

    // If legal_hold requested, create a preservation record linked to the case
    if (body.legal_hold === true) {
      await MyGlobal.prisma.econ_political_forum_legal_holds.create({
        data: {
          id: v4() as string & tags.Format<"uuid">,
          registereduser_id: moderator.id,
          moderation_case_id: created.id,
          hold_reason: "moderation_case_preservation",
          hold_start: now,
          hold_end: null,
          is_active: true,
          notes: "Created automatically due to moderation case legal_hold flag",
          created_at: now,
        },
      });
    }

    return {
      id: created.id,
      assigned_moderator_id: created.assigned_moderator_id ?? null,
      owner_admin_id: created.owner_admin_id ?? null,
      lead_report_id: created.lead_report_id ?? null,
      case_number: created.case_number,
      title: created.title ?? null,
      status: typia.assert<"open" | "investigating" | "closed" | "on_hold">(
        created.status,
      ),
      priority: typia.assert<"low" | "normal" | "high" | "urgent">(
        created.priority,
      ),
      summary: created.summary ?? null,
      escalation_reason: created.escalation_reason ?? null,
      legal_hold: created.legal_hold,
      created_at: toISOStringSafe(created.created_at),
      updated_at: toISOStringSafe(created.updated_at),
      closed_at: created.closed_at ? toISOStringSafe(created.closed_at) : null,
      deleted_at: created.deleted_at
        ? toISOStringSafe(created.deleted_at)
        : null,
    };
  } catch (err) {
    if (err instanceof HttpException) throw err;
    throw new HttpException("Internal Server Error", 500);
  }
}
