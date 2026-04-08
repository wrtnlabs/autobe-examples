import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IHrmTimeTrackDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackDepartment";
import { IHrmTimeTrackEmployeeSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackEmployeeSnapshot";
import { IHrmTimeTrackMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackMember";
import { IHrmTimeTrackOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackOrganization";
import { IHrmTimeTrackRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackRole";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import { VariadicSingleton } from "tstl";
import typia, { tags } from "typia";

import { MyGlobal } from "../MyGlobal";
import { toISOStringSafe } from "../utils/toISOStringSafe";
import { HrmTimeTrackDepartmentAtSummaryTransformer } from "./HrmTimeTrackDepartmentAtSummaryTransformer";
import { HrmTimeTrackMemberAtSummaryTransformer } from "./HrmTimeTrackMemberAtSummaryTransformer";
import { HrmTimeTrackOrganizationAtSummaryTransformer } from "./HrmTimeTrackOrganizationAtSummaryTransformer";
import { HrmTimeTrackRoleAtSummaryTransformer } from "./HrmTimeTrackRoleAtSummaryTransformer";

export namespace HrmTimeTrackEmployeeSnapshotAtSummaryTransformer {
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
        employee: {
          select: {
            id: true,
          },
        } satisfies Prisma.hrm_time_track_employeesFindManyArgs,
        organization: HrmTimeTrackOrganizationAtSummaryTransformer.select(),
        member: HrmTimeTrackMemberAtSummaryTransformer.select(),
        department: HrmTimeTrackDepartmentAtSummaryTransformer.select(),
        role: HrmTimeTrackRoleAtSummaryTransformer.select(),
      },
    } satisfies Prisma.hrm_time_track_employee_snapshotsFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IHrmTimeTrackEmployeeSnapshot.ISummary> {
    return {
      id: input.id,
      position_title: input.position_title,
      employment_type: input.employment_type,
      status: input.status,
      created_at: input.created_at.toISOString(),
      organization:
        await HrmTimeTrackOrganizationAtSummaryTransformer.transform(
          input.organization,
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
    };
  }
}
