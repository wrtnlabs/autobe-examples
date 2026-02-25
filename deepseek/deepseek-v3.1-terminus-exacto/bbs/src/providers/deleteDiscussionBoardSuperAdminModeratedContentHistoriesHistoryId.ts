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

export async function deleteDiscussionBoardSuperAdminModeratedContentHistoriesHistoryId(props: {
  superAdmin: SuperAdminPayload;
  historyId: string & tags.Format<"uuid">;
}): Promise<void> {
  // Verify the history record exists for accurate error reporting
  const history =
    await MyGlobal.prisma.discussion_board_moderated_content_histories.findUnique(
      {
        where: { id: props.historyId },
      },
    );
  if (history === null) {
    throw new HttpException("Moderation history record not found", 404);
  }
  // Based on business requirements, moderation history records are append-only
  // audit trails that cannot be deleted for compliance and accountability purposes
  throw new HttpException(
    "Moderation history records cannot be deleted to maintain audit integrity and compliance requirements",
    403,
  );
}
