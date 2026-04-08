import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IErpHrmMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmMember";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import { VariadicSingleton } from "tstl";
import typia, { tags } from "typia";

import { MyGlobal } from "../MyGlobal";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export namespace ErpHrmMemberAtSummaryTransformer {
  export type Payload = Prisma.erp_hrm_membersGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        email: true,
        password_hash: true,
        display_name: true,
        avatar_uri: true,
        phone: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
      },
    } satisfies Prisma.erp_hrm_membersFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IErpHrmMember.ISummary> {
    return {
      id: input.id,
      email: input.email,
      displayName: input.display_name,
      avatarUri: input.avatar_uri ?? undefined,
      phone: input.phone ?? undefined,
      createdAt: input.created_at.toISOString(),
      deletedAt: input.deleted_at?.toISOString() ?? null,
    } satisfies IErpHrmMember.ISummary;
  }
}


//--------------------------------------------------------------
// TEMPLATE CODE
//--------------------------------------------------------------
//     export namespace ErpHrmMemberAtSummaryTransformer {
//       export type Payload = Prisma.erp_hrm_membersGetPayload<ReturnType<typeof select>>;
// 
//       export function select() {
//         // implicit return type for better type inference
//         return {
//           select: {
//             id: true,
//             email: true,
//             password_hash: true,
//             display_name: true,
//             avatar_uri: true,
//             phone: true,
//             created_at: true,
//             updated_at: true,
//             deleted_at: true,
//           },
//         } satisfies Prisma.erp_hrm_membersFindManyArgs;
//       }
// 
//       export async function transform(input: Payload): Promise<IErpHrmMember.ISummary> {
//         return {
//   avatarUri: {string | null},
//   createdAt: {string},
//   deletedAt: {string | null},
//   displayName: {string},
//   email: {string},
//   id: {string},
//   phone: {string | null},
//         };
//       }
//     }
//--------------------------------------------------------------