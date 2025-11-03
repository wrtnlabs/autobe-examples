import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { ICommunityBbsVoteReconciliation } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityBbsVoteReconciliation";
import { SystemadminPayload } from "../decorators/payload/SystemadminPayload";

export async function getCommunityBbsSystemAdminVotesReconciliationReconciliationId(props: {
  systemAdmin: SystemadminPayload;
  reconciliationId: string & tags.Format<"uuid">;
}): Promise<ICommunityBbsVoteReconciliation> {
  const { systemAdmin, reconciliationId } = props;

  // Authorization: ensure the provided payload represents a system admin
  if (systemAdmin.type !== "systemadmin") {
    throw new HttpException("Unauthorized", 403);
  }

  try {
    // Precise lookup by primary key
    const record =
      await MyGlobal.prisma.community_bbs_vote_reconciliation.findUnique({
        where: { id: reconciliationId },
      });

    if (!record) {
      throw new HttpException("Not Found", 404);
    }

    // Record audit log for access
    const now = toISOStringSafe(new Date());
    await MyGlobal.prisma.community_bbs_audit_logs.create({
      data: {
        id: v4() as string & tags.Format<"uuid">,
        actor_type: "system_admin",
        actor_id: systemAdmin.id,
        entity: "vote_reconciliation",
        action: "read",
        payload: JSON.stringify({ reconciliationId }),
        created_at: now,
        updated_at: now,
      },
    });

    // Return mapped DTO with proper date conversions and null handling
    return {
      id: record.id as string & tags.Format<"uuid">,
      target_type: record.target_type as "post" | "comment",
      target_id: record.target_id as string & tags.Format<"uuid">,
      observed_count: record.observed_count,
      expected_count: record.expected_count,
      discrepancy: record.discrepancy,
      reconciled: record.reconciled,
      reconciled_at: record.reconciled_at
        ? toISOStringSafe(record.reconciled_at)
        : null,
      job_id: record.job_id ?? null,
      source: record.source ?? null,
      created_at: toISOStringSafe(record.created_at),
      note: record.note ?? null,
    };
  } catch (err) {
    if (err instanceof HttpException) throw err;
    // Unexpected error
    throw new HttpException("Internal Server Error", 500);
  }
}
