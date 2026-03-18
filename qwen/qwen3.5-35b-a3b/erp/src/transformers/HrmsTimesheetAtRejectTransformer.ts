import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IHrmsTimesheet } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmsTimesheet";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import typia, { tags } from "typia";

import { toISOStringSafe } from "../utils/toISOStringSafe";

export namespace HrmsTimesheetAtRejectTransformer {
  export type Payload = Prisma.hrms_timesheetsGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
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
        employee: true,
        reviewer: true,
      },
    } satisfies Prisma.hrms_timesheetsFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IHrmsTimesheet.IReject> {
    return {
      rejectionReason: input.rejection_reason ?? null,
    };
  }
}
