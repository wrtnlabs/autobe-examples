import { IDiscussionBoardAdminRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdminRequest";
import { IDiscussionBoardAdminRequestDecision } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdminRequestDecision";
import { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";
import { IDiscussionBoardSuperAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSuperAdmin";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { DiscussionBoardAdminRequestDecisionCollector } from "../collectors/DiscussionBoardAdminRequestDecisionCollector";
import { SuperadminPayload } from "../decorators/payload/SuperadminPayload";
import { DiscussionBoardAdminRequestDecisionTransformer } from "../transformers/DiscussionBoardAdminRequestDecisionTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchDiscussionBoardSuperAdminAdminRequestsRequestIdDecide(props: {
  superAdmin: SuperadminPayload;
  requestId: string & tags.Format<"uuid">;
  body: IDiscussionBoardAdminRequestDecision.ICreate;
}): Promise<IDiscussionBoardAdminRequestDecision> {
  return MyGlobal.prisma.$transaction(async (prisma) => {
    // 1. Find and validate admin request
    const adminRequest =
      await prisma.discussion_board_admin_requests.findUniqueOrThrow({
        where: { id: props.requestId },
        select: {
          id: true,
          status: true,
          discussion_board_member_id: true,
          decision: { select: { id: true } },
        },
      });
    // Validate request status
    if (adminRequest.status !== "pending") {
      throw new HttpException("Admin request is not in pending status", 400);
    }
    // Ensure not already decided
    if (adminRequest.decision) {
      throw new HttpException("Admin request already has a decision", 400);
    }
    // 2. Validate request ID matches body
    if (props.body.admin_request_id !== props.requestId) {
      throw new HttpException("Request ID mismatch", 400);
    }
    // 3. Create decision record
    const decisionData =
      await DiscussionBoardAdminRequestDecisionCollector.collect({
        body: props.body,
        superAdmin: { id: props.superAdmin.id },
      });
    const decision =
      await prisma.discussion_board_admin_request_decisions.create({
        data: decisionData,
      });
    // 4. Update admin request status
    await prisma.discussion_board_admin_requests.update({
      where: { id: props.requestId },
      data: {
        status: props.body.decision === "approved" ? "approved" : "rejected",
      },
    });
    // 5. If approved, create administrator assignment and update member role
    if (props.body.decision === "approved") {
      // Create administrator assignment record
      const assignmentId = v4();
      await prisma.discussion_board_administrator_assignments.create({
        data: {
          id: assignmentId,
          old_role: "member",
          new_role: "admin",
          assignment_type: "initial",
          reason: "Approved via admin request decision",
          created_at: new Date(),
          updated_at: new Date(),
          deleted_at: null,
        },
      });
      // Update member's admin_grade
      await prisma.discussion_board_members.update({
        where: { id: adminRequest.discussion_board_member_id },
        data: { admin_grade: "regular" },
      });
    }
    // 6. Return complete decision record
    const completeDecision =
      await prisma.discussion_board_admin_request_decisions.findUniqueOrThrow({
        where: { id: decision.id },
        ...DiscussionBoardAdminRequestDecisionTransformer.select(),
      });
    return DiscussionBoardAdminRequestDecisionTransformer.transform(
      completeDecision,
    );
  });
}
