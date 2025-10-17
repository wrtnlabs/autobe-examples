import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IEconDiscussLiveThread } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconDiscussLiveThread";
import { IELiveThreadState } from "@ORGANIZATION/PROJECT-api/lib/structures/IELiveThreadState";
import { IELiveThreadAccessScope } from "@ORGANIZATION/PROJECT-api/lib/structures/IELiveThreadAccessScope";
import { IELiveThreadOrderBy } from "@ORGANIZATION/PROJECT-api/lib/structures/IELiveThreadOrderBy";
import { IEOrderDirection } from "@ORGANIZATION/PROJECT-api/lib/structures/IEOrderDirection";
import { IPageIEconDiscussLiveThread } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEconDiscussLiveThread";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IEEconDiscussLiveThreadState } from "@ORGANIZATION/PROJECT-api/lib/structures/IEEconDiscussLiveThreadState";
import { IEEconDiscussLiveAccessScope } from "@ORGANIZATION/PROJECT-api/lib/structures/IEEconDiscussLiveAccessScope";

export async function patchEconDiscussLiveThreads(props: {
  body: IEconDiscussLiveThread.IRequest;
}): Promise<IPageIEconDiscussLiveThread.ISummary> {
  const { body } = props;

  const pageNum = Number(body.page ?? 1);
  const limitNum = Number(body.limit ?? 20);

  const where = {
    deleted_at: null,
    ...(body.state && body.state.length > 0
      ? { state: { in: body.state } }
      : {}),
    ...(body.expertOnly !== undefined ? { expert_only: body.expertOnly } : {}),
    ...(body.postId !== undefined ? { econ_discuss_post_id: body.postId } : {}),
    // scheduled_start_at range
    ...(() => {
      const from = body.scheduledStartFrom;
      const to = body.scheduledStartTo;
      if (from === undefined && to === undefined) return {};
      return {
        scheduled_start_at: {
          ...(from !== undefined ? { gte: from } : {}),
          ...(to !== undefined ? { lte: to } : {}),
        },
      };
    })(),
    // started_at range
    ...(() => {
      const from = body.startedFrom;
      const to = body.startedTo;
      if (from === undefined && to === undefined) return {};
      return {
        started_at: {
          ...(from !== undefined ? { gte: from } : {}),
          ...(to !== undefined ? { lte: to } : {}),
        },
      };
    })(),
    // ended_at range
    ...(() => {
      const from = body.endedFrom;
      const to = body.endedTo;
      if (from === undefined && to === undefined) return {};
      return {
        ended_at: {
          ...(from !== undefined ? { gte: from } : {}),
          ...(to !== undefined ? { lte: to } : {}),
        },
      };
    })(),
    // access_scope handling with invite_only exclusion by default
    ...(() => {
      if (body.myThreadsOnly === true) {
        // Do not exclude invite_only when myThreadsOnly hint is present (no auth available to scope further)
        if (body.accessScope && body.accessScope.length > 0) {
          return { access_scope: { in: body.accessScope } };
        }
        return {};
      }
      if (body.accessScope && body.accessScope.length > 0) {
        const scopes = body.accessScope.filter((s) => s !== "invite_only");
        return { access_scope: { in: scopes } };
      }
      return { access_scope: { not: "invite_only" } };
    })(),
  };

  const [rows, total] = await Promise.all([
    MyGlobal.prisma.econ_discuss_live_threads.findMany({
      where,
      select: {
        id: true,
        econ_discuss_post_id: true,
        host_user_id: true,
        state: true,
        expert_only: true,
        access_scope: true,
        scheduled_start_at: true,
        started_at: true,
        paused_at: true,
        ended_at: true,
        archived_at: true,
        created_at: true,
        updated_at: true,
      },
      orderBy: [
        body.orderBy === "updated_at"
          ? { updated_at: body.orderDirection === "asc" ? "asc" : "desc" }
          : body.orderBy === "scheduled_start_at"
            ? {
                scheduled_start_at:
                  body.orderDirection === "asc" ? "asc" : "desc",
              }
            : body.orderBy === "started_at"
              ? { started_at: body.orderDirection === "asc" ? "asc" : "desc" }
              : body.orderBy === "ended_at"
                ? { ended_at: body.orderDirection === "asc" ? "asc" : "desc" }
                : body.orderBy === "state"
                  ? { state: body.orderDirection === "asc" ? "asc" : "desc" }
                  : body.orderBy === "access_scope"
                    ? {
                        access_scope:
                          body.orderDirection === "asc" ? "asc" : "desc",
                      }
                    : {
                        created_at:
                          body.orderDirection === "asc" ? "asc" : "desc",
                      },
        { id: "desc" },
      ],
      skip: (pageNum - 1) * limitNum,
      take: limitNum,
    }),
    MyGlobal.prisma.econ_discuss_live_threads.count({
      where,
    }),
  ]);

  const data = rows.map((r) => ({
    id: r.id as string & tags.Format<"uuid">,
    postId: r.econ_discuss_post_id as string & tags.Format<"uuid">,
    hostUserId: r.host_user_id as string & tags.Format<"uuid">,
    state: r.state as IEEconDiscussLiveThreadState,
    expertOnly: r.expert_only,
    accessScope: r.access_scope as IEEconDiscussLiveAccessScope,
    scheduledStartAt: r.scheduled_start_at
      ? toISOStringSafe(r.scheduled_start_at)
      : null,
    startedAt: r.started_at ? toISOStringSafe(r.started_at) : null,
    pausedAt: r.paused_at ? toISOStringSafe(r.paused_at) : null,
    endedAt: r.ended_at ? toISOStringSafe(r.ended_at) : null,
    archivedAt: r.archived_at ? toISOStringSafe(r.archived_at) : null,
    createdAt: toISOStringSafe(r.created_at),
    updatedAt: toISOStringSafe(r.updated_at),
  }));

  return {
    pagination: {
      current: Number(pageNum),
      limit: Number(limitNum),
      records: Number(total),
      pages: Number(Math.ceil(total / (limitNum || 1))),
    },
    data,
  };
}
