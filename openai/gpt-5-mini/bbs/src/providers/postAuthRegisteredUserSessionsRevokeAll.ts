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

export async function postAuthRegisteredUserSessionsRevokeAll(props: {
  registeredUser: RegistereduserPayload;
}): Promise<IEconPoliticalForumRegisteredUser.IGenericSuccess> {
  const { registeredUser } = props;

  if (!registeredUser || !registeredUser.id) {
    throw new HttpException("Unauthorized", 401);
  }

  try {
    const now = toISOStringSafe(new Date());

    const updateResult =
      await MyGlobal.prisma.econ_political_forum_sessions.updateMany({
        where: {
          registereduser_id: registeredUser.id,
          deleted_at: null,
        },
        data: {
          deleted_at: now,
        },
      });

    await MyGlobal.prisma.econ_political_forum_audit_logs.create({
      data: {
        id: v4() as string & tags.Format<"uuid">,
        registereduser_id: registeredUser.id,
        action_type: "revoke_all_sessions",
        target_type: "session",
        target_identifier: registeredUser.id,
        details: `Revoked ${updateResult.count} session(s) via revoke-all API`,
        created_at: now,
        created_by_system: false,
      },
    });

    return {
      success: true,
      message: `Revoked ${updateResult.count} session(s).`,
      code: "SESSIONS_REVOKED",
    };
  } catch (error) {
    // Log the original error for internal diagnostics (do not leak details)
    try {
      await MyGlobal.prisma.econ_political_forum_audit_logs.create({
        data: {
          id: v4() as string & tags.Format<"uuid">,
          registereduser_id: registeredUser.id,
          action_type: "revoke_all_sessions_failed",
          target_type: "session",
          target_identifier: registeredUser.id,
          details: String(
            error instanceof Error ? error.message : JSON.stringify(error),
          ),
          created_at: toISOStringSafe(new Date()),
          created_by_system: true,
        },
      });
    } catch {}

    throw new HttpException("Internal Server Error", 500);
  }
}
