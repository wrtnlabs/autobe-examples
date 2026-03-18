import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IHrmsMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmsMember";
import { IHrmsOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmsOrganization";
import { IHrmsOrganizationRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmsOrganizationRole";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import typia, { tags } from "typia";

import { toISOStringSafe } from "../utils/toISOStringSafe";
import { HrmsOrganizationAtSummaryTransformer } from "./HrmsOrganizationAtSummaryTransformer";

export namespace HrmsOrganizationRoleTransformer {
  export type Payload = Prisma.hrms_organization_rolesGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        name: true,
        is_builtin: true,
        created_at: true,
        updated_at: true,
        organization: HrmsOrganizationAtSummaryTransformer.select(),
        organizationMembers: true,
        permissions: true,
        employees: true,
      },
    } satisfies Prisma.hrms_organization_rolesFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IHrmsOrganizationRole> {
    return {
      id: input.id,
      name: input.name,
      is_builtin: input.is_builtin,
      permissions: await ArrayUtil.asyncMap(
        input.permissions,
        async (p) => await p.permission,
      ),
      organization: await HrmsOrganizationAtSummaryTransformer.transform(
        input.organization,
      ),
      created_at: toISOStringSafe(input.created_at),
      updated_at: toISOStringSafe(input.updated_at),
    } satisfies IHrmsOrganizationRole;
  }
}
