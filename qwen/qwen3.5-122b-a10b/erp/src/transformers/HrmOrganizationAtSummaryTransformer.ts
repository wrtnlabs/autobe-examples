import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IHrmOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmOrganization";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import { VariadicSingleton } from "tstl";
import typia, { tags } from "typia";

import { MyGlobal } from "../MyGlobal";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export namespace HrmOrganizationAtSummaryTransformer {
  export type Payload = Prisma.hrm_organizationsGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        name: true,
        description: true,
        logo_image_url: true,
        currency: true,
        timezone: true,
        fiscal_start_month: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
        organizationOwners: true,
        organizationRoles: true,
        departments: true,
        employees: true,
        invitations: true,
        employeeSnapshots: true,
        roles: true,
        projects: true,
      },
    } satisfies Prisma.hrm_organizationsFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IHrmOrganization.ISummary> {
    return {
      id: input.id,
      name: input.name,
      description: input.description ?? null,
      logo_image_url: input.logo_image_url ?? null,
      currency: input.currency,
      timezone: input.timezone,
      fiscal_start_month: input.fiscal_start_month,
      created_at: input.created_at.toISOString(),
    } satisfies IHrmOrganization.ISummary;
  }
}


//--------------------------------------------------------------
// TEMPLATE CODE
//--------------------------------------------------------------
//     export namespace HrmOrganizationAtSummaryTransformer {
//       export type Payload = Prisma.hrm_organizationsGetPayload<ReturnType<typeof select>>;
// 
//       export function select() {
//         // implicit return type for better type inference
//         return {
//           select: {
//             id: true,
//             name: true,
//             description: true,
//             logo_image_url: true,
//             currency: true,
//             timezone: true,
//             fiscal_start_month: true,
//             created_at: true,
//             updated_at: true,
//             deleted_at: true,
//           },
//         } satisfies Prisma.hrm_organizationsFindManyArgs;
//       }
// 
//       export async function transform(input: Payload): Promise<IHrmOrganization.ISummary> {
//         return {
//   created_at: {string},
//   currency: {string},
//   description: {string | null},
//   fiscal_start_month: {integer},
//   id: {string},
//   logo_image_url: {string | null},
//   name: {string},
//   timezone: {string},
//         };
//       }
//     }
//--------------------------------------------------------------