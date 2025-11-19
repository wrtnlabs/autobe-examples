import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IDiscussionBoardConfiguration } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardConfiguration";
import { ModeratorPayload } from "../decorators/payload/ModeratorPayload";

export async function patchDiscussionBoardModeratorSystemConfigurations(props: {
  moderator: ModeratorPayload;
  body: IDiscussionBoardConfiguration.IUpdate;
}): Promise<IDiscussionBoardConfiguration> {
  const now = toISOStringSafe(new Date());
  const config = await MyGlobal.prisma.discussion_board_configurations.update({
    where: { key: "system_config" },
    data: { value: props.body, updated_at: now },
  });
  return {
    key: config.key,
    value: config.value,
  };
}
