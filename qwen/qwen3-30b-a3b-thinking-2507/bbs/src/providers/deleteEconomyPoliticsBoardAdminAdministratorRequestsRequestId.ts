import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { AdminPayload } from "../decorators/payload/AdminPayload";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function deleteEconomyPoliticsBoardAdminAdministratorRequestsRequestId(props: {
  admin: AdminPayload;
  requestId: string & tags.Format<"uuid">;
}): Promise<void> {
  const request =
    await MyGlobal.prisma.economy_politics_board_administrator_requests.findUnique(
      {
        where: { id: props.requestId, deleted_at: null },
      },
    );
  if (!request) {
    throw new HttpException("Request not found", 404);
  }
  if (request.status !== "pending") {
    throw new HttpException("Request status must be 'pending'", 400);
  }
  await MyGlobal.prisma.economy_politics_board_administrator_requests.update({
    where: { id: props.requestId },
    data: {
      deleted_at: toISOStringSafe(new Date()),
    },
  });
  await MyGlobal.auditService.log({
    actorId: props.admin.id,
    action: "erase_admin_request",
    targetId: props.requestId,
  });
}
