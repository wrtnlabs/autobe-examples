import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IHrmTimeTrackingOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingOrganization";
import { IHrmTimeTrackingProject } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingProject";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { HrmTimeTrackingProjectTransformer } from "../transformers/HrmTimeTrackingProjectTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function putHrmTimeTrackingProjectsProjectId(props: {
  projectId: string & tags.Format<"uuid">;
  body: IHrmTimeTrackingProject.IUpdate;
}): Promise<IHrmTimeTrackingProject> {
  const existing =
    await MyGlobal.prisma.hrm_time_tracking_projects.findUniqueOrThrow({
      where: { id: props.projectId },
      select: {
        id: true,
        name: true,
        color_code: true,
        status: true,
        budget_hours: true,
        start_date: true,
        end_date: true,
        deleted_at: true,
      },
    });
  if (existing.deleted_at !== null) {
    throw new HttpException("Project not found", 404);
  }
  const nextName: string = props.body.name ?? existing.name;
  const nextColorCode: string = props.body.colorCode ?? existing.color_code;
  const nextStatus: string = props.body.status ?? existing.status;
  const nextBudgetHours: number | null =
    props.body.budgetHours !== undefined
      ? props.body.budgetHours
      : existing.budget_hours;
  const nextStartDate: (string & tags.Format<"date-time">) | null =
    props.body.startDate !== undefined
      ? props.body.startDate
      : existing.start_date !== null
        ? existing.start_date.toISOString()
        : null;
  const nextEndDate: (string & tags.Format<"date-time">) | null =
    props.body.endDate !== undefined
      ? props.body.endDate
      : existing.end_date !== null
        ? existing.end_date.toISOString()
        : null;
  if (nextName.length === 0) {
    throw new HttpException("Project name is required", 400);
  }
  if (nextColorCode.length === 0) {
    throw new HttpException("Project color code is required", 400);
  }
  if (
    nextStatus !== "active" &&
    nextStatus !== "archived" &&
    nextStatus !== "completed"
  ) {
    throw new HttpException("Invalid project status", 400);
  }
  if (nextBudgetHours !== null && nextBudgetHours < 0) {
    throw new HttpException("Budget hours must be non-negative", 400);
  }
  if (
    nextStartDate !== null &&
    nextEndDate !== null &&
    nextEndDate < nextStartDate
  ) {
    throw new HttpException(
      "Project end date cannot be earlier than start date",
      400,
    );
  }
  const updated = await MyGlobal.prisma.$transaction(async (prisma) => {
    await prisma.hrm_time_tracking_projects.update({
      where: { id: props.projectId },
      data: {
        ...(props.body.name !== undefined && { name: props.body.name }),
        ...(props.body.description !== undefined && {
          description: props.body.description,
        }),
        ...(props.body.colorCode !== undefined && {
          color_code: props.body.colorCode,
        }),
        ...(props.body.status !== undefined && { status: props.body.status }),
        ...(props.body.budgetHours !== undefined && {
          budget_hours: props.body.budgetHours,
        }),
        ...(props.body.startDate !== undefined && {
          start_date:
            props.body.startDate === null
              ? null
              : new globalThis.Date(props.body.startDate),
        }),
        ...(props.body.endDate !== undefined && {
          end_date:
            props.body.endDate === null
              ? null
              : new globalThis.Date(props.body.endDate),
        }),
        updated_at: new globalThis.Date(),
      },
    });
    return await prisma.hrm_time_tracking_projects.findUniqueOrThrow({
      where: { id: props.projectId },
      ...HrmTimeTrackingProjectTransformer.select(),
    });
  });
  return await HrmTimeTrackingProjectTransformer.transform(updated);
}
