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

export async function getDiscussionBoardAdministratorAdministratorRequestsRequestId(props: {
  administrator: AdministratorPayload;
  requestId: string & tags.Format<"uuid">;
}): Promise<IDiscussionBoardAdministratorRequest> {
  const record =
    await MyGlobal.prisma.discussion_board_administrator_requests.findUnique({
      where: { id: props.requestId },
      include: {
        registeredUser: true,
      },
    });
  if (record === null) {
    throw new HttpException("Administrator request not found", 404);
  }
  return {
    ...record,
    created_at:
      record.created_at === null ? null : toISOStringSafe(record.created_at),
    updated_at:
      record.updated_at === null ? null : toISOStringSafe(record.updated_at),
    deleted_at:
      record.deleted_at === null ? null : toISOStringSafe(record.deleted_at),
    registeredUser: record.registeredUser,
  };
}
