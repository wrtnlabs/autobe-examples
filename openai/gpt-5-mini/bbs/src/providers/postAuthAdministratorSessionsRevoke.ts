import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IEconPoliticalForumAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconPoliticalForumAdministrator";
import { IPageIPagination } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIPagination";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPagination } from "@ORGANIZATION/PROJECT-api/lib/structures/IPagination";
import { AdministratorPayload } from "../decorators/payload/AdministratorPayload";

export async function postAuthAdministratorSessionsRevoke(props: {
  administrator: AdministratorPayload;
  body: IEconPoliticalForumAdministrator.ISessionsRevokeRequest;
}): Promise<IEconPoliticalForumAdministrator.ISessionsListResponse> {
  const { administrator, body } = props;
  const adminId = administrator.id;

  const adminRecord =
    await MyGlobal.prisma.econ_political_forum_administrator.findFirst({
      where: { registereduser_id: adminId },
    });

  if (!adminRecord)
    throw new HttpException("Unauthorized: administrator not found", 403);

  const now = toISOStringSafe(new Date());

  if (body === null) {
    const sessions =
      await MyGlobal.prisma.econ_political_forum_sessions.findMany({
        where: { registereduser_id: adminId, deleted_at: null },
        orderBy: { created_at: "desc" },
      });

    const data = sessions.map((s) => ({
      id: s.id as string & tags.Format<"uuid">,
      registereduser_id: s.registereduser_id as string & tags.Format<"uuid">,
      ip_address: s.ip_address ?? null,
      user_agent: s.user_agent ?? null,
      last_active_at: s.last_active_at
        ? toISOStringSafe(s.last_active_at)
        : null,
      expires_at: toISOStringSafe(s.expires_at),
      created_at: toISOStringSafe(s.created_at),
      updated_at: toISOStringSafe(s.updated_at),
      deleted_at: s.deleted_at ? toISOStringSafe(s.deleted_at) : null,
    }));

    return {
      pagination: {
        pagination: {
          current: Number(1),
          limit: Number(100),
          records: Number(data.length),
          pages: Number(1),
        },
        data: [] as IPagination[],
      },
      data,
    };
  }

  const revokeAll = body.revoke_all === true;
  const sessionIds = (body.session_ids ?? []) as (string &
    tags.Format<"uuid">)[];

  const candidates = revokeAll
    ? await MyGlobal.prisma.econ_political_forum_sessions.findMany({
        where: { registereduser_id: adminId, deleted_at: null },
      })
    : sessionIds.length > 0
      ? await MyGlobal.prisma.econ_political_forum_sessions.findMany({
          where: { id: { in: sessionIds } },
        })
      : [];

  await Promise.all(
    candidates.map(async (session) => {
      if (session.deleted_at) return;

      if (session.registereduser_id !== adminId && !adminRecord.is_super) {
        throw new HttpException(
          "Unauthorized: cannot revoke sessions for other administrators",
          403,
        );
      }

      await MyGlobal.prisma.econ_political_forum_sessions.update({
        where: { id: session.id },
        data: {
          deleted_at: now,
          updated_at: now,
          refresh_token_hash: null,
        },
      });

      await MyGlobal.prisma.econ_political_forum_audit_logs.create({
        data: {
          id: v4() as string & tags.Format<"uuid">,
          registereduser_id: adminId,
          action_type: "session_revoke",
          target_type: "session",
          target_identifier: session.id,
          details: JSON.stringify({
            ip_address: session.ip_address ?? null,
            user_agent: session.user_agent ?? null,
          }),
          created_at: now,
          created_by_system: false,
        },
      });
    }),
  );

  const remaining =
    await MyGlobal.prisma.econ_political_forum_sessions.findMany({
      where: { registereduser_id: adminId, deleted_at: null },
      orderBy: { created_at: "desc" },
    });

  const data = remaining.map((s) => ({
    id: s.id as string & tags.Format<"uuid">,
    registereduser_id: s.registereduser_id as string & tags.Format<"uuid">,
    ip_address: s.ip_address ?? null,
    user_agent: s.user_agent ?? null,
    last_active_at: s.last_active_at ? toISOStringSafe(s.last_active_at) : null,
    expires_at: toISOStringSafe(s.expires_at),
    created_at: toISOStringSafe(s.created_at),
    updated_at: toISOStringSafe(s.updated_at),
    deleted_at: s.deleted_at ? toISOStringSafe(s.deleted_at) : null,
  }));

  return {
    pagination: {
      pagination: {
        current: Number(1),
        limit: Number(100),
        records: Number(data.length),
        pages: Number(1),
      },
      data: [] as IPagination[],
    },
    data,
  };
}
