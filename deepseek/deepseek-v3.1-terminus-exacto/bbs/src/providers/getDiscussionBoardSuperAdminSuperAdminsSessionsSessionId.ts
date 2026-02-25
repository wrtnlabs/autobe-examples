import { IDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdmin";
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
import { SuperAdminPayload } from "../decorators/payload/SuperAdminPayload";
import { DiscussionBoardSuperAdminSessionTransformer } from "../transformers/DiscussionBoardSuperAdminSessionTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getDiscussionBoardSuperAdminSuperAdminsSessionsSessionId(props: {
  superAdmin: SuperAdminPayload;
  sessionId: string & tags.Format<"uuid">;
}): Promise<IDiscussionBoardSuperAdminSession> {
  // Retrieve the session with all related data using the transformer's select pattern
  const session =
    await MyGlobal.prisma.discussion_board_super_admin_sessions.findUniqueOrThrow(
      {
        where: { id: props.sessionId },
        ...DiscussionBoardSuperAdminSessionTransformer.select(),
      },
    );
  // Security check: Only the super admin who owns this session can view it
  if (session.superAdmin.id !== props.superAdmin.id) {
    throw new HttpException("Forbidden", 403);
  }
  // Convert the database record to the API response format
  return await DiscussionBoardSuperAdminSessionTransformer.transform(session);
}
