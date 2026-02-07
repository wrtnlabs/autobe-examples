import { IDiscussionBoardErrorLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardErrorLog";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { SuperadminPayload } from "../decorators/payload/SuperadminPayload";
import { DiscussionBoardErrorLogTransformer } from "../transformers/DiscussionBoardErrorLogTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getDiscussionBoardSuperAdminErrorLogsLogId(props: {
  superAdmin: SuperadminPayload;
  logId: string & tags.Format<"uuid">;
}): Promise<IDiscussionBoardErrorLog> {
  const errorLog = await MyGlobal.prisma.discussion_board_error_logs.findUnique(
    {
      where: { id: props.logId },
      ...DiscussionBoardErrorLogTransformer.select(),
    },
  );
  if (!errorLog) {
    throw new HttpException("Error log not found", 404);
  }
  return await DiscussionBoardErrorLogTransformer.transform(errorLog);
}
