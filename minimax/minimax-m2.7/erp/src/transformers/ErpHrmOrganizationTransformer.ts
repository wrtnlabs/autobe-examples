import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IErpHrmMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmMember";
import { IErpHrmOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmOrganization";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import { VariadicSingleton } from "tstl";
import typia, { tags } from "typia";

import { MyGlobal } from "../MyGlobal";
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
  export async function transform(
    input: Payload,
  ): Promise<IErpHrmOrganization> {
    return {
      id: input.id,
      name: input.name,
      description: input.description,
      logoUri: input.logo_uri,
      currency: input.currency,
      timezone: input.timezone,
      fiscalStartMonth: input.fiscal_start_month,
      createdAt: input.created_at.toISOString(),
      updatedAt: input.updated_at.toISOString(),
      owner: await ErpHrmMemberAtSummaryTransformer.transform(input.owner),
    } satisfies IErpHrmOrganization;
  }
}


//--------------------------------------------------------------
// TEMPLATE CODE
//--------------------------------------------------------------
//     export namespace ErpHrmOrganizationTransformer {
//       export type Payload = Prisma.erp_hrm_organizationsGetPayload<ReturnType<typeof select>>;
// 
//       export function select() {
//         // implicit return type for better type inference
//         return {
//           select: {
//             id: true,
//             name: true,
//             description: true,
//             logo_uri: true,
//             currency: true,
//             timezone: true,
//             fiscal_start_month: true,
//             created_at: true,
//             updated_at: true,
//             owner: ErpHrmMemberAtSummaryTransformer.select(),
//           },
//         } satisfies Prisma.erp_hrm_organizationsFindManyArgs;
//       }
// 
//       export async function transform(input: Payload): Promise<IErpHrmOrganization> {
//         return {
//   id: {string},
//   name: {string},
//   description: {string | null},
//   logoUri: {string | null},
//   currency: {string},
//   timezone: {string},
//   fiscalStartMonth: {integer},
//   createdAt: {string},
//   updatedAt: {string},
//   owner: await ErpHrmMemberAtSummaryTransformer.transform(input.owner),
//         };
//       }
//     }
//--------------------------------------------------------------