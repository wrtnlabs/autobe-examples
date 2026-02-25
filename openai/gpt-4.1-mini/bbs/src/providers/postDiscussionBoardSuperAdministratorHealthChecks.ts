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
import { SuperadministratorPayload } from "../decorators/payload/SuperadministratorPayload";
import { DiscussionBoardHealthCheckTransformer } from "../transformers/DiscussionBoardHealthCheckTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postDiscussionBoardSuperAdministratorHealthChecks(props: {
  superAdministrator: SuperadministratorPayload;
  body: IDiscussionBoardHealthCheck.ICreate;
}): Promise<IDiscussionBoardHealthCheck> {
  const data = await DiscussionBoardHealthCheckCollector.collect({
    body: props.body,
  });
  const created = await MyGlobal.prisma.discussion_board_health_checks.create({
    data,
    ...DiscussionBoardHealthCheckTransformer.select(),
  });
  return await DiscussionBoardHealthCheckTransformer.transform(created);
}
