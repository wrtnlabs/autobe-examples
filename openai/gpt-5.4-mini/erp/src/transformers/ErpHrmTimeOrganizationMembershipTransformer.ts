import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IErpHrmTimeMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeMember";
import { IErpHrmTimeOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeOrganization";
import { IErpHrmTimeOrganizationMembership } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeOrganizationMembership";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import { VariadicSingleton } from "tstl";
import typia, { tags } from "typia";

import { MyGlobal } from "../MyGlobal";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export namespace ErpHrmTimeOrganizationMembershipTransformer {
  export type Payload = Prisma.erp_hrm_time_organization_membershipsGetPayload<
    ReturnType<typeof select>
  >;
  export async function transform(
    input: Payload,
  ): Promise<IErpHrmTimeOrganizationMembership> {
    return {
      id: input.id,
      member: input.member as IErpHrmTimeMember.ISummary,
      organization: input.organization as IErpHrmTimeOrganization.ISummary,
      status: input.status,
      isSelectedContext: input.is_selected_context,
      createdAt: input.created_at.toISOString(),
      updatedAt: input.updated_at.toISOString(),
      deletedAt: input.deleted_at?.toISOString() ?? null,
    };
  }
  export function select() {
    return {
      select: {
        id: true,
        status: true,
        is_selected_context: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
        member: true,
        organization: true,
      },
    } satisfies Prisma.erp_hrm_time_organization_membershipsFindManyArgs;
  }
}
