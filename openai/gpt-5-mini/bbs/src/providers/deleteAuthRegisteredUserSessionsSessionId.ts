import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IEconPoliticalForumRegisteredUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconPoliticalForumRegisteredUser";
import { RegistereduserPayload } from "../decorators/payload/RegistereduserPayload";

export async function deleteAuthRegisteredUserSessionsSessionId(props: {
  registeredUser: RegistereduserPayload;
  sessionId: string & tags.Format<"uuid">;
}): Promise<IEconPoliticalForumRegisteredUser.IGenericSuccess> {
  const { registeredUser, sessionId } = props;

  const session =
    await MyGlobal.prisma.econ_political_forum_sessions.findUnique({
      where: { id: sessionId },
    });

  if (!session) {
    throw new HttpException("Not Found", 404);
  }

  if (session.registereduser_id !== registeredUser.id) {
    throw new HttpException(
      "Unauthorized: You can only revoke your own sessions",
      403,
    );
  }

  if (session.deleted_at) {
    return { success: true, message: "Session already revoked" };
  }

  const now = toISOStringSafe(new Date());

  await MyGlobal.prisma.$transaction([
    MyGlobal.prisma.econ_political_forum_sessions.update({
      where: { id: sessionId },
      data: {
        deleted_at: now,
        updated_at: now,
      },
    }),
    MyGlobal.prisma.econ_political_forum_audit_logs.create({
      data: {
        id: v4() as string & tags.Format<"uuid">,
        registereduser_id: registeredUser.id,
        action_type: "revoke_session",
        target_type: "session",
        target_identifier: sessionId,
        created_at: now,
        created_by_system: false,
      },
    }),
  ]);

  return { success: true, message: "Session revoked" };
}
