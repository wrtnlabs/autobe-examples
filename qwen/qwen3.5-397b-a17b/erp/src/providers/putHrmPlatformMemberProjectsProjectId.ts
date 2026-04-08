import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IHrmPlatformOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformOrganization";
import { IHrmPlatformProject } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformProject";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { HrmPlatformProjectTransformer } from "../transformers/HrmPlatformProjectTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function putHrmPlatformMemberProjectsProjectId(props: {
  member: MemberPayload;
  projectId: string & tags.Format<"uuid">;
  body: IHrmPlatformProject.IUpdate;
}): Promise<IHrmPlatformProject> {
  const project = await MyGlobal.prisma.hrm_platform_projects.findUniqueOrThrow(
    {
      where: {
        id: props.projectId,
        deleted_at: null,
      },
      select: {
        id: true,
        organization_id: true,
        status: true,
      },
    },
  );
  const employee =
    await MyGlobal.prisma.hrm_platform_employees.findFirstOrThrow({
      where: {
        member: {
          id: props.member.id,
        },
        organization_id: project.organization_id,
        deleted_at: null,
      },
      include: {
        role: {
          include: {
            rolePermissions: {
              include: {
                permission: true,
              },
            },
          },
        },
      },
    });
  const hasManagePermission = employee.role.rolePermissions.some(
    (rp: {
      permission: {
        code: string;
      };
    }) => rp.permission.code === "project:manage",
  );
  if (!hasManagePermission) {
    throw new HttpException("Forbidden", 403);
  }
  if (props.body.status !== undefined) {
    const newStatus = props.body.status;
    const oldStatus = project.status;
    if (
      newStatus === "active" &&
      (oldStatus === "archived" || oldStatus === "completed")
    ) {
      const hasTimelogs = await MyGlobal.prisma.hrm_platform_timelogs.findFirst(
        {
          where: {
            hrm_platform_project_id: props.projectId,
          },
        },
      );
      if (hasTimelogs !== null) {
        throw new HttpException(
          "Cannot reactivate project with existing timelogs",
          400,
        );
      }
    }
  }
  await MyGlobal.prisma.hrm_platform_projects.update({
    where: {
      id: props.projectId,
    },
    data: {
      ...(props.body.name !== undefined && { name: props.body.name }),
      ...(props.body.description !== undefined && {
        description: props.body.description,
      }),
      ...(props.body.color !== undefined && { color: props.body.color }),
      ...(props.body.status !== undefined && { status: props.body.status }),
      ...(props.body.budget_hours !== undefined && {
        budget_hours: props.body.budget_hours,
      }),
      ...(props.body.start_date !== undefined && {
        start_date:
          props.body.start_date !== null ? props.body.start_date : null,
      }),
      ...(props.body.end_date !== undefined && {
        end_date: props.body.end_date !== null ? props.body.end_date : null,
      }),
      updated_at: new Date(),
    },
  });
  const updated = await MyGlobal.prisma.hrm_platform_projects.findUniqueOrThrow(
    {
      where: {
        id: props.projectId,
      },
      ...HrmPlatformProjectTransformer.select(),
    },
  );
  return await HrmPlatformProjectTransformer.transform(updated);
}
