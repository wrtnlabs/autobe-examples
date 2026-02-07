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

export async function putDiscussionBoardSuperAdminAdminRequestsRequestIdApprove(props: {
  superAdmin: SuperadminPayload;
  requestId: string;
}): Promise<IDiscussionBoardAdminsRequest> {
  const now: string & tags.Format<"date-time"> = toISOStringSafe(new Date());
  const requestId: string & tags.Format<"uuid"> = props.requestId as string &
    tags.Format<"uuid">;
  const adminId: string & tags.Format<"uuid"> = props.superAdmin.id as string &
    tags.Format<"uuid">;
  // Update the administrator request to approved status
  const updated = await MyGlobal.prisma.discussion_board_admins_requests.update(
    {
      where: { id: requestId },
      data: {
        status: "approved",
        approved_at: now,
        admin_id: adminId,
        updated_at: now,
      },
    },
  );
  // Convert the database record to the response DTO format
  const result: IDiscussionBoardAdminsRequest = {
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
  return result;
}
