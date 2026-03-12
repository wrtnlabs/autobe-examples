import { IDiscussionBoardAdminRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdminRequest";
import { IDiscussionBoardAdminRequestDecision } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdminRequestDecision";
import { IDiscussionBoardAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdministrator";
import { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { DiscussionBoardAdminRequestDecisionCollector } from "../collectors/DiscussionBoardAdminRequestDecisionCollector";
import { AdministratorPayload } from "../decorators/payload/AdministratorPayload";
import { DiscussionBoardAdminRequestDecisionTransformer } from "../transformers/DiscussionBoardAdminRequestDecisionTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postDiscussionBoardAdministratorAdminRequestsRequestIdDecisions(props: {
  administrator: AdministratorPayload;
  requestId: string & tags.Format<"uuid">;
  body: IDiscussionBoardAdminRequestDecision.ICreate;
}): Promise<IDiscussionBoardAdminRequestDecision> {
  // Verify super administrator
  const admin =
    await MyGlobal.prisma.discussion_board_administrators.findUniqueOrThrow({
      where: {
        id: props.administrator.id,
        deleted_at: null,
      },
      select: {
        id: true,
        grade: true,
      },
    });
  if (admin.grade !== "super") {
    throw new HttpException(
      "Only super administrators can create decisions",
      403,
    );
  }
  // Validate decision_type
  if (
    props.body.decision_type !== "approved" &&
    props.body.decision_type !== "rejected"
  ) {
    throw new HttpException(
      "Invalid decision_type. Must be 'approved' or 'rejected'",
      400,
    );
  }
  // Find and validate admin request
  const adminRequest =
    await MyGlobal.prisma.discussion_board_admin_requests.findUniqueOrThrow({
      where: {
        id: props.requestId,
        deleted_at: null,
      },
      select: {
        id: true,
        status: true,
        discussion_board_member_id: true,
        member: {
          select: {
            id: true,
            email: true,
            display_name: true,
            bio: true,
          },
        },
      },
    });
  // Verify request is pending
  if (adminRequest.status !== "pending") {
    throw new HttpException("Admin request already has a decision", 409);
  }
  // Check no existing decision
  const existingDecision =
    await MyGlobal.prisma.discussion_board_admin_request_decisions.findFirst({
      where: {
        discussion_board_admin_request_id: props.requestId,
        deleted_at: null,
      },
    });
  if (existingDecision !== null) {
    throw new HttpException("Decision already exists for this request", 409);
  }
  // Perform transaction
  const result = await MyGlobal.prisma.$transaction(async (tx) => {
    // Create decision record
    const decision = await tx.discussion_board_admin_request_decisions.create({
      data: await DiscussionBoardAdminRequestDecisionCollector.collect({
        body: props.body,
        discussionBoardAdminRequests: { id: props.requestId },
        discussionBoardAdministrators: { id: props.administrator.id },
      }),
      ...DiscussionBoardAdminRequestDecisionTransformer.select(),
    });
    // Update admin request status
    await tx.discussion_board_admin_requests.update({
      where: {
        id: props.requestId,
      },
      data: {
        status: props.body.decision_type,
        reviewed_at: new Date(),
      },
    });
    // If approved, promote member to administrator
    if (props.body.decision_type === "approved") {
      const tempPassword = v4();
      await tx.discussion_board_administrators.create({
        data: {
          id: v4(),
          email: adminRequest.member.email,
          password_hash: await PasswordUtil.hash(tempPassword),
          display_name: adminRequest.member.display_name,
          bio: adminRequest.member.bio,
          grade: "regular",
          created_at: new Date(),
          updated_at: new Date(),
          deleted_at: null,
        },
      });
    }
    return decision;
  });
  return await DiscussionBoardAdminRequestDecisionTransformer.transform(result);
}
