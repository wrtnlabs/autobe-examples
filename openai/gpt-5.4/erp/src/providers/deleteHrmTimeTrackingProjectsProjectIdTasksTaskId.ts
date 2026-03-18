import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function deleteHrmTimeTrackingProjectsProjectIdTasksTaskId(props: {
  projectId: string & tags.Format<"uuid">;
  taskId: string & tags.Format<"uuid">;
}): Promise<void> {
  const request: {
    headers?: Record<string, string | string[] | undefined>;
  } | null = (() => {
    const scoped = (
      globalThis as {
        __nestia_request__?: {
          headers?: Record<string, string | string[] | undefined>;
        };
      }
    ).__nestia_request__;
    return scoped ?? null;
  })();
  const authorizationHeader: string | null = (() => {
    if (request?.headers === undefined) return null;
    const value =
      request.headers.authorization ?? request.headers.Authorization;
    if (typeof value === "string") return value;
    if (Array.isArray(value) && value.length > 0) return value[0] ?? null;
    return null;
  })();
  if (
    authorizationHeader === null ||
    authorizationHeader.startsWith("Bearer ") === false
  ) {
    throw new HttpException("Unauthorized", 401);
  }
  const token: string = authorizationHeader.slice("Bearer ".length);
  const decoded: string | jwt.JwtPayload = jwt.verify(
    token,
    MyGlobal.env.JWT_SECRET_KEY,
  );
  if (typeof decoded === "string") {
    throw new HttpException("Unauthorized", 401);
  }
  const actorType: unknown = decoded.type;
  const organizationId: unknown = decoded.organizationId;
  const permissions: unknown = decoded.permissions;
  if (typeof organizationId !== "string") {
    throw new HttpException("Unauthorized", 401);
  }
  if (actorType !== "owner") {
    if (actorType === "employee") {
      throw new HttpException("Forbidden", 403);
    }
    if (
      Array.isArray(permissions) === false ||
      permissions.includes("project:manage") === false
    ) {
      throw new HttpException("Forbidden", 403);
    }
  }
  await MyGlobal.prisma.hrm_time_tracking_projects.findFirstOrThrow({
    where: {
      id: props.projectId,
      hrm_time_tracking_organization_id: organizationId,
      deleted_at: null,
    },
    select: {
      id: true,
    },
  });
  await MyGlobal.prisma.hrm_time_tracking_tasks.findFirstOrThrow({
    where: {
      id: props.taskId,
      hrm_time_tracking_project_id: props.projectId,
      deleted_at: null,
    },
    select: {
      id: true,
    },
  });
  const linkedTimelog =
    await MyGlobal.prisma.hrm_time_tracking_timelogs.findFirst({
      where: {
        hrm_time_tracking_task_id: props.taskId,
        deleted_at: null,
      },
      select: {
        id: true,
      },
    });
  if (linkedTimelog !== null) {
    throw new HttpException("Task with linked timelogs cannot be deleted", 409);
  }
  const childTask = await MyGlobal.prisma.hrm_time_tracking_tasks.findFirst({
    where: {
      parent_id: props.taskId,
      deleted_at: null,
    },
    select: {
      id: true,
    },
  });
  if (childTask !== null) {
    throw new HttpException("Task with child tasks cannot be deleted", 409);
  }
  await MyGlobal.prisma.$transaction(async (prisma) => {
    await prisma.hrm_time_tracking_tasks.delete({
      where: {
        id: props.taskId,
      },
    });
  });
}
