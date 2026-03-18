import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IErpHrmTimeTrackingTimesheet } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeTrackingTimesheet";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { ErpHrmTimeTrackingTimesheetCollector } from "../collectors/ErpHrmTimeTrackingTimesheetCollector";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { ErpHrmTimeTrackingTimesheetTransformer } from "../transformers/ErpHrmTimeTrackingTimesheetTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postErpHrmTimeTrackingMemberTimesheets(props: {
  member: MemberPayload;
  body: IErpHrmTimeTrackingTimesheet.ICreate;
}): Promise<IErpHrmTimeTrackingTimesheet> {
  // derive org context from member session
  const session =
    await MyGlobal.prisma.erp_hrm_time_tracking_member_sessions.findUniqueOrThrow(
      {
        where: { id: props.member.session_id },
      },
    );
  const organizationId = (
    session as unknown as {
      erp_hrm_time_tracking_organization_id: string;
    }
  ).erp_hrm_time_tracking_organization_id;
  const weekStartAt = props.body.week_start_at;
  const weekEndAt = props.body.week_end_at;
  if (weekEndAt < weekStartAt) {
    throw new HttpException("week_end_at must be >= week_start_at", 400);
  }
  return await MyGlobal.prisma.$transaction(async (tx) => {
    const existing = await tx.erp_hrm_time_tracking_timesheets.findUnique({
      where: {
        erp_hrm_time_tracking_employee_id_week_start_at: {
          erp_hrm_time_tracking_employee_id:
            props.body.erp_hrm_time_tracking_employee_id,
          week_start_at: new Date(weekStartAt),
        },
      },
    });
    if (existing) {
      throw new HttpException(
        "Timesheet already exists for this employee and week",
        409,
      );
    }
    const employee = await tx.erp_hrm_time_tracking_members.findFirstOrThrow({
      where: {
        id: props.body.erp_hrm_time_tracking_employee_id,
        deleted_at: null,
      },
      select: { id: true },
    });
    const created = await tx.erp_hrm_time_tracking_timesheets.create({
      data: await ErpHrmTimeTrackingTimesheetCollector.collect({
        body: props.body,
        organization: { id: organizationId } as IEntity,
        employee: { id: employee.id } as IEntity,
      }),
      ...ErpHrmTimeTrackingTimesheetTransformer.select(),
    });
    return await ErpHrmTimeTrackingTimesheetTransformer.transform(created);
  });
}
