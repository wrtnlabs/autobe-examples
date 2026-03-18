import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IHrmTimeTrackingEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingEmployee";
import { IHrmTimeTrackingOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingOrganization";
import { IHrmTimeTrackingProject } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingProject";
import { IHrmTimeTrackingProjectMembership } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingProjectMembership";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { HrmTimeTrackingProjectMembershipCollector } from "../collectors/HrmTimeTrackingProjectMembershipCollector";
import { HrmTimeTrackingProjectMembershipTransformer } from "../transformers/HrmTimeTrackingProjectMembershipTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postHrmTimeTrackingProjectsProjectIdMemberships(props: {
  projectId: string & tags.Format<"uuid">;
  body: IHrmTimeTrackingProjectMembership.ICreate;
}): Promise<IHrmTimeTrackingProjectMembership> {
  const project =
    await MyGlobal.prisma.hrm_time_tracking_projects.findFirstOrThrow({
      where: {
        id: props.projectId,
        deleted_at: null,
      },
      select: {
        id: true,
        hrm_time_tracking_organization_id: true,
      },
    });
  const employee =
    await MyGlobal.prisma.hrm_time_tracking_employees.findFirstOrThrow({
      where: {
        id: props.body.employee_id,
        deleted_at: null,
      },
      select: {
        id: true,
      },
    });
  const existing =
    await MyGlobal.prisma.hrm_time_tracking_project_memberships.findFirst({
      where: {
        hrm_time_tracking_project_id: project.id,
        hrm_time_tracking_employee_id: employee.id,
        deleted_at: null,
      },
      select: {
        id: true,
      },
    });
  if (existing !== null) {
    throw new HttpException("Project membership already exists.", 409);
  }
  try {
    const created =
      await MyGlobal.prisma.hrm_time_tracking_project_memberships.create({
        data: await HrmTimeTrackingProjectMembershipCollector.collect({
          body: props.body,
          project,
        }),
        ...HrmTimeTrackingProjectMembershipTransformer.select(),
      });
    return await HrmTimeTrackingProjectMembershipTransformer.transform(created);
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      throw new HttpException("Project membership already exists.", 409);
    }
    throw error;
  }
}
