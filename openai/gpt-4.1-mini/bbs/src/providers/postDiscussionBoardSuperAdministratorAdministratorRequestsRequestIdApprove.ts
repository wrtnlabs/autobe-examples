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
}): Promise<IDiscussionBoardAdministratorRequest.IApproveResponse> {
  const existingRequest =
    await MyGlobal.prisma.discussion_board_administrator_requests.findUnique({
      where: { id: props.requestId },
      select: { id: true, status: true, registered_user_id: true },
    });
  if (!existingRequest) {
    throw new HttpException("Administrator request not found", 404);
  }
  if (existingRequest.status !== "pending") {
    throw new HttpException("Administrator request is not pending", 400);
  }
  const isoNow: string & tags.Format<"date-time"> = toISOStringSafe(new Date());
  await MyGlobal.prisma.$transaction(async (tx) => {
    await tx.discussion_board_administrator_requests.update({
      where: { id: props.requestId },
      data: { status: "approved" },
    });
    await tx.discussion_board_administrators.create({
      data: {
        id: v4(),
        grade: { connect: { id: "regular" } },
        discussion_board_registered_user_id: existingRequest.registered_user_id,
        created_at: isoNow,
        updated_at: isoNow,
        deleted_at: null,
      },
    });
  });
  return { success: true };
}
