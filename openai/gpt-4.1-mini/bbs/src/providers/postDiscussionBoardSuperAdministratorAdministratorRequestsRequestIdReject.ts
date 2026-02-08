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
}): Promise<IDiscussionBoardAdministratorRequest> {
  const updated =
    await MyGlobal.prisma.discussion_board_administrator_requests.update({
      where: { id: props.requestId },
      data: {
        status: "rejected",
        updated_at: toISOStringSafe(new Date()),
      },
    });
  if (!updated) {
    throw new HttpException("Administrator request not found", 404);
  }
  return updated;
}
