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

export async function postDiscussionBoardSuperAdminAdminRequestDecisions(props: {
  superAdmin: SuperadminPayload;
  body: IDiscussionBoardAdminRequestDecision.ICreate;
}): Promise<IDiscussionBoardAdminRequestDecision> {
  // Validate admin request exists and is pending
  const adminRequest =
    await MyGlobal.prisma.discussion_board_admin_requests.findUniqueOrThrow({
      where: { id: props.body.admin_request_id, deleted_at: null },
      select: { id: true, status: true },
    });
  if (adminRequest.status !== "pending") {
    throw new HttpException("Admin request is not pending", 400);
  }
  // Validate rejection reason requirement
  if (props.body.decision === "rejected" && !props.body.rejection_reason) {
    throw new HttpException(
      "Rejection reason is required for rejected decisions",
      400,
    );
  }
  // Prepare superAdmin entity for collector
  const superAdminEntity: IEntity = {
    id: props.superAdmin.id,
  };
  // Execute transaction: create decision and update request status
  const [decision] = await MyGlobal.prisma.$transaction([
    MyGlobal.prisma.discussion_board_admin_request_decisions.create({
      data: await DiscussionBoardAdminRequestDecisionCollector.collect({
        body: props.body,
        superAdmin: superAdminEntity,
      }),
      ...DiscussionBoardAdminRequestDecisionTransformer.select(),
    }),
    MyGlobal.prisma.discussion_board_admin_requests.update({
      where: { id: props.body.admin_request_id },
      data: {
        status: props.body.decision === "approved" ? "approved" : "rejected",
        updated_at: new Date(),
      },
    }),
  ]);
  return await DiscussionBoardAdminRequestDecisionTransformer.transform(
    decision,
  );
}
