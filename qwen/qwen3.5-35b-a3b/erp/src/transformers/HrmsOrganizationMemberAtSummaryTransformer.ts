import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IHrmsMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmsMember";
import { IHrmsOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmsOrganization";
import { IHrmsOrganizationMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmsOrganizationMember";
import { IHrmsOrganizationRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmsOrganizationRole";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import { VariadicSingleton } from "tstl";
import typia, { tags } from "typia";

import { MyGlobal } from "../MyGlobal";
import { toISOStringSafe } from "../utils/toISOStringSafe";
import { HrmsMemberAtSummaryTransformer } from "./HrmsMemberAtSummaryTransformer";
import { HrmsOrganizationAtSummaryTransformer } from "./HrmsOrganizationAtSummaryTransformer";
import { HrmsOrganizationRoleAtSummaryTransformer } from "./HrmsOrganizationRoleAtSummaryTransformer";

// ====================================
// HrmsOrganizationMemberAtSummaryTransformer
// Transforms hrms_organization_members → IHrmsOrganizationMember.ISummary
// ====================================
export namespace HrmsOrganizationMemberAtSummaryTransformer {
  // 1. Payload type
  export type Payload = Prisma.hrms_organization_membersGetPayload<
    ReturnType<typeof select>
  >;
  // 2. select() function
  export function select() {
    return {
      select: {
        id: true,
        member: HrmsMemberAtSummaryTransformer.select(),
        organization: HrmsOrganizationAtSummaryTransformer.select(),
        organizationRole: HrmsOrganizationRoleAtSummaryTransformer.select(),
        created_at: true,
        updated_at: true,
        deleted_at: true,
        employees: {} satisfies Prisma.hrms_employeesFindManyArgs,
      },
    } satisfies Prisma.hrms_organization_membersFindManyArgs;
  }
  // 3. transform() function
  export async function transform(
    input: Payload,
  ): Promise<IHrmsOrganizationMember.ISummary> {
    return {
      id: input.id,
      member: await HrmsMemberAtSummaryTransformer.transform(input.member),
      organization: await HrmsOrganizationAtSummaryTransformer.transform(
        input.organization,
      ),
      organizationRole:
        await HrmsOrganizationRoleAtSummaryTransformer.transform(
          input.organizationRole,
        ),
      created_at: input.created_at.toISOString(),
      updated_at: input.updated_at.toISOString(),
      deleted_at: input.deleted_at?.toISOString() ?? null,
    };
  }
}
