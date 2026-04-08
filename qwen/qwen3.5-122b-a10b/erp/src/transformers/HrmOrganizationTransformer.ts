import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IHrmOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmOrganization";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import { VariadicSingleton } from "tstl";
import typia, { tags } from "typia";

import { MyGlobal } from "../MyGlobal";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export namespace HrmOrganizationTransformer {
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
      },
    } satisfies Prisma.hrm_organizationsFindManyArgs;
  }
  export async function transform(input: Payload): Promise<IHrmOrganization> {
    return {
      id: input.id,
      name: input.name,
      description: input.description ?? null,
      logo_image_url: input.logo_image_url ?? null,
      currency: input.currency,
      timezone: input.timezone,
      fiscal_start_month: input.fiscal_start_month,
      created_at: input.created_at.toISOString(),
      updated_at: input.updated_at.toISOString(),
      deleted_at: input.deleted_at?.toISOString() ?? null,
    } satisfies IHrmOrganization;
  }
}


//--------------------------------------------------------------
// TEMPLATE CODE
//--------------------------------------------------------------
//     export namespace HrmOrganizationTransformer {
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
//       export async function transform(input: Payload): Promise<IHrmOrganization> {
//         return {
//   id: {string},
//   name: {string},
//   description: {string | null},
//   logo_image_url: {string | null},
//   currency: {string},
//   timezone: {string},
//   fiscal_start_month: {integer},
//   created_at: {string},
//   updated_at: {string},
//   deleted_at: {string | null},
//         };
//       }
//     }
//--------------------------------------------------------------