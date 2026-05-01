import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IErpHrmDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmDepartment";
import { IErpHrmEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmEmployee";
import { IErpHrmMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmMember";
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
  const timerOwnership = await MyGlobal.prisma.erp_hrm_timers.findUniqueOrThrow(
    {
      where: { id: props.timerId },
      select: {
        id: true,
        erp_hrm_employee_id: true,
        erp_hrm_project_id: true,
        erp_hrm_task_id: true,
        employee: {
          select: {
            id: true,
            erp_hrm_member_id: true,
          },
        },
      },
    },
  );
  if (timerOwnership.employee.erp_hrm_member_id !== props.member.id) {
    throw new HttpException("Forbidden", 403);
  }
  const employeeId = timerOwnership.erp_hrm_employee_id;
  const effectiveProjectId =
    props.body.project_id ?? timerOwnership.erp_hrm_project_id;
  if (props.body.project_id) {
    const membership = await MyGlobal.prisma.erp_hrm_project_members.findFirst({
      where: {
        erp_hrm_employee_id: employeeId,
        erp_hrm_project_id: props.body.project_id,
      },
    });
    if (!membership) {
      throw new HttpException("Employee is not a member of this project", 422);
    }
  }
  if (props.body.task_id !== undefined && props.body.task_id !== null) {
    const task = await MyGlobal.prisma.erp_hrm_tasks.findUniqueOrThrow({
      where: { id: props.body.task_id },
      select: { id: true, erp_hrm_project_id: true },
    });
    if (task.erp_hrm_project_id !== effectiveProjectId) {
      throw new HttpException(
        "Task does not belong to the specified project",
        422,
      );
    }
  }
  let shouldDisconnectTask = false;
  if (props.body.task_id === null) {
    shouldDisconnectTask = timerOwnership.erp_hrm_task_id !== null;
  } else if (
    props.body.task_id === undefined &&
    props.body.project_id &&
    timerOwnership.erp_hrm_task_id
  ) {
    const currentTask = await MyGlobal.prisma.erp_hrm_tasks.findUnique({
      where: { id: timerOwnership.erp_hrm_task_id },
      select: { erp_hrm_project_id: true },
    });
    if (
      !currentTask ||
      currentTask.erp_hrm_project_id !== props.body.project_id
    ) {
      shouldDisconnectTask = true;
    }
  }
  await MyGlobal.prisma.erp_hrm_timers.update({
    where: { id: props.timerId },
    data: {
      ...(props.body.description !== undefined && {
        description: props.body.description,
      }),
      ...(props.body.project_id && {
        project: { connect: { id: props.body.project_id } },
      }),
      ...(props.body.task_id !== undefined &&
        props.body.task_id !== null && {
          task: { connect: { id: props.body.task_id } },
        }),
      ...(shouldDisconnectTask && {
        task: { disconnect: true },
      }),
      updated_at: new Date(),
    },
  });
  const updated = await MyGlobal.prisma.erp_hrm_timers.findUniqueOrThrow({
    where: { id: props.timerId },
    ...ErpHrmTimerTransformer.select(),
  });
  return await ErpHrmTimerTransformer.transform(updated);
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
// import { IErpHrmTimer } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimer";
// import { IErpHrmEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmEmployee";
// import { IErpHrmMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmMember";
// import { IErpHrmRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmRole";
// import { IErpHrmDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmDepartment";
// import { IErpHrmProject } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmProject";
// import { IErpHrmTask } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTask";
// 
// // DON'T CHANGE FUNCTION NAME AND PARAMETERS,
// // ONLY YOU HAVE TO WRITE THIS FUNCTION BODY, AND USE IMPORTED.
// export async function putErpHrmMemberTimersTimerId(props: {
//   member: MemberPayload;
//   timerId: string & tags.Format<"uuid">;
//   body: IErpHrmTimer.IUpdate;
// }): Promise<IErpHrmTimer> {
//   await MyGlobal.prisma.erp_hrm_timers.update({
//     where: { ... },
//     data: { ... },
//   });
//   const updated = await MyGlobal.prisma.erp_hrm_timers.findUniqueOrThrow({
//     where: { ... },
//     ...ErpHrmTimerTransformer.select(),
//   });
//   return await ErpHrmTimerTransformer.transform(updated);
// }
// ```
//--------------------------------------------------------------