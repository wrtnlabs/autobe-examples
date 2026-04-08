import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IErpHrmDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmDepartment";
import { IErpHrmEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmEmployee";
import { IErpHrmMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmMember";
import { IErpHrmOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmOrganization";
import { IErpHrmProject } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmProject";
import { IErpHrmRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmRole";
import { IErpHrmTask } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTask";
import { IErpHrmTimelog } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimelog";
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
  // Find the employee record for the authenticated member
  const employee = await MyGlobal.prisma.erp_hrm_employees.findFirst({
    where: {
      erp_hrm_member_id: props.member.id,
      deleted_at: null,
    },
    select: {
      id: true,
      erp_hrm_organization_id: true,
      status: true,
    },
  });
  if (employee === null) {
    throw new HttpException("Employee not found", 404);
  }
  if (employee.status !== "active") {
    throw new HttpException("Employee is not active", 400);
  }
  // Validate project exists, belongs to same organization, and has active status
  const project = await MyGlobal.prisma.erp_hrm_projects.findFirst({
    where: {
      id: props.body.projectId,
      erp_hrm_organization_id: employee.erp_hrm_organization_id,
    },
    select: {
      id: true,
      status: true,
    },
  });
  if (project === null) {
    throw new HttpException("Project not found", 404);
  }
  if (project.status !== "active") {
    throw new HttpException("Project is not active", 400);
  }
  // Verify employee is a member of the project
  const projectMembership =
    await MyGlobal.prisma.erp_hrm_project_members.findFirst({
      where: {
        erp_hrm_employee_id: employee.id,
        erp_hrm_project_id: props.body.projectId,
      },
      select: {
        id: true,
      },
    });
  if (projectMembership === null) {
    throw new HttpException("Employee is not a member of this project", 403);
  }
  // Validate task if provided (must belong to the project)
  if (props.body.taskId !== undefined && props.body.taskId !== null) {
    const task = await MyGlobal.prisma.erp_hrm_tasks.findFirst({
      where: {
        id: props.body.taskId,
        erp_hrm_project_id: props.body.projectId,
      },
      select: {
        id: true,
      },
    });
    if (task === null) {
      throw new HttpException(
        "Task not found or does not belong to the specified project",
        404,
      );
    }
  }
  // Validate date is not in the future (compare date portions only)
  const inputDate = props.body.date;
  const today = new Date();
  const todayStr = today.toISOString().split("T")[0];
  const inputDateOnly = inputDate.split("T")[0];
  if (inputDateOnly > todayStr) {
    throw new HttpException("Date cannot be in the future", 400);
  }
  // Prepare entity objects for the collector
  const employeeEntity: IEntity = {
    id: employee.id,
  };
  const sessionEntity: IEntity = {
    id: props.member.session_id,
  };
  // Create the timelog using the collector
  const created = await MyGlobal.prisma.erp_hrm_timelogs.create({
    data: await ErpHrmTimelogCollector.collect({
      body: props.body,
      erpHrmEmployees: employeeEntity,
      erpHrmMemberSessions: sessionEntity,
    }),
    ...ErpHrmTimelogTransformer.select(),
  });
  return await ErpHrmTimelogTransformer.transform(created);
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
// import { IErpHrmOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmOrganization";
// import { IErpHrmDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmDepartment";
// import { IErpHrmProject } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmProject";
// import { IErpHrmTask } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTask";
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