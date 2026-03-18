import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IHrmTimeTrackingActivityLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingActivityLog";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIHrmTimeTrackingActivityLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIHrmTimeTrackingActivityLog";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchHrmTimeTrackingActivityLogs(props: {
  body: IHrmTimeTrackingActivityLog.IRequest;
}): Promise<IPageIHrmTimeTrackingActivityLog.ISummary> {
  const currentTimestamp: string & tags.Format<"date-time"> = typia.random<
    string & tags.Format<"date-time">
  >();
  const activeOwnerSessions =
    await MyGlobal.prisma.hrm_time_tracking_owner_sessions.findMany({
      where: {
        expired_at: {
          gt: currentTimestamp,
        },
        organization: {
          deleted_at: null,
        },
      },
      select: {
        id: true,
        hrm_time_tracking_organization_id: true,
        created_at: true,
      },
      orderBy: {
        created_at: "desc",
      },
      take: 2,
    });
  if (activeOwnerSessions.length === 0) {
    throw new HttpException("Organization context not found", 404);
  }
  if (activeOwnerSessions.length > 1) {
    throw new HttpException("Forbidden", 403);
  }
  if (
    props.body.startCreatedAt !== undefined &&
    props.body.endCreatedAt !== undefined
  ) {
    const startTime: number = globalThis.Date.parse(props.body.startCreatedAt);
    const endTime: number = globalThis.Date.parse(props.body.endCreatedAt);
    if (
      globalThis.Number.isNaN(startTime) ||
      globalThis.Number.isNaN(endTime)
    ) {
      throw new HttpException("Invalid created_at range", 400);
    }
    if (startTime > endTime) {
      throw new HttpException("Invalid created_at range", 400);
    }
  }
  const page: number = props.body.page ?? 1;
  const limit: number = props.body.limit ?? 100;
  const skip: number = (page - 1) * limit;
  const orderByInput = (() => {
    const raw: string = props.body.sort ?? "created_at:desc";
    const segments: string[] = raw.split(":");
    if (segments.length > 2 || segments[0] === "") {
      throw new HttpException("Invalid sort field", 400);
    }
    const field: string = segments[0] ?? "created_at";
    const directionText: string =
      segments[1] ?? (field === "created_at" ? "desc" : "asc");
    if (directionText !== "asc" && directionText !== "desc") {
      throw new HttpException("Invalid sort direction", 400);
    }
    if (field === "created_at") {
      return {
        created_at: directionText,
      } satisfies Prisma.hrm_time_tracking_activity_logsOrderByWithRelationInput;
    }
    if (field === "action_type") {
      return {
        action_type: directionText,
      } satisfies Prisma.hrm_time_tracking_activity_logsOrderByWithRelationInput;
    }
    if (field === "target_entity") {
      return {
        target_entity: directionText,
      } satisfies Prisma.hrm_time_tracking_activity_logsOrderByWithRelationInput;
    }
    throw new HttpException("Invalid sort field", 400);
  })();
  const whereInput = {
    hrm_time_tracking_organization_id:
      activeOwnerSessions[0].hrm_time_tracking_organization_id,
    deleted_at: null,
    ...(props.body.actorType !== undefined
      ? {
          actor_type: props.body.actorType,
        }
      : {}),
    ...(props.body.actionType !== undefined
      ? {
          action_type: props.body.actionType,
        }
      : {}),
    ...(props.body.targetEntity !== undefined
      ? {
          target_entity: props.body.targetEntity,
        }
      : {}),
    ...(props.body.targetEntityId !== undefined
      ? {
          target_entity_id: props.body.targetEntityId,
        }
      : {}),
    ...(props.body.search !== undefined
      ? {
          details: {
            contains: props.body.search,
            mode: "insensitive",
          },
        }
      : {}),
    ...(props.body.startCreatedAt !== undefined ||
    props.body.endCreatedAt !== undefined
      ? {
          created_at: {
            ...(props.body.startCreatedAt !== undefined
              ? {
                  gte: props.body.startCreatedAt,
                }
              : {}),
            ...(props.body.endCreatedAt !== undefined
              ? {
                  lte: props.body.endCreatedAt,
                }
              : {}),
          },
        }
      : {}),
  } satisfies Prisma.hrm_time_tracking_activity_logsWhereInput;
  const rows = await MyGlobal.prisma.hrm_time_tracking_activity_logs.findMany({
    where: whereInput,
    skip,
    take: limit,
    orderBy: orderByInput,
    select: {
      id: true,
      actor_type: true,
      action_type: true,
      target_entity: true,
      target_entity_id: true,
      details: true,
      created_at: true,
      ownerActorLink: {
        select: {
          id: true,
          deleted_at: true,
          owner: {
            select: {
              id: true,
              deleted_at: true,
            },
          },
        },
      },
      managerActorLink: {
        select: {
          id: true,
          deleted_at: true,
          manager: {
            select: {
              id: true,
              deleted_at: true,
            },
          },
        },
      },
      employeeActor: {
        select: {
          id: true,
          deleted_at: true,
          employee: {
            select: {
              id: true,
              deleted_at: true,
            },
          },
        },
      },
    },
  });
  const total = await MyGlobal.prisma.hrm_time_tracking_activity_logs.count({
    where: whereInput,
  });
  return {
    data: await ArrayUtil.asyncMap(rows, async (row) => {
      const ownerLinked: boolean =
        row.ownerActorLink !== null &&
        row.ownerActorLink.deleted_at === null &&
        row.ownerActorLink.owner.deleted_at === null;
      const managerLinked: boolean =
        row.managerActorLink !== null &&
        row.managerActorLink.deleted_at === null &&
        row.managerActorLink.manager.deleted_at === null;
      const employeeLinked: boolean =
        row.employeeActor !== null &&
        row.employeeActor.deleted_at === null &&
        row.employeeActor.employee.deleted_at === null;
      if (
        row.actor_type === "owner" &&
        (ownerLinked === false ||
          managerLinked === true ||
          employeeLinked === true)
      ) {
        throw new HttpException("Invalid activity log actor linkage", 500);
      }
      if (
        row.actor_type === "manager" &&
        (ownerLinked === true ||
          managerLinked === false ||
          employeeLinked === true)
      ) {
        throw new HttpException("Invalid activity log actor linkage", 500);
      }
      if (
        row.actor_type === "employee" &&
        (ownerLinked === true ||
          managerLinked === true ||
          employeeLinked === false)
      ) {
        throw new HttpException("Invalid activity log actor linkage", 500);
      }
      if (
        row.actor_type !== "owner" &&
        row.actor_type !== "manager" &&
        row.actor_type !== "employee"
      ) {
        throw new HttpException("Invalid activity log actor linkage", 500);
      }
      return {
        id: row.id,
        actor_type: row.actor_type,
        action_type: row.action_type,
        target_entity: row.target_entity,
        target_entity_id: row.target_entity_id,
        details: row.details,
        created_at: toISOStringSafe(row.created_at),
      };
    }),
    pagination: {
      current: page,
      limit,
      records: total,
      pages: Math.ceil(total / limit),
    } satisfies IPage.IPagination,
  };
}
