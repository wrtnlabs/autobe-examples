import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IHrmTrackerEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTrackerEmployee";
import { IHrmTrackerMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTrackerMember";
import { IHrmTrackerOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTrackerOrganization";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import typia, { tags } from "typia";

import { toISOStringSafe } from "../utils/toISOStringSafe";
import { HrmTrackerMemberAtSummaryTransformer } from "./HrmTrackerMemberAtSummaryTransformer";
import { HrmTrackerOrganizationAtSummaryTransformer } from "./HrmTrackerOrganizationAtSummaryTransformer";

export namespace HrmTrackerEmployeeTransformer {
  export type Payload = Prisma.hrm_tracker_employeesGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        status: true,
        employment_type: true,
        position: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
        organization: HrmTrackerOrganizationAtSummaryTransformer.select(),
        user: HrmTrackerMemberAtSummaryTransformer.select(),
        role_id: true,
        department_id: true,
        organization_id: true,
        user_id: true,
      },
    } satisfies Prisma.hrm_tracker_employeesFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IHrmTrackerEmployee> {
    return {
      id: input.id,
      status: input.status,
      employment_type: input.employment_type,
      position: input.position ?? undefined,
      created_at: toISOStringSafe(input.created_at),
      updated_at: toISOStringSafe(input.updated_at),
      deleted_at: input.deleted_at ? toISOStringSafe(input.deleted_at) : null,
      organization: await HrmTrackerOrganizationAtSummaryTransformer.transform(
        input.organization,
      ),
      user: await HrmTrackerMemberAtSummaryTransformer.transform(input.user),
      role: input.role_id ?? undefined,
      department: input.department_id ?? undefined,
      organization_id: input.organization_id,
      user_id: input.user_id,
      role_id: input.role_id ?? null,
      department_id: input.department_id ?? null,
    };
  }
}
