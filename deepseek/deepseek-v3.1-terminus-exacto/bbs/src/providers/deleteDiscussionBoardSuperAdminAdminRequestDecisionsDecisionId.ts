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

export async function deleteDiscussionBoardSuperAdminAdminRequestDecisionsDecisionId(props: {
  superAdmin: SuperadminPayload;
  decisionId: string & tags.Format<"uuid">;
}): Promise<void> {
  // Verify the decision exists and is not soft-deleted
  const decision =
    await MyGlobal.prisma.discussion_board_admin_request_decisions.findUniqueOrThrow(
      {
        where: { id: props.decisionId },
        select: { id: true, deleted_at: true },
      },
    );
  // Check if already soft-deleted
  if (decision.deleted_at !== null) {
    throw new HttpException("Decision already deleted", 400);
  }
  // Perform soft deletion
  await MyGlobal.prisma.discussion_board_admin_request_decisions.update({
    where: { id: props.decisionId },
    data: {
      deleted_at: new Date(),
      updated_at: new Date(),
    },
  });
}
