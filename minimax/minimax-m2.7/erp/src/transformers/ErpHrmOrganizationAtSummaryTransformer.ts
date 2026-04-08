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
  ): Promise<IErpHrmOrganization.ISummary> {
    return {
      created_at: input.created_at.toISOString(),
      currency: input.currency,
      description: input.description,
      id: input.id,
      logo_uri: input.logo_uri,
      name: input.name,
      owner: await ErpHrmMemberAtSummaryTransformer.transform(input.owner),
      timezone: input.timezone,
    } satisfies IErpHrmOrganization.ISummary;
  }
}


//--------------------------------------------------------------
// TEMPLATE CODE
//--------------------------------------------------------------
//     export namespace ErpHrmOrganizationAtSummaryTransformer {
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
//       export async function transform(input: Payload): Promise<IErpHrmOrganization.ISummary> {
//         return {
//   created_at: {string},
//   currency: {string},
//   description: {string | null},
//   id: {string},
//   logo_uri: {string | null},
//   name: {string},
//   owner: await ErpHrmMemberAtSummaryTransformer.transform(input.owner),
//   timezone: {string},
//         };
//       }
//     }
//--------------------------------------------------------------