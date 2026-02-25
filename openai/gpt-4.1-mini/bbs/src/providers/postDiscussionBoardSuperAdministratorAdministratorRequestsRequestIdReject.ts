import { IDiscussionBoardAdministratorRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdministratorRequest";
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

export async function postDiscussionBoardSuperAdministratorAdministratorRequestsRequestIdReject(props: {
  superAdministrator: SuperadministratorPayload;
  requestId: string & tags.Format<"uuid">;
}): Promise<IDiscussionBoardAdministratorRequest.IRejectResponse> {
  // Get current ISO 8601 timestamp string with correct format tag
  const now: string & import("typia").tags.Format<"date-time"> =
    toISOStringSafe(new Date());

  // Transaction to update status to 'rejected'
  await MyGlobal.prisma.$transaction(async (tx) => {
    // Verify request exists or throw 404
    await tx.discussion_board_administrator_requests.findUniqueOrThrow({
      where: { id: props.requestId },
      select: { id: true },
    });
    // Update status to 'rejected' and timestamp
    await tx.discussion_board_administrator_requests.update({
      where: { id: props.requestId },
      data: {
        status: "rejected",
        updated_at: now,
      },
    });
  });
  // Return success true response
  return { success: true };
}
