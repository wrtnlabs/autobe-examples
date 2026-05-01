import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IErpHrmDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmDepartment";
import { IErpHrmEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmEmployee";
import { IErpHrmMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmMember";
import { IErpHrmProject } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmProject";
import { IErpHrmRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmRole";
import { IErpHrmTask } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTask";
import { IErpHrmTimelog } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimelog";
import { IErpHrmTimesheet } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimesheet";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { ErpHrmTimelogCollector } from "../collectors/ErpHrmTimelogCollector";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { ErpHrmTimelogTransformer } from "../transformers/ErpHrmTimelogTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postErpHrmMemberTimelogs(props: {
  member: MemberPayload;
  body: IErpHrmTimelog.ICreate;
}): Promise<IErpHrmTimelog> {
  const session =
    await MyGlobal.prisma.erp_hrm_member_sessions.findUniqueOrThrow({
      where: { id: props.member.session_id },
      select: { id: true, erp_hrm_organization_id: true },
    });
  if (session.erp_hrm_organization_id === null) {
    throw new HttpException("No organization selected", 400);
  }
  const myEmployee = await MyGlobal.prisma.erp_hrm_employees.findFirstOrThrow({
    where: {
      erp_hrm_member_id: props.member.id,
      erp_hrm_organization_id: session.erp_hrm_organization_id,
      deleted_at: null,
    },
    select: { id: true, status: true, erp_hrm_role_id: true },
  });
  if (props.body.employee_id !== undefined) {
    const role = await MyGlobal.prisma.erp_hrm_roles.findUniqueOrThrow({
      where: { id: myEmployee.erp_hrm_role_id },
      select: { id: true, name: true, is_builtin: true },
    });
    let hasTimeManage = false;
    if (role.is_builtin) {
      hasTimeManage = role.name === "Owner" || role.name === "Manager";
    } else {
      const perm = await MyGlobal.prisma.erp_hrm_role_permissions.findFirst({
        where: {
          erp_hrm_role_id: role.id,
          permission: { key: "time:manage" },
        },
        select: { id: true },
      });
      hasTimeManage = perm !== null;
    }
    if (!hasTimeManage) {
      throw new HttpException(
        "Only users with time:manage permission can specify employee_id",
        403,
      );
    }
  }
  const resolvedEmployeeId = props.body.employee_id ?? myEmployee.id;
  const targetEmployee =
    await MyGlobal.prisma.erp_hrm_employees.findUniqueOrThrow({
      where: { id: resolvedEmployeeId },
      select: { id: true, status: true },
    });
  if (targetEmployee.status !== "active") {
    throw new HttpException(
      "Employee is deactivated and cannot create timelogs",
      400,
    );
  }
  const project = await MyGlobal.prisma.erp_hrm_projects.findUniqueOrThrow({
    where: { id: props.body.project_id },
    select: { id: true, status: true },
  });
  if (project.status !== "active") {
    throw new HttpException(
      "Project is not active and cannot receive new timelogs",
      400,
    );
  }
  const projectMember = await MyGlobal.prisma.erp_hrm_project_members.findFirst(
    {
      where: {
        erp_hrm_employee_id: resolvedEmployeeId,
        erp_hrm_project_id: props.body.project_id,
        deleted_at: null,
      },
      select: { id: true },
    },
  );
  if (projectMember === null) {
    throw new HttpException("Employee is not a member of the project", 400);
  }
  if (props.body.task_id !== undefined) {
    const task = await MyGlobal.prisma.erp_hrm_tasks.findUniqueOrThrow({
      where: { id: props.body.task_id },
      select: { id: true, erp_hrm_project_id: true },
    });
    if (task.erp_hrm_project_id !== props.body.project_id) {
      throw new HttpException(
        "Task does not belong to the specified project",
        400,
      );
    }
  }
  const employeeRef = typia.assert<IEntity>({ id: myEmployee.id });
  const sessionRef: IEntity = { id: props.member.session_id };
  const record = await MyGlobal.prisma.erp_hrm_timelogs.create({
    data: await ErpHrmTimelogCollector.collect({
      body: props.body,
      erpHrmEmployees: employeeRef,
      erpHrmMemberSessions: sessionRef,
    }),
    ...ErpHrmTimelogTransformer.select(),
  });
  return await ErpHrmTimelogTransformer.transform(record);
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
// import { IErpHrmTimelog } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimelog";
// import { IErpHrmEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmEmployee";
// import { IErpHrmMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmMember";
// import { IErpHrmRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmRole";
// import { IErpHrmDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmDepartment";
// import { IErpHrmProject } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmProject";
// import { IErpHrmTask } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTask";
// import { IErpHrmTimesheet } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimesheet";
// 
// // DON'T CHANGE FUNCTION NAME AND PARAMETERS,
// // ONLY YOU HAVE TO WRITE THIS FUNCTION BODY, AND USE IMPORTED.
// export async function postErpHrmMemberTimelogs(props: {
//   member: MemberPayload;
//   body: IErpHrmTimelog.ICreate;
// }): Promise<IErpHrmTimelog> {
//   const record = await MyGlobal.prisma.erp_hrm_timelogs.create({
//     data: await ErpHrmTimelogCollector.collect({
//       body: props.body,
//       ...
//     }),
//     ...ErpHrmTimelogTransformer.select(),
//   });
//   return await ErpHrmTimelogTransformer.transform(record);
// }
// ```
//--------------------------------------------------------------