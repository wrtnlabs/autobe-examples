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
import { DiscussionBoardHealthCheckTransformer } from "../transformers/DiscussionBoardHealthCheckTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function putDiscussionBoardSuperAdministratorHealthChecksId(props: {
  superAdministrator: SuperadministratorPayload;
  id: string & tags.Format<"uuid">;
  body: IDiscussionBoardHealthCheck.IUpdate;
}): Promise<IDiscussionBoardHealthCheck> {
  await MyGlobal.prisma.discussion_board_health_checks.findUniqueOrThrow({
    where: { id: props.id },
  });
  const updatedAt: string & tags.Format<"date-time"> =
    props.body.updatedAt ?? new Date().toISOString();
  await MyGlobal.prisma.discussion_board_health_checks.update({
    where: { id: props.id },
    data: {
      status: props.body.status,
      checked_at: props.body.checkedAt,
      details: props.body.details ?? null,
      updated_at: updatedAt,
    },
  });
  const updated =
    await MyGlobal.prisma.discussion_board_health_checks.findUniqueOrThrow({
      where: { id: props.id },
      ...DiscussionBoardHealthCheckTransformer.select(),
    });
  return await DiscussionBoardHealthCheckTransformer.transform(updated);
}
