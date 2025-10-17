import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IEconPoliticalForumLegalHold } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconPoliticalForumLegalHold";
import { AdministratorPayload } from "../decorators/payload/AdministratorPayload";

export async function getEconPoliticalForumAdministratorLegalHoldsLegalHoldId(props: {
  administrator: AdministratorPayload;
  legalHoldId: string & tags.Format<"uuid">;
}): Promise<IEconPoliticalForumLegalHold> {
  const { administrator, legalHoldId } = props;

  // Ensure the caller is an enrolled administrator and determine elevation
  const adminRecord =
    await MyGlobal.prisma.econ_political_forum_administrator.findFirst({
      where: {
        registereduser_id: administrator.id,
        deleted_at: null,
      },
    });

  if (adminRecord === null) {
    throw new HttpException("Forbidden", 403);
  }

  // Retrieve the legal hold by primary key
  const record =
    await MyGlobal.prisma.econ_political_forum_legal_holds.findUnique({
      where: { id: legalHoldId },
    });

  if (record === null) {
    throw new HttpException("Not Found", 404);
  }

  const elevated = adminRecord.is_super === true;

  // Log access to audit trail for compliance
  await MyGlobal.prisma.econ_political_forum_audit_logs.create({
    data: {
      id: v4() as string & tags.Format<"uuid">,
      registereduser_id: administrator.id,
      moderator_id: null,
      post_id: record.post_id ?? null,
      thread_id: record.thread_id ?? null,
      report_id: null,
      moderation_case_id: record.moderation_case_id ?? null,
      action_type: "legal_hold.read",
      target_type: "legal_hold",
      target_identifier: record.id,
      details: JSON.stringify({ accessed_by: administrator.id, elevated }),
      created_at: toISOStringSafe(new Date()),
      created_by_system: false,
    },
  });

  // Prepare return payload, converting Date -> ISO strings and preserving explicit nulls
  const response: IEconPoliticalForumLegalHold = {
    id: record.id as string & tags.Format<"uuid">,
    registereduser_id: record.registereduser_id ?? null,
    post_id: record.post_id ?? null,
    thread_id: record.thread_id ?? null,
    moderation_case_id: record.moderation_case_id ?? null,
    hold_reason: typia.assert<
      "other" | "subpoena" | "law_enforcement" | "litigation"
    >(record.hold_reason),
    hold_start: toISOStringSafe(record.hold_start),
    hold_end: record.hold_end ? toISOStringSafe(record.hold_end) : null,
    is_active: record.is_active,
    notes: elevated ? (record.notes ?? null) : null,
    created_at: toISOStringSafe(record.created_at),
  };

  return response;
}
