import { IDiscussionBoardAdministratorRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdministratorRequest";
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
import { DiscussionBoardAdministratorRequestTransformer } from "../transformers/DiscussionBoardAdministratorRequestTransformer";
import { DiscussionBoardMemberAtSummaryTransformer } from "../transformers/DiscussionBoardMemberAtSummaryTransformer";
import { DiscussionBoardSuperAdminAtSummaryTransformer } from "../transformers/DiscussionBoardSuperAdminAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchDiscussionBoardSuperAdminRequestsRequestIdReject(props: {
  superAdmin: SuperadminPayload;
  requestId: string & tags.Format<"uuid">;
  body: IDiscussionBoardAdministratorRequest.IUpdate;
}): Promise<IDiscussionBoardAdministratorRequest> {
  // Find the request and verify it exists and is pending
  const request =
    await MyGlobal.prisma.discussion_board_administrator_requests.findUniqueOrThrow(
      {
        where: { id: props.requestId },
        select: {
          id: true,
          status: true,
          submitter_member_id: true,
          processed_by_super_admin_id: true,
          processed_at: true,
          rejection_reason: true,
          submitter: DiscussionBoardMemberAtSummaryTransformer.select(),
          processor: DiscussionBoardSuperAdminAtSummaryTransformer.select(),
        },
      },
    );
  // Verify the request is pending
  if (request.status !== "pending") {
    throw new HttpException("Only pending requests can be rejected", 400);
  }
  // Verify conflict of interest: super admin cannot reject their own request
  if (request.submitter_member_id === props.superAdmin.id) {
    throw new HttpException(
      "Cannot reject your own administrator request",
      403,
    );
  }
  // Update the request with rejection status and metadata
  await MyGlobal.prisma.discussion_board_administrator_requests.update({
    where: { id: props.requestId },
    data: {
      status: "rejected",
      processed_by_super_admin_id: props.superAdmin.id,
      processed_at: new Date(),
      rejection_reason: props.body.rejection_reason ?? null,
    },
  });
  // Fetch updated record and transform to response DTO
  const updatedRequest =
    await MyGlobal.prisma.discussion_board_administrator_requests.findUniqueOrThrow(
      {
        where: { id: props.requestId },
        select: {
          id: true,
          reason: true,
          status: true,
          submitted_at: true,
          processed_at: true,
          rejection_reason: true,
          submitter: DiscussionBoardMemberAtSummaryTransformer.select(),
          processor: DiscussionBoardSuperAdminAtSummaryTransformer.select(),
        },
      },
    );
  return DiscussionBoardAdministratorRequestTransformer.transform(
    updatedRequest,
  );
}
