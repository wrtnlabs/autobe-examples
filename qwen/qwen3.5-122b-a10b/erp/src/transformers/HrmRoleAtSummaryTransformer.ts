import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IHrmOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmOrganization";
import { IHrmRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmRole";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import { VariadicSingleton } from "tstl";
import typia, { tags } from "typia";

import { MyGlobal } from "../MyGlobal";
import { toISOStringSafe } from "../utils/toISOStringSafe";
import { HrmOrganizationAtSummaryTransformer } from "./HrmOrganizationAtSummaryTransformer";

export namespace HrmRoleAtSummaryTransformer {
  export type Payload = Prisma.hrm_rolesGetPayload<ReturnType<typeof select>>;
  export function select() {
    return {
      select: {
        id: true,
        name: true,
        is_builtin: true,
        description: true,
        created_at: true,
        updated_at: true,
        organization: HrmOrganizationAtSummaryTransformer.select(),
      },
    } satisfies Prisma.hrm_rolesFindManyArgs;
  }
  export async function transform(input: Payload): Promise<IHrmRole.ISummary> {
    return {
      id: input.id,
      name: input.name,
      is_builtin: input.is_builtin,
      description: input.description ?? null,
      organization: await HrmOrganizationAtSummaryTransformer.transform(
        input.organization,
      ),
      created_at: input.created_at.toISOString(),
      updated_at: input.updated_at.toISOString(),
    } satisfies IHrmRole.ISummary;
  }
}


//--------------------------------------------------------------
// TEMPLATE CODE
//--------------------------------------------------------------
//     export namespace HrmRoleAtSummaryTransformer {
//       export type Payload = Prisma.hrm_rolesGetPayload<ReturnType<typeof select>>;
// 
//       export function select() {
//         // implicit return type for better type inference
//         return {
//           select: {
//             id: true,
//             name: true,
//             is_builtin: true,
//             description: true,
//             created_at: true,
//             updated_at: true,
//             deleted_at: true,
//             organization: HrmOrganizationAtSummaryTransformer.select(),
//           },
//         } satisfies Prisma.hrm_rolesFindManyArgs;
//       }
// 
//       export async function transform(input: Payload): Promise<IHrmRole.ISummary> {
//         return {
//   id: {string},
//   name: {string},
//   is_builtin: {boolean},
//   description: {string | null},
//   organization: await HrmOrganizationAtSummaryTransformer.transform(input.organization),
//   created_at: {string},
//   updated_at: {string},
//         };
//       }
//     }
//--------------------------------------------------------------