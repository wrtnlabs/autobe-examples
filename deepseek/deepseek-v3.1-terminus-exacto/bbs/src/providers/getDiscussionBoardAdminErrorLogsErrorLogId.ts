import { IDiscussionBoardErrorLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardErrorLog";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { AdminPayload } from "../decorators/payload/AdminPayload";
import { DiscussionBoardErrorLogTransformer } from "../transformers/DiscussionBoardErrorLogTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getDiscussionBoardAdminErrorLogsErrorLogId(props: {
  admin: AdminPayload;
  errorLogId: string & tags.Format<"uuid">;
}): Promise<IDiscussionBoardErrorLog> {
  const errorLog =
    await MyGlobal.prisma.discussion_board_error_logs.findUniqueOrThrow({
      where: { id: props.errorLogId },
      ...DiscussionBoardErrorLogTransformer.select(),
    });
  return await DiscussionBoardErrorLogTransformer.transform(errorLog);
}
