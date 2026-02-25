import { IDiscussionBoardHealthCheck } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardHealthCheck";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { DiscussionBoardHealthCheckCollector } from "../collectors/DiscussionBoardHealthCheckCollector";
import { AdministratorPayload } from "../decorators/payload/AdministratorPayload";
import { DiscussionBoardHealthCheckTransformer } from "../transformers/DiscussionBoardHealthCheckTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postDiscussionBoardAdministratorHealthChecks(props: {
  administrator: AdministratorPayload;
  body: IDiscussionBoardHealthCheck.ICreate;
}): Promise<IDiscussionBoardHealthCheck> {
  const data = await DiscussionBoardHealthCheckCollector.collect({
    body: props.body,
  });
  const created = await MyGlobal.prisma.discussion_board_health_checks.create({
    data,
  });
  return DiscussionBoardHealthCheckTransformer.transform(created);
}
