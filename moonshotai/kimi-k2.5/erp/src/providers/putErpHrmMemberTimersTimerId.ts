import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IErpHrmDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmDepartment";
import { IErpHrmMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmMember";
import { IErpHrmOrganizationMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmOrganizationMember";
import { IErpHrmProject } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmProject";
import { IErpHrmRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmRole";
import { IErpHrmTask } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTask";
import { IErpHrmTimer } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimer";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { ErpHrmTimerTransformer } from "../transformers/ErpHrmTimerTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function putErpHrmMemberTimersTimerId(props: {
  member: MemberPayload;
  timerId: string & tags.Format<"uuid">;
  body: IErpHrmTimer.IUpdate;
}): Promise<IErpHrmTimer> {
  // First, find the organization member record for this member
  const organizationMember =
    await MyGlobal.prisma.erp_hrm_organization_members.findFirst({
      where: {
        user_id: props.member.id,
      },
      select: {
        id: true,
      },
    });
  if (organizationMember === null) {
    throw new HttpException("Organization member not found", 404);
  }
  // Verify timer exists and belongs to this member
  const existingTimer = await MyGlobal.prisma.erp_hrm_timers.findUnique({
    where: {
      id: props.timerId,
    },
    select: {
      id: true,
      organization_member_id: true,
      project_id: true,
    },
  });
  if (existingTimer === null) {
    throw new HttpException("Timer not found", 404);
  }
  if (existingTimer.organization_member_id !== organizationMember.id) {
    throw new HttpException("Forbidden - timer does not belong to you", 403);
  }
  // Validate projectId if provided
  if (props.body.projectId !== undefined) {
    // Check project exists
    const project = await MyGlobal.prisma.erp_hrm_projects.findUnique({
      where: {
        id: props.body.projectId,
      },
      select: {
        id: true,
      },
    });
    if (project === null) {
      throw new HttpException("Project not found", 404);
    }
    // Check employee is a member of this project
    const projectMember =
      await MyGlobal.prisma.erp_hrm_project_members.findFirst({
        where: {
          project_id: props.body.projectId,
          organization_member_id: organizationMember.id,
        },
        select: {
          id: true,
        },
      });
    if (projectMember === null) {
      throw new HttpException("You are not a member of this project", 403);
    }
  }
  // Validate taskId if provided
  if (props.body.taskId !== undefined && props.body.taskId !== null) {
    // Determine which project to check against
    const projectIdToCheck = props.body.projectId ?? existingTimer.project_id;
    const task = await MyGlobal.prisma.erp_hrm_tasks.findUnique({
      where: {
        id: props.body.taskId,
      },
      select: {
        id: true,
        project_id: true,
      },
    });
    if (task === null) {
      throw new HttpException("Task not found", 404);
    }
    if (task.project_id !== projectIdToCheck) {
      throw new HttpException(
        "Task does not belong to the selected project",
        400,
      );
    }
  }
  // Build update data
  const updateData: Prisma.erp_hrm_timersUpdateInput = {
    ...(props.body.description !== undefined && {
      description: props.body.description,
    }),
    ...(props.body.projectId !== undefined && {
      project: { connect: { id: props.body.projectId } },
    }),
    ...(props.body.taskId !== undefined && {
      task:
        props.body.taskId === null
          ? { disconnect: true }
          : { connect: { id: props.body.taskId } },
    }),
    updated_at: new Date(),
  };
  // Perform the update
  await MyGlobal.prisma.erp_hrm_timers.update({
    where: {
      id: props.timerId,
    },
    data: updateData,
  });
  // Fetch and return the updated timer
  const updatedTimer = await MyGlobal.prisma.erp_hrm_timers.findUniqueOrThrow({
    where: {
      id: props.timerId,
    },
    ...ErpHrmTimerTransformer.select(),
  });
  return await ErpHrmTimerTransformer.transform(updatedTimer);
}
