import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IErpHrmMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmMember";
import { IErpHrmOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmOrganization";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import typia, { tags } from "typia";

import { toISOStringSafe } from "../utils/toISOStringSafe";
import { ErpHrmMemberAtSummaryTransformer } from "./ErpHrmMemberAtSummaryTransformer";

export namespace ErpHrmOrganizationAtSummaryTransformer {
  // 1. Payload type first
  export type Payload = Prisma.erp_hrm_organizationsGetPayload<
    ReturnType<typeof select>
  >;
  // 2. select() function second
  export function select() {
    return {
      select: {
        id: true,
        name: true,
        description: true,
        logo_uri: true,
        currency: true,
        timezone: true,
        fiscal_start_month: true,
        created_at: true,
        updated_at: true,
        owner: ErpHrmMemberAtSummaryTransformer.select(),
        activityLogs: {
          select: { id: true },
        } satisfies Prisma.erp_hrm_activity_logsFindManyArgs,
        reports: {
          select: { id: true },
        } satisfies Prisma.erp_hrm_reportsFindManyArgs,
        employees: {
          select: { id: true },
        } satisfies Prisma.erp_hrm_employeesFindManyArgs,
        roles: {
          select: { id: true },
        } satisfies Prisma.erp_hrm_rolesFindManyArgs,
        departments: {
          select: { id: true },
        } satisfies Prisma.erp_hrm_departmentsFindManyArgs,
        projects: {
          select: { id: true },
        } satisfies Prisma.erp_hrm_projectsFindManyArgs,
        invitations: {
          select: { id: true },
        } satisfies Prisma.erp_hrm_invitationsFindManyArgs,
      },
    } satisfies Prisma.erp_hrm_organizationsFindManyArgs;
  }
  // 3. transform() function last
  export async function transform(
    input: Payload,
  ): Promise<IErpHrmOrganization.ISummary> {
    return {
      id: input.id,
      name: input.name,
      description: input.description ?? undefined,
      logoUri: input.logo_uri ?? undefined,
      currency: input.currency,
      timezone: input.timezone,
      fiscalStartMonth: input.fiscal_start_month,
      createdAt: input.created_at.toISOString(),
      owner: await ErpHrmMemberAtSummaryTransformer.transform(input.owner),
    };
  }
}
