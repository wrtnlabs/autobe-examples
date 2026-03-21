import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IErpHrmInvitation } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmInvitation";
import { IErpHrmMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmMember";
import { IErpHrmOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmOrganization";
import { IErpHrmRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmRole";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import typia, { tags } from "typia";

import { toISOStringSafe } from "../utils/toISOStringSafe";
import { ErpHrmOrganizationAtSummaryTransformer } from "./ErpHrmOrganizationAtSummaryTransformer";
import { ErpHrmRoleAtSummaryTransformer } from "./ErpHrmRoleAtSummaryTransformer";

export namespace ErpHrmInvitationTransformer {
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
        deleted_at: true,
        organization: ErpHrmOrganizationAtSummaryTransformer.select(),
        role: ErpHrmRoleAtSummaryTransformer.select(),
      },
    } satisfies Prisma.erp_hrm_invitationsFindManyArgs;
  }
  export async function transform(input: Payload): Promise<IErpHrmInvitation> {
    return {
      id: input.id,
      email: input.email,
      status: input.status as IErpHrmInvitation["status"],
      organization: await ErpHrmOrganizationAtSummaryTransformer.transform(
        input.organization,
      ),
      role: await ErpHrmRoleAtSummaryTransformer.transform(input.role),
      created_at: input.created_at.toISOString(),
      updated_at: input.updated_at.toISOString(),
      deleted_at: input.deleted_at?.toISOString() ?? null,
    };
  }
}
