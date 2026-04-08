import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IHrmTimeTrackDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackDepartment";
import { IHrmTimeTrackEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackEmployee";
import { IHrmTimeTrackEmployeeSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackEmployeeSnapshot";
import { IHrmTimeTrackMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackMember";
import { IHrmTimeTrackRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackRole";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import { VariadicSingleton } from "tstl";
import typia, { tags } from "typia";

import { MyGlobal } from "../MyGlobal";
import { toISOStringSafe } from "../utils/toISOStringSafe";
import { HrmTimeTrackDepartmentAtSummaryTransformer } from "./HrmTimeTrackDepartmentAtSummaryTransformer";
import { HrmTimeTrackEmployeeAtSummaryTransformer } from "./HrmTimeTrackEmployeeAtSummaryTransformer";
import { HrmTimeTrackMemberAtSummaryTransformer } from "./HrmTimeTrackMemberAtSummaryTransformer";
import { HrmTimeTrackRoleAtSummaryTransformer } from "./HrmTimeTrackRoleAtSummaryTransformer";

export namespace HrmTimeTrackEmployeeSnapshotTransformer {
  export type Payload = Prisma.hrm_time_track_employee_snapshotsGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        position_title: true,
        employment_type: true,
        status: true,
        created_at: true,
        employee: HrmTimeTrackEmployeeAtSummaryTransformer.select(),
        member: HrmTimeTrackMemberAtSummaryTransformer.select(),
        department: HrmTimeTrackDepartmentAtSummaryTransformer.select(),
        role: HrmTimeTrackRoleAtSummaryTransformer.select(),
        organization: {
          select: {
            id: true,
            name: true,
            created_at: true,
          },
        } satisfies Prisma.hrm_time_track_organizationsFindManyArgs,
      },
    } satisfies Prisma.hrm_time_track_employee_snapshotsFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IHrmTimeTrackEmployeeSnapshot> {
    return {
      id: input.id,
      employee: await HrmTimeTrackEmployeeAtSummaryTransformer.transform(
        input.employee,
      ),
      member: await HrmTimeTrackMemberAtSummaryTransformer.transform(
        input.member,
      ),
      department: input.department
        ? await HrmTimeTrackDepartmentAtSummaryTransformer.transform(
            input.department,
          )
        : null,
      role: await HrmTimeTrackRoleAtSummaryTransformer.transform(input.role),
      position_title: input.position_title ?? undefined,
      employment_type: input.employment_type,
      status: input.status,
      created_at: input.created_at.toISOString(),
    };
  }
}
