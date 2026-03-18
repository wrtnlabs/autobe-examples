import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IErpHrmMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmMember";
import { IErpHrmOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmOrganization";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import typia, { tags } from "typia";

import { toISOStringSafe } from "../utils/toISOStringSafe";
import { ErpHrmMemberAtSummaryTransformer } from "./ErpHrmMemberAtSummaryTransformer";

export namespace ErpHrmOrganizationAtSummaryTransformer {
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
        owner: ErpHrmMemberAtSummaryTransformer.select(),
      },
    } satisfies Prisma.erp_hrm_organizationsFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IErpHrmOrganization.ISummary> {
    return {
      id: input.id,
      name: input.name,
      description: input.description,
      logoUrl: input.logo_url,
      currency: input.currency,
      timezone: input.timezone,
      fiscalYearStartMonth: input.fiscal_year_start_month,
      createdAt: input.created_at.toISOString(),
      owner: await ErpHrmMemberAtSummaryTransformer.transform(input.owner),
    };
  }
}
