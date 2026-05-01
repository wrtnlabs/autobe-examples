import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IErpHrmDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmDepartment";
import { IErpHrmEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmEmployee";
import { IErpHrmMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmMember";
import { IErpHrmRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmRole";
import { IErpHrmTask } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTask";
import { IErpHrmTaskHistory } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTaskHistory";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { ErpHrmTaskHistoryTransformer } from "../transformers/ErpHrmTaskHistoryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getErpHrmMemberProjectsProjectIdTasksTaskIdHistoriesHistoryId(props: {
  member: MemberPayload;
  projectId: string & tags.Format<"uuid">;
  taskId: string & tags.Format<"uuid">;
  historyId: string & tags.Format<"uuid">;
}): Promise<IErpHrmTaskHistory> {
  const session =
    await MyGlobal.prisma.erp_hrm_member_sessions.findUniqueOrThrow({
      where: { id: props.member.session_id },
      select: { erp_hrm_organization_id: true },
    });
  if (!session.erp_hrm_organization_id) {
    throw new HttpException("No organization selected", 400);
  }
  const organizationId: string = session.erp_hrm_organization_id;
  const employee = await MyGlobal.prisma.erp_hrm_employees.findFirstOrThrow({
    where: {
      erp_hrm_member_id: props.member.id,
      erp_hrm_organization_id: organizationId,
      deleted_at: null,
    },
    select: {
      id: true,
      erp_hrm_role_id: true,
    },
  });
  await MyGlobal.prisma.erp_hrm_projects.findFirstOrThrow({
    where: {
      id: props.projectId,
      deleted_at: null,
      organization_id: organizationId,
    },
  });
  await MyGlobal.prisma.erp_hrm_tasks.findFirstOrThrow({
    where: {
      id: props.taskId,
      erp_hrm_project_id: props.projectId,
      deleted_at: null,
    },
  });
  const projectMember = await MyGlobal.prisma.erp_hrm_project_members.findFirst(
    {
      where: {
        erp_hrm_employee_id: employee.id,
        erp_hrm_project_id: props.projectId,
        deleted_at: null,
      },
    },
  );
  if (!projectMember) {
    const role = await MyGlobal.prisma.erp_hrm_roles.findUniqueOrThrow({
      where: { id: employee.erp_hrm_role_id },
      select: { name: true, is_builtin: true },
    });
    const hasBuiltinAccess: boolean =
      role.is_builtin &&
      (role.name === "Owner" ||
        role.name === "Manager" ||
        role.name === "Employee");
    if (!hasBuiltinAccess) {
      const hasPermission =
        await MyGlobal.prisma.erp_hrm_role_permissions.findFirst({
          where: {
            erp_hrm_role_id: employee.erp_hrm_role_id,
            permission: {
              key: { in: ["project:manage", "project:view"] },
            },
          },
        });
      if (!hasPermission) {
        throw new HttpException("Forbidden", 403);
      }
    }
  }
  const history = await MyGlobal.prisma.erp_hrm_task_histories.findFirstOrThrow(
    {
      where: {
        id: props.historyId,
        erp_hrm_task_id: props.taskId,
      },
      ...ErpHrmTaskHistoryTransformer.select(),
    },
  );
  return await ErpHrmTaskHistoryTransformer.transform(history);
}


//--------------------------------------------------------------
// TEMPLATE CODE
//--------------------------------------------------------------
// Complete the code below, disregard the import part and return only the function part.
// 
// ```typescript
// import { ArrayUtil } from "@nestia/e2e";
// import { HttpException } from "@nestjs/common";
// import { Prisma } from "@prisma/sdk";
// import jwt from "jsonwebtoken";
// import typia, { tags } from "typia";
// import { v4 } from "uuid";
// import { MyGlobal } from "../MyGlobal";
// import { PasswordUtil } from "../utils/PasswordUtil";
// import { toISOStringSafe } from "../utils/toISOStringSafe"
// 
// import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
// import { IErpHrmTaskHistory } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTaskHistory";
// import { IErpHrmTask } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTask";
// import { IErpHrmEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmEmployee";
// import { IErpHrmMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmMember";
// import { IErpHrmRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmRole";
// import { IErpHrmDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmDepartment";
// 
// // DON'T CHANGE FUNCTION NAME AND PARAMETERS,
// // ONLY YOU HAVE TO WRITE THIS FUNCTION BODY, AND USE IMPORTED.
// export async function getErpHrmMemberProjectsProjectIdTasksTaskIdHistoriesHistoryId(props: {
//   member: MemberPayload;
//   projectId: string & tags.Format<"uuid">;
//   taskId: string & tags.Format<"uuid">;
//   historyId: string & tags.Format<"uuid">;
// }): Promise<IErpHrmTaskHistory> {
//   const record = await MyGlobal.prisma.erp_hrm_task_histories.findFirstOrThrow({
//     ...ErpHrmTaskHistoryTransformer.select(),
//     where: { ... },
//   });
//   return await ErpHrmTaskHistoryTransformer.transform(record);
// }
// ```
//--------------------------------------------------------------