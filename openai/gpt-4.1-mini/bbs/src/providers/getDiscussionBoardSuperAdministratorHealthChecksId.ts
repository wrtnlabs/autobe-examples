import { IDiscussionBoardHealthCheck } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardHealthCheck";
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

export async function getDiscussionBoardSuperAdministratorHealthChecksId(props: {
  superAdministrator: SuperadministratorPayload;
  id: string & tags.Format<"uuid">;
}): Promise<IDiscussionBoardHealthCheck> {
  const record =
    await MyGlobal.prisma.discussion_board_health_checks.findUnique({
      where: { id: props.id },
    });
  if (record === null) {
    throw new HttpException("Health check not found", 404);
  }
  return {
    id: record.id,
    status: record.status,
    checked_at:
      record.checked_at === null ? null : toISOStringSafe(record.checked_at),
    details: record.details === null ? null : record.details,
    created_at: toISOStringSafe(record.created_at),
    updated_at: toISOStringSafe(record.updated_at),
    deleted_at:
      record.deleted_at === null ? null : toISOStringSafe(record.deleted_at),
  };
}
