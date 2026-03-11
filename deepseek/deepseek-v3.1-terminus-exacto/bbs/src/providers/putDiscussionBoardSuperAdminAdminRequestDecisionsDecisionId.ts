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
import { SuperadminPayload } from "../decorators/payload/SuperadminPayload";
import { DiscussionBoardAdminRequestDecisionTransformer } from "../transformers/DiscussionBoardAdminRequestDecisionTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function putDiscussionBoardSuperAdminAdminRequestDecisionsDecisionId(props: {
  superAdmin: SuperadminPayload;
  decisionId: string & tags.Format<"uuid">;
  body: IDiscussionBoardAdminRequestDecision.IUpdate;
}): Promise<IDiscussionBoardAdminRequestDecision> {
  // 1. Validate business rule: rejection_reason required when decision is 'rejected'
  if (props.body.decision === "rejected" && !props.body.rejection_reason) {
    throw new HttpException(
      "Rejection reason is required when decision is 'rejected'",
      400,
    );
  }
  // 2. Check if decision exists and is not soft-deleted
  const existing =
    await MyGlobal.prisma.discussion_board_admin_request_decisions.findUniqueOrThrow(
      {
        where: {
          id: props.decisionId,
          deleted_at: null, // Only active records
        },
        select: {
          id: true,
          super_admin_id: true,
          admin_request_id: true,
        },
      },
    );
  // 3. Verify the related admin request exists and is not deleted
  await MyGlobal.prisma.discussion_board_admin_requests.findUniqueOrThrow({
    where: {
      id: existing.admin_request_id,
      deleted_at: null,
    },
    select: { id: true },
  });
  // 4. Prepare update data with proper Prisma type
  const updateData = {
    decision: props.body.decision,
    updated_at: new Date(),
    ...(props.body.decision === "rejected"
      ? { rejection_reason: props.body.rejection_reason ?? null }
      : { rejection_reason: null }),
  } satisfies Prisma.discussion_board_admin_request_decisionsUpdateInput;
  // 5. Perform update
  await MyGlobal.prisma.discussion_board_admin_request_decisions.update({
    where: { id: props.decisionId },
    data: updateData,
  });
  // 6. Retrieve updated decision with full details
  const updatedDecision =
    await MyGlobal.prisma.discussion_board_admin_request_decisions.findUniqueOrThrow(
      {
        where: {
          id: props.decisionId,
          deleted_at: null,
        },
        ...DiscussionBoardAdminRequestDecisionTransformer.select(),
      },
    );
  // 7. Return transformed response
  return await DiscussionBoardAdminRequestDecisionTransformer.transform(
    updatedDecision,
  );
}
