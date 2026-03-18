import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IErpHrmTimeTrackingProject } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeTrackingProject";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { ErpHrmTimeTrackingProjectTransformer } from "../transformers/ErpHrmTimeTrackingProjectTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function putErpHrmTimeTrackingMemberProjectsProjectId(props: {
  member: MemberPayload;
  projectId: string & tags.Format<"uuid">;
  body: IErpHrmTimeTrackingProject.IUpdate;
}): Promise<IErpHrmTimeTrackingProject> {
  if (props.body.name === undefined || props.body.name.trim().length === 0) {
    throw new HttpException("Project name is required", 400);
  }
  if (props.body.color === undefined || props.body.color.trim().length === 0) {
    throw new HttpException("Project color is required", 400);
  }
  // Organization id is not available on the session select shape provided by the compiler.
  // Infer it from the project itself by id.
  const projectById =
    await MyGlobal.prisma.erp_hrm_time_tracking_projects.findUniqueOrThrow({
      where: { id: props.projectId },
      select: {
        erp_hrm_time_tracking_organization_id: true,
      },
    });
  const organizationId = projectById.erp_hrm_time_tracking_organization_id;
  if (props.body.status !== undefined) {
    if (props.body.status.trim().length === 0) {
      throw new HttpException("Project status cannot be empty", 400);
    }
  }
  const updated = await MyGlobal.prisma.$transaction(async (prisma) => {
    await prisma.erp_hrm_time_tracking_projects.findUniqueOrThrow({
      where: {
        id: props.projectId,
        erp_hrm_time_tracking_organization_id: organizationId,
      },
    });
    await prisma.erp_hrm_time_tracking_projects.update({
      where: {
        id: props.projectId,
        erp_hrm_time_tracking_organization_id: organizationId,
      },
      data: {
        name: props.body.name,
        color: props.body.color,
        ...(props.body.status !== undefined
          ? { status: props.body.status }
          : {}),
      },
      select: {
        id: true,
        erp_hrm_time_tracking_organization_id: true,
        name: true,
        color: true,
        status: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
      },
    });
    const entity =
      await prisma.erp_hrm_time_tracking_projects.findUniqueOrThrow({
        where: {
          id: props.projectId,
          erp_hrm_time_tracking_organization_id: organizationId,
        },
        select: ErpHrmTimeTrackingProjectTransformer.select().select,
      });
    return await ErpHrmTimeTrackingProjectTransformer.transform(entity);
  });
  return updated;
}
