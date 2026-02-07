import { IDiscussionBoardAdminsRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdminsRequest";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getDiscussionBoardAdminRequestsRequestId(props: {
  requestId: string;
}): Promise<IDiscussionBoardAdminsRequest> {
  const request =
    await MyGlobal.prisma.discussion_board_admins_requests.findUnique({
      where: { id: props.requestId },
    });
  if (!request) throw new HttpException("Request not found", 404);
  return {
    id: request.id,
    member_id: request.member_id,
    admin_id: request.admin_id === null ? undefined : request.admin_id,
    super_admin_id:
      request.super_admin_id === null ? undefined : request.super_admin_id,
    reason: request.reason,
    status: request.status,
    created_at: toISOStringSafe(request.created_at),
    approved_at:
      request.approved_at === null
        ? undefined
        : toISOStringSafe(request.approved_at),
    updated_at: toISOStringSafe(request.updated_at),
    deleted_at:
      request.deleted_at === null
        ? undefined
        : toISOStringSafe(request.deleted_at),
  };
}
