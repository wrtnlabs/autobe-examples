import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IHrmTrackerTimelog } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTrackerTimelog";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import typia, { tags } from "typia";

import { toISOStringSafe } from "../utils/toISOStringSafe";

export namespace HrmTrackerTimelogAtSummaryTransformer {
  export type Payload = Prisma.hrm_tracker_timelogsGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        date: true,
        duration_in_minutes: true,
        description: true,
        billable: true,
        organization: {
          select: {
            id: true,
            name: true,
          },
        } satisfies Prisma.hrm_tracker_organizationsFindManyArgs,
        project: {
          select: {
            id: true,
            name: true,
            description: true,
            color: true,
            status: true,
          },
        } satisfies Prisma.hrm_tracker_projectsFindManyArgs,
      },
    } satisfies Prisma.hrm_tracker_timelogsFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IHrmTrackerTimelog.ISummary> {
    const hours = input.duration_in_minutes / 60.0;
    return {
      id: input.id,
      date: input.date.toISOString().split("T")[0],
      duration_in_minutes: input.duration_in_minutes,
      billable: input.billable,
      description: input.description ?? null,
      hours: hours,
      billable_hours: input.billable ? hours : 0,
      non_billable_hours: input.billable ? 0 : hours,
      project: {
        id: input.project.id,
        name: input.project.name,
        description: input.project.description ?? "",
        color: input.project.color,
        status: input.project.status,
      },
      organization: {
        id: input.organization.id,
        name: input.organization.name,
      },
    };
  }
}
