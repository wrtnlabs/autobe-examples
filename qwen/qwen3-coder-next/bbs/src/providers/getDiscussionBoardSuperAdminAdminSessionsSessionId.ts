import { IDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdmin";
import { IDiscussionBoardAdminSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdminSession";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { SuperadminPayload } from "../decorators/payload/SuperadminPayload";
import { DiscussionBoardAdminSessionTransformer } from "../transformers/DiscussionBoardAdminSessionTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getDiscussionBoardSuperAdminAdminSessionsSessionId(props: {
  superAdmin: SuperadminPayload;
  sessionId: string & tags.Format<"uuid">;
}): Promise<IDiscussionBoardAdminSession> {
  const session =
    await MyGlobal.prisma.discussion_board_admin_sessions.findUniqueOrThrow({
      where: { id: props.sessionId },
      ...DiscussionBoardAdminSessionTransformer.select(),
    });
  return await DiscussionBoardAdminSessionTransformer.transform(session);
}
