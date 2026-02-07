import { IDiscussionBoardAdminsRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdminsRequest";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { SuperadminPayload } from "../decorators/payload/SuperadminPayload";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function putDiscussionBoardSuperAdminAdminRequestsRequestId(props: {
  superAdmin: SuperadminPayload;
  requestId: string;
  body: IDiscussionBoardAdminsRequest.IUpdate;
}): Promise<IDiscussionBoardAdminsRequest> {
  // Find existing request
  const request =
    await MyGlobal.prisma.discussion_board_admins_requests.findUnique({
      where: { id: props.requestId },
    });
  if (!request) {
    throw new HttpException("Administrator request not found", 404);
  }
  // Update the request with new data
  const updated = await MyGlobal.prisma.discussion_board_admins_requests.update(
    {
      where: { id: props.requestId },
      data: {
        ...props.body,
        updated_at: new Date(),
      },
    },
  );
  // Construct response with proper type conversion
  return {
    id: updated.id,
    member_id: updated.member_id,
    admin_id: updated.admin_id,
    super_admin_id: updated.super_admin_id,
    reason: updated.reason,
    status: updated.status,
    created_at: toISOStringSafe(updated.created_at),
    approved_at: updated.approved_at
      ? toISOStringSafe(updated.approved_at)
      : null,
    updated_at: toISOStringSafe(updated.updated_at),
    deleted_at: updated.deleted_at ? toISOStringSafe(updated.deleted_at) : null,
  };
}
