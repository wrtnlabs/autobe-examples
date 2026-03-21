import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IErpHrmDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmDepartment";
import { IErpHrmEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmEmployee";
import { IErpHrmMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmMember";
import { IErpHrmOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmOrganization";
import { IErpHrmProjectMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmProjectMember";
import { IErpHrmRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmRole";
import { IErpHrmTask } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTask";
import { IErpHrmTaskHistory } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTaskHistory";
import { IErpHrmTimelog } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimelog";
import { IErpHrmTimer } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimer";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { ErpHrmTaskCollector } from "../collectors/ErpHrmTaskCollector";
import { AdminPayload } from "../decorators/payload/AdminPayload";
import { ErpHrmTaskTransformer } from "../transformers/ErpHrmTaskTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postErpHrmAdminProjectsProjectIdTasks(props: {
  admin: AdminPayload;
  projectId: string & tags.Format<"uuid">;
  body: IErpHrmTask.ICreate;
}): Promise<IErpHrmTask> {
  // Verify project exists and get organization context
  const project = await MyGlobal.prisma.erp_hrm_projects.findUniqueOrThrow({
    where: { id: props.projectId },
    select: { id: true, erp_hrm_organization_id: true },
  });
  // Validate employee is a project member (if erp_hrm_employee_id is provided)
  if (props.body.erp_hrm_employee_id) {
    const projectMember =
      await MyGlobal.prisma.erp_hrm_project_members.findFirst({
        where: {
          erp_hrm_project_id: props.projectId,
          erp_hrm_employee_id: props.body.erp_hrm_employee_id,
        },
        select: { id: true },
      });
    if (!projectMember) {
      throw new HttpException(
        "Only project members can be assigned to tasks",
        400,
      );
    }
  }
  // Validate parent task exists and belongs to same project (if parent_id is provided)
  if (props.body.parent_id) {
    const parentTask = await MyGlobal.prisma.erp_hrm_tasks.findUnique({
      where: { id: props.body.parent_id },
      select: { id: true, erp_hrm_project_id: true, parent_id: true },
    });
    if (!parentTask) {
      throw new HttpException("Parent task not found", 404);
    }
    if (parentTask.erp_hrm_project_id !== props.projectId) {
      throw new HttpException(
        "Parent task must belong to the same project",
        400,
      );
    }
    if (parentTask.parent_id !== null) {
      throw new HttpException(
        "Cannot create subtask under a subtask (one level nesting only)",
        400,
      );
    }
  }
  // Create task using collector for data transformation
  const created = await MyGlobal.prisma.erp_hrm_tasks.create({
    data: await ErpHrmTaskCollector.collect({
      body: props.body,
      erpHrmProjects: { id: project.id },
    }),
    ...ErpHrmTaskTransformer.select(),
  });
  return await ErpHrmTaskTransformer.transform(created);
}
