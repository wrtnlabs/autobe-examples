import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IErpHrmDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmDepartment";
import { IErpHrmMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmMember";
import { IErpHrmOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmOrganization";
import { IErpHrmOrganizationMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmOrganizationMember";
import { IErpHrmRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmRole";
import { IErpHrmRolePermission } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmRolePermission";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import typia, { tags } from "typia";

import { toISOStringSafe } from "../utils/toISOStringSafe";
import { ErpHrmOrganizationMemberAtSummaryTransformer } from "./ErpHrmOrganizationMemberAtSummaryTransformer";

export namespace ErpHrmOrganizationTransformer {
  export type Payload = Prisma.erp_hrm_organizationsGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        name: true,
        description: true,
        logo_url: true,
        currency: true,
        timezone: true,
        fiscal_start_month: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
        ownerMember: {
          select: {
            id: true,
          },
        },
        members: ErpHrmOrganizationMemberAtSummaryTransformer.select(),
      },
    } satisfies Prisma.erp_hrm_organizationsFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IErpHrmOrganization> {
    const ownerOrgMember = input.members.find(
      (m) =>
        (m as ErpHrmOrganizationMemberAtSummaryTransformer.Payload).member
          ?.id === input.ownerMember.id,
    );
    if (!ownerOrgMember) {
      throw new Error(
        `Owner organization member record not found for organization ${input.id}`,
      );
    }
    return {
      id: input.id,
      name: input.name,
      description: input.description,
      logo_url: input.logo_url,
      currency: input.currency,
      timezone: input.timezone,
      fiscal_start_month: input.fiscal_start_month,
      owner: await ErpHrmOrganizationMemberAtSummaryTransformer.transform(
        ownerOrgMember as ErpHrmOrganizationMemberAtSummaryTransformer.Payload,
      ),
      created_at: input.created_at.toISOString(),
      updated_at: input.updated_at.toISOString(),
      deleted_at: input.deleted_at?.toISOString() ?? null,
    };
  }
}
