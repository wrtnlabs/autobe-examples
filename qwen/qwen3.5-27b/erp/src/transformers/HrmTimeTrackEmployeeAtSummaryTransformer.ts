import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IHrmTimeTrackDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackDepartment";
import { IHrmTimeTrackEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackEmployee";
import { IHrmTimeTrackMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackMember";
import { IHrmTimeTrackRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackRole";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import { VariadicSingleton } from "tstl";
import typia, { tags } from "typia";

import { MyGlobal } from "../MyGlobal";
import { toISOStringSafe } from "../utils/toISOStringSafe";
import { HrmTimeTrackDepartmentAtSummaryTransformer } from "./HrmTimeTrackDepartmentAtSummaryTransformer";
import { HrmTimeTrackMemberAtSummaryTransformer } from "./HrmTimeTrackMemberAtSummaryTransformer";
import { HrmTimeTrackRoleAtSummaryTransformer } from "./HrmTimeTrackRoleAtSummaryTransformer";

export namespace HrmTimeTrackEmployeeAtSummaryTransformer {
  export type Payload = Prisma.hrm_time_track_employeesGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        position: true,
        employment_type: true,
        status: true,
        hire_date: true,
        created_at: true,
        member: HrmTimeTrackMemberAtSummaryTransformer.select(),
        department: HrmTimeTrackDepartmentAtSummaryTransformer.select(),
        role: HrmTimeTrackRoleAtSummaryTransformer.select(),
      },
    } satisfies Prisma.hrm_time_track_employeesFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IHrmTimeTrackEmployee.ISummary> {
    return {
      id: input.id,
      member: await HrmTimeTrackMemberAtSummaryTransformer.transform(
        input.member,
      ),
      department: input.department
        ? await HrmTimeTrackDepartmentAtSummaryTransformer.transform(
            input.department,
          )
        : null,
      role: input.role
        ? await HrmTimeTrackRoleAtSummaryTransformer.transform(input.role)
        : null,
      position: input.position,
      employment_type: input.employment_type,
      status: input.status,
      hire_date: input.hire_date.toISOString(),
      created_at: input.created_at.toISOString(),
    };
  }
}
