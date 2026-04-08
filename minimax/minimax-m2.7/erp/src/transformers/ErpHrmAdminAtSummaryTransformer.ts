import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IErpHrmAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmAdmin";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import { VariadicSingleton } from "tstl";
import typia, { tags } from "typia";

import { MyGlobal } from "../MyGlobal";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export namespace ErpHrmAdminAtSummaryTransformer {
  export type Payload = Prisma.erp_hrm_adminsGetPayload<
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
        sessions: {
          select: {
            id: true,
          },
        },
        adminPasswordReset: {
          select: {
            id: true,
          },
        },
        auditLogs: {
          select: {
            id: true,
          },
        },
      },
    } satisfies Prisma.erp_hrm_adminsFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IErpHrmAdmin.ISummary> {
    return {
      id: input.id,
      email: input.email,
      displayName: input.display_name,
      avatarUri: input.avatar_uri,
      phone: input.phone,
      createdAt: input.created_at.toISOString(),
    } satisfies IErpHrmAdmin.ISummary;
  }
}


//--------------------------------------------------------------
// TEMPLATE CODE
//--------------------------------------------------------------
//     export namespace ErpHrmAdminAtSummaryTransformer {
//       export type Payload = Prisma.erp_hrm_adminsGetPayload<ReturnType<typeof select>>;
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
//           },
//         } satisfies Prisma.erp_hrm_adminsFindManyArgs;
//       }
// 
//       export async function transform(input: Payload): Promise<IErpHrmAdmin.ISummary> {
//         return {
//   id: {string},
//   email: {string},
//   displayName: {string},
//   avatarUri: {string | null},
//   phone: {string | null},
//   createdAt: {string},
//         };
//       }
//     }
//--------------------------------------------------------------