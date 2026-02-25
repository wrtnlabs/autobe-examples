import { IDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdmin";
import { IDiscussionBoardContentModerationLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardContentModerationLog";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { SuperAdminPayload } from "../decorators/payload/SuperAdminPayload";
import { DiscussionBoardContentModerationLogTransformer } from "../transformers/DiscussionBoardContentModerationLogTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getDiscussionBoardSuperAdminContentModerationLogsModerationLogId(props: {
  superAdmin: SuperAdminPayload;
  moderationLogId: string & tags.Format<"uuid">;
}): Promise<IDiscussionBoardContentModerationLog> {
  const log =
    await MyGlobal.prisma.discussion_board_content_moderation_logs.findUniqueOrThrow(
      {
        where: { id: props.moderationLogId },
        ...DiscussionBoardContentModerationLogTransformer.select(),
      },
    );
  return await DiscussionBoardContentModerationLogTransformer.transform(log);
}
