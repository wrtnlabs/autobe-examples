import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IHrmMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmMember";
import { IHrmOrganizationOwner } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmOrganizationOwner";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import { VariadicSingleton } from "tstl";
import typia, { tags } from "typia";

import { MyGlobal } from "../MyGlobal";
import { toISOStringSafe } from "../utils/toISOStringSafe";
import { HrmMemberAtSummaryTransformer } from "./HrmMemberAtSummaryTransformer";

export namespace HrmOrganizationOwnerTransformer {
  export type Payload = Prisma.hrm_organization_ownersGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        is_current: true,
        started_at: true,
        ended_at: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
        organization: {
          select: {
            id: true,
          },
        } satisfies Prisma.hrm_organizationsFindManyArgs,
        user: HrmMemberAtSummaryTransformer.select(),
      },
    } satisfies Prisma.hrm_organization_ownersFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IHrmOrganizationOwner> {
    return {
      id: input.id,
      is_current: input.is_current,
      started_at: input.started_at.toISOString(),
      ended_at: input.ended_at?.toISOString() ?? null,
      user: await HrmMemberAtSummaryTransformer.transform(input.user),
      created_at: input.created_at.toISOString(),
      updated_at: input.updated_at.toISOString(),
      deleted_at: input.deleted_at?.toISOString() ?? null,
    } satisfies IHrmOrganizationOwner;
  }
}


//--------------------------------------------------------------
// TEMPLATE CODE
//--------------------------------------------------------------
//     export namespace HrmOrganizationOwnerTransformer {
//       export type Payload = Prisma.hrm_organization_ownersGetPayload<ReturnType<typeof select>>;
// 
//       export function select() {
//         // implicit return type for better type inference
//         return {
//           select: {
//             id: true,
//             is_current: true,
//             started_at: true,
//             ended_at: true,
//             created_at: true,
//             updated_at: true,
//             deleted_at: true,
//             organization_id: true,
//             user: HrmMemberAtSummaryTransformer.select(),
//           },
//         } satisfies Prisma.hrm_organization_ownersFindManyArgs;
//       }
// 
//       export async function transform(input: Payload): Promise<IHrmOrganizationOwner> {
//         return {
//   id: {string},
//   is_current: {boolean},
//   started_at: {string},
//   ended_at: {string | null},
//   user: await HrmMemberAtSummaryTransformer.transform(input.user),
//   created_at: {string},
//   updated_at: {string},
//   deleted_at: {string | null},
//         };
//       }
//     }
//--------------------------------------------------------------