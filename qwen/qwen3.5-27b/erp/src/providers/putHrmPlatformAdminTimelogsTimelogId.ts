import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IHrmPlatformDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformDepartment";
import { IHrmPlatformEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformEmployee";
import { IHrmPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformMember";
import { IHrmPlatformOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformOrganization";
import { IHrmPlatformOrganizationLogo } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformOrganizationLogo";
import { IHrmPlatformOrganizationSetting } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformOrganizationSetting";
import { IHrmPlatformProject } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformProject";
import { IHrmPlatformRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformRole";
import { IHrmPlatformTask } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformTask";
import { IHrmPlatformTimelog } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformTimelog";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { AdminPayload } from "../decorators/payload/AdminPayload";
import { HrmPlatformTimelogTransformer } from "../transformers/HrmPlatformTimelogTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function putHrmPlatformAdminTimelogsTimelogId(props: {
  admin: AdminPayload;
  timelogId: string & tags.Format<"uuid">;
  body: IHrmPlatformTimelog.IUpdate;
}): Promise<IHrmPlatformTimelog> {
  // Find the timelog by ID (throws 404 if not found)
  const timelog = await MyGlobal.prisma.hrm_platform_timelogs.findUniqueOrThrow(
    {
      where: { id: props.timelogId },
      select: {
        id: true,
        deleted_at: true,
      },
    },
  );
  // Check if timelog is soft-deleted
  if (timelog.deleted_at !== null) {
    throw new HttpException("Timelog not found", 404);
  }
  // Build update data with only provided fields
  const updateData: Prisma.hrm_platform_timelogsUpdateInput = {
    updated_at: new Date(),
  };
  if (props.body.duration !== undefined) {
    updateData.duration = props.body.duration;
  }
  if (props.body.hrm_platform_project_id !== undefined) {
    updateData.project = {
      connect: { id: props.body.hrm_platform_project_id },
    };
  }
  if (props.body.hrm_platform_task_id !== undefined) {
    if (props.body.hrm_platform_task_id === null) {
      updateData.task = { disconnect: true };
    } else {
      updateData.task = { connect: { id: props.body.hrm_platform_task_id } };
    }
  }
  if (props.body.billable !== undefined) {
    updateData.billable = props.body.billable;
  }
  if (props.body.description !== undefined) {
    updateData.description = props.body.description;
  }
  // Update the timelog
  await MyGlobal.prisma.hrm_platform_timelogs.update({
    where: { id: props.timelogId },
    data: updateData,
  });
  // Fetch the updated timelog with all relations for response
  const updatedTimelog =
    await MyGlobal.prisma.hrm_platform_timelogs.findUniqueOrThrow({
      where: { id: props.timelogId },
      ...HrmPlatformTimelogTransformer.select(),
    });
  // Transform and return
  return await HrmPlatformTimelogTransformer.transform(updatedTimelog);
}
