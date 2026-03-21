import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IErpHrmMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmMember";
import { IErpHrmOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmOrganization";
import { IErpHrmRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmRole";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import typia, { tags } from "typia";

import { toISOStringSafe } from "../utils/toISOStringSafe";
import { ErpHrmOrganizationAtSummaryTransformer } from "./ErpHrmOrganizationAtSummaryTransformer";

export namespace ErpHrmRoleAtSummaryTransformer {
  export type Payload = Prisma.erp_hrm_rolesGetPayload<
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
        deleted_at: true,
        organization: ErpHrmOrganizationAtSummaryTransformer.select(),
        employees: {
          select: { id: true },
        } satisfies Prisma.erp_hrm_employeesFindManyArgs,
        rolePermissions: {
          select: { id: true },
        } satisfies Prisma.erp_hrm_role_permissionsFindManyArgs,
        invitations: {
          select: { id: true },
        } satisfies Prisma.erp_hrm_invitationsFindManyArgs,
      },
    } satisfies Prisma.erp_hrm_rolesFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IErpHrmRole.ISummary> {
    return {
      id: input.id,
      name: input.name,
      is_builtin: input.is_builtin,
      created_at: input.created_at.toISOString(),
      organization: await ErpHrmOrganizationAtSummaryTransformer.transform(
        input.organization,
      ),
    };
  }
}
