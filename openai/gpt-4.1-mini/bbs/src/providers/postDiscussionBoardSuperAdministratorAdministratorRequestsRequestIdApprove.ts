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

export async function postDiscussionBoardSuperAdministratorAdministratorRequestsRequestIdApprove(props: {
  superAdministrator: SuperadministratorPayload;
  requestId: string & tags.Format<"uuid">;
}): Promise<IDiscussionBoardAdministratorRequest> {
  const currentTimestamp: string & tags.Format<"date-time"> = toISOStringSafe(
    new Date(),
  );
  return await MyGlobal.prisma.$transaction(async (tx) => {
    const existingRequest =
      await tx.discussion_board_administrator_requests.findUnique({
        where: { id: props.requestId },
      });
    if (!existingRequest) {
      throw new HttpException("Administrator request not found", 404);
    }
    if (existingRequest.status !== "pending") {
      throw new HttpException("Administrator request not pending", 400);
    }
    const updatedRequest =
      await tx.discussion_board_administrator_requests.update({
        where: { id: props.requestId },
        data: {
          status: "approved",
          updated_at: currentTimestamp,
        },
      });
    return updatedRequest;
  });
}
