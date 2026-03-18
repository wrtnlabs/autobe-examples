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
import { HrmTimeTrackingProjectMembershipTransformer } from "../transformers/HrmTimeTrackingProjectMembershipTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function putHrmTimeTrackingProjectsProjectIdMembershipsMembershipId(props: {
  projectId: string & tags.Format<"uuid">;
  membershipId: string & tags.Format<"uuid">;
  body: IHrmTimeTrackingProjectMembership.IUpdate;
}): Promise<IHrmTimeTrackingProjectMembership> {
  return await MyGlobal.prisma.$transaction(async (tx) => {
    const project = await tx.hrm_time_tracking_projects.findFirstOrThrow({
      where: {
        id: props.projectId,
        deleted_at: null,
      },
      select: {
        id: true,
        hrm_time_tracking_organization_id: true,
      },
    });
    const membership =
      await tx.hrm_time_tracking_project_memberships.findFirstOrThrow({
        where: {
          id: props.membershipId,
          hrm_time_tracking_project_id: project.id,
          deleted_at: null,
        },
        select: {
          id: true,
        },
      });
    if (props.body.hrm_time_tracking_employee_id !== undefined) {
      const employee = await tx.hrm_time_tracking_employees.findFirstOrThrow({
        where: {
          id: props.body.hrm_time_tracking_employee_id,
          deleted_at: null,
        },
        select: {
          id: true,
        },
      });
      await tx.hrm_time_tracking_project_memberships.findFirstOrThrow({
        where: {
          hrm_time_tracking_employee_id: employee.id,
          deleted_at: null,
          project: {
            hrm_time_tracking_organization_id:
              project.hrm_time_tracking_organization_id,
            deleted_at: null,
          },
        },
        select: {
          id: true,
        },
      });
      const duplicated =
        await tx.hrm_time_tracking_project_memberships.findFirst({
          where: {
            hrm_time_tracking_project_id: project.id,
            hrm_time_tracking_employee_id: employee.id,
            deleted_at: null,
            id: {
              not: membership.id,
            },
          },
          select: {
            id: true,
          },
        });
      if (duplicated !== null) {
        throw new HttpException(
          "Employee is already assigned to this project",
          400,
        );
      }
    }
    await tx.hrm_time_tracking_project_memberships.update({
      where: {
        id: membership.id,
      },
      data: {
        ...(props.body.membership_role !== undefined
          ? {
              membership_role: props.body.membership_role,
            }
          : {}),
        ...(props.body.hrm_time_tracking_employee_id !== undefined
          ? {
              employee: {
                connect: {
                  id: props.body.hrm_time_tracking_employee_id,
                },
              },
            }
          : {}),
        updated_at: new Date(),
      },
    });
    const updated =
      await tx.hrm_time_tracking_project_memberships.findUniqueOrThrow({
        where: {
          id: membership.id,
        },
        ...HrmTimeTrackingProjectMembershipTransformer.select(),
      });
    return await HrmTimeTrackingProjectMembershipTransformer.transform(updated);
  });
}
