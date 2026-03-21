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
        logo_image: true,
        currency: true,
        timezone: true,
        fiscal_start_month: true,
        created_at: true,
        owner: ErpHrmMemberAtSummaryTransformer.select(),
        employees: {
          select: {
            erp_hrm_member_id: true,
            role: {
              select: {
                name: true,
              },
            } satisfies Prisma.erp_hrm_rolesFindManyArgs,
          },
        } satisfies Prisma.erp_hrm_employeesFindManyArgs,
      },
    } satisfies Prisma.erp_hrm_organizationsFindManyArgs;
  }
  export async function transform(
    input: Payload,
    context?: {
      memberId: string;
    },
  ): Promise<IErpHrmOrganization.ISummary> {
    const employee = context
      ? input.employees.find((e) => e.erp_hrm_member_id === context.memberId)
      : null;
    return {
      id: input.id,
      name: input.name,
      description: input.description,
      logoImage: input.logo_image,
      currency: input.currency,
      timezone: input.timezone,
      fiscalStartMonth: input.fiscal_start_month,
      owner: await ErpHrmMemberAtSummaryTransformer.transform(input.owner),
      isOwner: context ? input.owner.id === context.memberId : false,
      role: employee?.role.name ?? "",
      createdAt: input.created_at.toISOString(),
    };
  }
}
