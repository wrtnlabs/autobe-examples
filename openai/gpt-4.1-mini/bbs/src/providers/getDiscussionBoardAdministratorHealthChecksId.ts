import { IDiscussionBoardHealthCheck } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardHealthCheck";
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

export async function getDiscussionBoardAdministratorHealthChecksId(props: {
  administrator: AdministratorPayload;
  id: string & tags.Format<"uuid">;
}): Promise<IDiscussionBoardHealthCheck> {
  const record = await MyGlobal.prisma.discussion_board_health_checks.findFirst(
    {
      where: { id: props.id, deleted_at: null },
      select: {
        id: true,
        status: true,
        checked_at: true,
        details: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
      },
    },
  );
  if (!record) {
    throw new HttpException("Health check not found", 404);
  }
  // As the IDiscussionBoardHealthCheck type is empty, return record as is
  return record;
}
