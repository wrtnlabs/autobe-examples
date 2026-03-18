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

export namespace HrmsOrganizationMemberTransformer {
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
        hrms_member_id: true,
        hrms_organization_id: true,
        hrms_organization_role_id: true,
        member: HrmsMemberAtSummaryTransformer.select(),
        organization: HrmsOrganizationAtSummaryTransformer.select(),
        organizationRole: HrmsOrganizationRoleAtSummaryTransformer.select(),
      },
    } satisfies Prisma.hrms_organization_membersFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IHrmsOrganizationMember> {
    return {
      id: input.id,
      created_at: input.created_at.toISOString(),
      updated_at: input.updated_at.toISOString(),
      deleted_at: input.deleted_at?.toISOString() ?? null,
      hrms_member_id: input.hrms_member_id,
      hrms_organization_id: input.hrms_organization_id,
      hrms_organization_role_id: input.hrms_organization_role_id,
      member: await HrmsMemberAtSummaryTransformer.transform(input.member),
      organization: await HrmsOrganizationAtSummaryTransformer.transform(
        input.organization,
      ),
      organizationRole:
        await HrmsOrganizationRoleAtSummaryTransformer.transform(
          input.organizationRole,
        ),
    };
  }
}
