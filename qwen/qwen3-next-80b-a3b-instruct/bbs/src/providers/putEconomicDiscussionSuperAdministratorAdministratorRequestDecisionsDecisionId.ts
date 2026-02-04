import { IEconomicDiscussionAdministratorRequestDecision } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicDiscussionAdministratorRequestDecision";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { SuperadministratorPayload } from "../decorators/payload/SuperadministratorPayload";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function putEconomicDiscussionSuperAdministratorAdministratorRequestDecisionsDecisionId(props: {
  superAdministrator: SuperadministratorPayload;
  decisionId: string & tags.Format<"uuid">;
  body: IEconomicDiscussionAdministratorRequestDecision.IUpdate;
}): Promise<IEconomicDiscussionAdministratorRequestDecision> {
  // Validate decision exists
  const decision =
    await MyGlobal.prisma.economic_discussion_administrator_request_decisions.findUnique(
      {
        where: { id: props.decisionId },
      },
    );
  if (!decision) {
    throw new HttpException("Decision not found", 404);
  }
  // Validate decision hasn't been decided yet
  if (decision.decision != null) {
    throw new HttpException("Decision already has a status assigned", 400);
  }
  // Validate status
  if (props.body.status !== "approved" && props.body.status !== "rejected") {
    throw new HttpException("Invalid status", 400);
  }
  // Use transaction for atomic update of decision and associated request
  const updatedDecision = await MyGlobal.prisma.$transaction(async (prisma) => {
    // Update decision record with decision, decided_by, decided_at
    const updated =
      await prisma.economic_discussion_administrator_request_decisions.update({
        where: { id: props.decisionId },
        data: {
          decision: props.body.status as "approved" | "rejected",
          reviewer_id: props.superAdministrator.id,
          updated_at: toISOStringSafe(new Date()),
        },
      });
    // Update associated administrator_request based on decision status
    if (props.body.status === "approved") {
      await prisma.economic_discussion_administrator_requests.update({
        where: { id: decision.economic_discussion_administrator_request_id },
        data: { status: "approved" },
      });
    } else if (props.body.status === "rejected") {
      await prisma.economic_discussion_administrator_requests.update({
        where: { id: decision.economic_discussion_administrator_request_id },
        data: { status: "rejected" },
      });
    }
    return updated;
  });
  // Return updated decision record with proper types
  return {
    request_id: updatedDecision.economic_discussion_administrator_request_id,
    status: updatedDecision.decision,
  };
}
