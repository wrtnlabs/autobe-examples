import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IErpHrmMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmMember";
import { IErpHrmOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmOrganization";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import typia, { tags } from "typia";

import { toISOStringSafe } from "../utils/toISOStringSafe";
import { ErpHrmMemberAtSummaryTransformer } from "./ErpHrmMemberAtSummaryTransformer";

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
        fiscal_year_start_month: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
        owner: ErpHrmMemberAtSummaryTransformer.select(),
      },
    } satisfies Prisma.erp_hrm_organizationsFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IErpHrmOrganization> {
    return {
      id: input.id,
      owner: await ErpHrmMemberAtSummaryTransformer.transform(input.owner),
      name: input.name,
      description: input.description ?? null,
      logo_url: input.logo_url ?? null,
      currency: input.currency,
      timezone: input.timezone,
      fiscal_year_start_month: input.fiscal_year_start_month,
      created_at: input.created_at.toISOString(),
      updated_at: input.updated_at.toISOString(),
      deleted_at: input.deleted_at?.toISOString() ?? null,
    };
  }
}
