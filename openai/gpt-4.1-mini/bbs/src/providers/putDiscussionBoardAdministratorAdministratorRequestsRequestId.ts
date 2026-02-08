import { IDiscussionBoardAdministratorRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdministratorRequest";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { AdministratorPayload } from "../decorators/payload/AdministratorPayload";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function putDiscussionBoardAdministratorAdministratorRequestsRequestId(props: {
  administrator: AdministratorPayload;
  requestId: string & tags.Format<"uuid">;
  body: IDiscussionBoardAdministratorRequest.IUpdate;
}): Promise<IDiscussionBoardAdministratorRequest> {
  const now = toISOStringSafe(new Date());
  const existing =
    await MyGlobal.prisma.discussion_board_administrator_requests.findFirst({
      where: { id: props.requestId, deleted_at: null },
    });
  if (!existing) {
    throw new HttpException("Administrator request not found", 404);
  }
  const updated = await MyGlobal.prisma.$transaction(async (tx) => {
    return await tx.discussion_board_administrator_requests.update({
      where: { id: props.requestId },
      data: {
        updated_at: now,
      },
    });
  });
  return {
    id: updated.id,
    reason: updated.reason === null ? undefined : updated.reason,
    status: updated.status === null ? undefined : updated.status,
    created_at: toISOStringSafe(updated.created_at),
    updated_at: toISOStringSafe(updated.updated_at),
    deleted_at:
      updated.deleted_at === null
        ? undefined
        : toISOStringSafe(updated.deleted_at),
  };
}
