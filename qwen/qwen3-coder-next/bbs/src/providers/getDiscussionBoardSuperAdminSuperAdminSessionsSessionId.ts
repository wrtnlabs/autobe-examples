import { IDiscussionBoardSuperAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSuperAdmin";
import { IDiscussionBoardSuperAdminSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSuperAdminSession";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { SuperadminPayload } from "../decorators/payload/SuperadminPayload";
import { DiscussionBoardSuperAdminSessionTransformer } from "../transformers/DiscussionBoardSuperAdminSessionTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getDiscussionBoardSuperAdminSuperAdminSessionsSessionId(props: {
  superAdmin: SuperadminPayload;
  sessionId: string & tags.Format<"uuid">;
}): Promise<IDiscussionBoardSuperAdminSession> {
  const session =
    await MyGlobal.prisma.discussion_board_super_admin_sessions.findUniqueOrThrow(
      {
        where: { id: props.sessionId, super_admin_id: props.superAdmin.id },
        ...DiscussionBoardSuperAdminSessionTransformer.select(),
      },
    );
  return await DiscussionBoardSuperAdminSessionTransformer.transform(session);
}
