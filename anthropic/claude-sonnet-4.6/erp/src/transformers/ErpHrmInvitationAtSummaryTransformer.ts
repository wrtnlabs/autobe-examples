import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IErpHrmDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmDepartment";
import { IErpHrmInvitation } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmInvitation";
import { IErpHrmMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmMember";
import { IErpHrmOrganizationMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmOrganizationMember";
import { IErpHrmRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmRole";
import { IErpHrmRolePermission } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmRolePermission";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import typia, { tags } from "typia";

import { toISOStringSafe } from "../utils/toISOStringSafe";
import { ErpHrmMemberAtSummaryTransformer } from "./ErpHrmMemberAtSummaryTransformer";
import { ErpHrmOrganizationMemberAtSummaryTransformer } from "./ErpHrmOrganizationMemberAtSummaryTransformer";

export namespace ErpHrmInvitationAtSummaryTransformer {
  export type Payload = Prisma.erp_hrm_invitationsGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        email: true,
        status: true,
        created_at: true,
        updated_at: true,
        invitingMember: ErpHrmOrganizationMemberAtSummaryTransformer.select(),
        member: ErpHrmMemberAtSummaryTransformer.select(),
      },
    } satisfies Prisma.erp_hrm_invitationsFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IErpHrmInvitation.ISummary> {
    return {
      id: input.id,
      email: input.email,
      status: input.status,
      invitingMember:
        await ErpHrmOrganizationMemberAtSummaryTransformer.transform(
          input.invitingMember,
        ),
      memberId: input.member?.id ?? null,
      created_at: input.created_at.toISOString(),
      updated_at: input.updated_at.toISOString(),
    };
  }
}
