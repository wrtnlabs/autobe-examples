import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { SuperAdminPayload } from "../decorators/payload/SuperAdminPayload";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function deleteDiscussionBoardSuperAdminPromotionRequestsRequestId(props: {
  superAdmin: SuperAdminPayload;
  requestId: string & tags.Format<"uuid">;
}): Promise<void> {
  // First verify the promotion request exists
  await MyGlobal.prisma.discussion_board_administrator_promotion_requests.findUniqueOrThrow(
    {
      where: { id: props.requestId },
    },
  );
  // Perform the hard delete - cascade will handle related approvals
  await MyGlobal.prisma.discussion_board_administrator_promotion_requests.delete(
    {
      where: { id: props.requestId },
    },
  );
}
