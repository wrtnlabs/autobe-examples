import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IErpHrmTimeDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeDepartment";
import { IErpHrmTimeEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeEmployee";
import { IErpHrmTimeMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeMember";
import { IErpHrmTimeOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeOrganization";
import { IErpHrmTimeProject } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeProject";
import { IErpHrmTimeRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeRole";
import { IErpHrmTimeTask } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeTask";
import { IErpHrmTimeTimer } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeTimer";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { ErpHrmTimeTimerCollector } from "../collectors/ErpHrmTimeTimerCollector";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { ErpHrmTimeTimerTransformer } from "../transformers/ErpHrmTimeTimerTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postErpHrmTimeMemberTimersStart(props: {
  member: MemberPayload;
  body: IErpHrmTimeTimer.ICreate;
}): Promise<IErpHrmTimeTimer> {
  const employee =
    await MyGlobal.prisma.erp_hrm_time_employees.findFirstOrThrow({
      where: {
        erp_hrm_time_member_id: props.member.id,
        deleted_at: null,
      },
      select: {
        id: true,
        status: true,
        erp_hrm_time_organization_id: true,
      },
    });
  if (employee.status !== "active") {
    throw new HttpException("Deactivated employee cannot use timer", 403);
  }
  return await MyGlobal.prisma.$transaction(async (prisma) => {
    const existing = await prisma.erp_hrm_time_timers.findFirst({
      where: {
        employee_id: employee.id,
        deleted_at: null,
      },
      select: {
        id: true,
      },
    });
    if (existing !== null) {
      throw new HttpException(
        "An active timer already exists for this employee",
        409,
      );
    }
    await prisma.erp_hrm_time_projects.findFirstOrThrow({
      where: {
        id: props.body.project_id,
        erp_hrm_time_organization_id: employee.erp_hrm_time_organization_id,
        deleted_at: null,
      },
      select: {
        id: true,
      },
    });
    if (props.body.task_id !== undefined && props.body.task_id !== null) {
      await prisma.erp_hrm_time_tasks.findFirstOrThrow({
        where: {
          id: props.body.task_id,
          erp_hrm_time_project_id: props.body.project_id,
          deleted_at: null,
        },
        select: {
          id: true,
        },
      });
    }
    try {
      const created = await prisma.erp_hrm_time_timers.create({
        data: await ErpHrmTimeTimerCollector.collect({
          body: props.body,
          member: props.member,
          employee: {
            id: employee.id,
          },
        }),
        ...ErpHrmTimeTimerTransformer.select(),
      });
      return await ErpHrmTimeTimerTransformer.transform(created);
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === "P2002"
      ) {
        throw new HttpException(
          "An active timer already exists for this employee",
          409,
        );
      }
      throw error;
    }
  });
}
