import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IErpHrmTimeOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeOrganization";
import { IErpHrmTimeProject } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeProject";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { ErpHrmTimeProjectTransformer } from "../transformers/ErpHrmTimeProjectTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function putErpHrmTimeMemberProjectsProjectId(props: {
  member: MemberPayload;
  projectId: string & tags.Format<"uuid">;
  body: IErpHrmTimeProject.IUpdate;
}): Promise<IErpHrmTimeProject> {
  const current = await MyGlobal.prisma.erp_hrm_time_projects.findUniqueOrThrow(
    {
      where: {
        id: props.projectId,
      },
      select: {
        id: true,
        erp_hrm_time_organization_id: true,
        status: true,
        deleted_at: true,
      },
    },
  );
  if (current.deleted_at !== null) {
    throw new HttpException("Project not found", 404);
  }
  const nextStatus: string = props.body.status;
  const allowedStatusTransitions: Record<string, readonly string[]> = {
    active: ["active", "archived", "completed"],
    archived: ["archived"],
    completed: ["completed"],
  };
  const allowedStatuses = allowedStatusTransitions[current.status] ?? [];
  if (!allowedStatuses.includes(nextStatus)) {
    throw new HttpException("Invalid project status transition", 400);
  }
  const updateData: Prisma.erp_hrm_time_projectsUpdateInput = {
    name: props.body.name,
    color_code: props.body.colorCode,
    status: props.body.status,
    ...(props.body.description === undefined
      ? {}
      : { description: props.body.description }),
    ...(props.body.budgetHours === undefined
      ? {}
      : { budget_hours: props.body.budgetHours }),
    ...(props.body.startDate === undefined
      ? {}
      : { start_date: props.body.startDate }),
    ...(props.body.endDate === undefined
      ? {}
      : { end_date: props.body.endDate }),
    updated_at: toISOStringSafe(new Date()) as never,
  };
  await MyGlobal.prisma.erp_hrm_time_projects.update({
    where: { id: current.id },
    data: updateData,
  });
  const updated = await MyGlobal.prisma.erp_hrm_time_projects.findUniqueOrThrow(
    {
      where: { id: current.id },
      ...ErpHrmTimeProjectTransformer.select(),
    },
  );
  return await ErpHrmTimeProjectTransformer.transform(updated);
}
