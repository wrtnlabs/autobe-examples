import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IHrmsDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmsDepartment";
import { IHrmsEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmsEmployee";
import { IHrmsMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmsMember";
import { IHrmsOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmsOrganization";
import { IHrmsOrganizationMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmsOrganizationMember";
import { IHrmsOrganizationRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmsOrganizationRole";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import typia, { tags } from "typia";

import { toISOStringSafe } from "../utils/toISOStringSafe";
import { HrmsDepartmentAtSummaryTransformer } from "./HrmsDepartmentAtSummaryTransformer";
import { HrmsOrganizationMemberAtSummaryTransformer } from "./HrmsOrganizationMemberAtSummaryTransformer";
import { HrmsOrganizationRoleAtSummaryTransformer } from "./HrmsOrganizationRoleAtSummaryTransformer";

export namespace HrmsEmployeeTransformer {
  export type Payload = Prisma.hrms_employeesGetPayload<
    ReturnType<typeof select>
  >;
  export async function transform(input: Payload): Promise<IHrmsEmployee> {
    return {
      id: input.id,
      display_name: input.display_name,
      position: input.position ?? undefined,
      employment_type: input.employment_type,
      status: input.status,
      created_at: input.created_at.toISOString(),
      updated_at: input.updated_at.toISOString(),
      deleted_at: input.deleted_at?.toISOString() ?? null,
      organization_member:
        await HrmsOrganizationMemberAtSummaryTransformer.transform(
          input.organizationMember,
        ),
      role: await HrmsOrganizationRoleAtSummaryTransformer.transform(
        input.role,
      ),
      department: input.department
        ? await HrmsDepartmentAtSummaryTransformer.transform(input.department)
        : undefined,
    };
  }
  export function select() {
    return {
      select: {
        id: true,
        display_name: true,
        position: true,
        employment_type: true,
        status: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
        organizationMember: HrmsOrganizationMemberAtSummaryTransformer.select(),
        role: HrmsOrganizationRoleAtSummaryTransformer.select(),
        department: HrmsDepartmentAtSummaryTransformer.select(),
      },
    } satisfies Prisma.hrms_employeesFindManyArgs;
  }
}
