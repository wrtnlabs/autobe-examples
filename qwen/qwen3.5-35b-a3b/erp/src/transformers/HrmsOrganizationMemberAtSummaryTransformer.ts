import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IHrmsMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmsMember";
import { IHrmsOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmsOrganization";
import { IHrmsOrganizationMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmsOrganizationMember";
import { IHrmsOrganizationRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmsOrganizationRole";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import typia, { tags } from "typia";

import { toISOStringSafe } from "../utils/toISOStringSafe";
import { HrmsMemberAtSummaryTransformer } from "./HrmsMemberAtSummaryTransformer";
import { HrmsOrganizationAtSummaryTransformer } from "./HrmsOrganizationAtSummaryTransformer";
import { HrmsOrganizationRoleAtSummaryTransformer } from "./HrmsOrganizationRoleAtSummaryTransformer";

export namespace HrmsOrganizationMemberAtSummaryTransformer {
  export type Payload = Prisma.hrms_organization_membersGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
        member: HrmsMemberAtSummaryTransformer.select(),
        organization: HrmsOrganizationAtSummaryTransformer.select(),
        organizationRole: HrmsOrganizationRoleAtSummaryTransformer.select(),
        employees: true,
      },
    } satisfies Prisma.hrms_organization_membersFindManyArgs;
  }
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
