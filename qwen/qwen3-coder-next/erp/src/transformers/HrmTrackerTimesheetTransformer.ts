import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IHrmTrackerEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTrackerEmployee";
import { IHrmTrackerMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTrackerMember";
import { IHrmTrackerOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTrackerOrganization";
import { IHrmTrackerTimesheet } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTrackerTimesheet";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import typia, { tags } from "typia";

import { toISOStringSafe } from "../utils/toISOStringSafe";

export namespace HrmTrackerTimesheetTransformer {
  export type Payload = Prisma.hrm_tracker_timesheetsGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        hrm_tracker_organization_id: true,
        hrm_tracker_employee_id: true,
        week_start_date: true,
        week_end_date: true,
        status: true,
        total_hours: true,
        submitted_at: true,
        reviewed_at: true,
        rejection_reason: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
        organization: true,
        employee: true,
        reviewer: true,
        reviewed_by_member_id: true,
      },
    } satisfies Prisma.hrm_tracker_timesheetsFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IHrmTrackerTimesheet> {
    return {
      id: input.id,
      organization: input.organization
        ? await transformOrganization(input.organization)
        : null,
      employee: input.employee ? await transformEmployee(input.employee) : null,
      reviewer: input.reviewed_by_member_id
        ? await transformMember(input.reviewer)
        : null,
      week_start_date: toISOStringSafe(input.week_start_date),
      week_end_date: toISOStringSafe(input.week_end_date),
      status: input.status as any,
      total_hours: input.total_hours,
      submitted_at: input.submitted_at
        ? toISOStringSafe(input.submitted_at)
        : null,
      reviewed_at: input.reviewed_at
        ? toISOStringSafe(input.reviewed_at)
        : null,
      rejection_reason: input.rejection_reason ?? null,
      created_at: toISOStringSafe(input.created_at),
      updated_at: toISOStringSafe(input.updated_at),
      deleted_at: input.deleted_at
        ? toISOStringSafe(input.deleted_at)
        : toISOStringSafe(new Date("9999-12-31T23:59:59.999Z")),
      hrm_tracker_organization_id: input.hrm_tracker_organization_id,
      hrm_tracker_employee_id: input.hrm_tracker_employee_id,
      reviewed_by_member_id: input.reviewed_by_member_id ?? null,
    };
  }
  async function transformOrganization(org: any) {
    return org;
  }
  async function transformEmployee(emp: any) {
    return emp;
  }
  async function transformMember(member: any) {
    return member;
  }
}
