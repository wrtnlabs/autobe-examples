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

export async function deleteDiscussionBoardSuperAdministratorAdministratorRequestsRequestId(props: {
  superAdministrator: SuperadministratorPayload;
  requestId: string & tags.Format<"uuid">;
}): Promise<void> {
  await MyGlobal.prisma.$transaction(async (tx) => {
    await tx.discussion_board_administrator_requests.findUniqueOrThrow({
      where: { id: props.requestId },
    });
    await tx.discussion_board_administrator_requests.delete({
      where: { id: props.requestId },
    });
    await tx.discussion_board_audit_logs.create({
      data: {
        id: v4() as string & tags.Format<"uuid">,
        administrator: { connect: { id: props.superAdministrator.id } },
        object_id: props.requestId,
        object_type: "administrator_request",
        created_at: new Date().toISOString() as string &
          tags.Format<"date-time">,
      },
    });
  });
}
