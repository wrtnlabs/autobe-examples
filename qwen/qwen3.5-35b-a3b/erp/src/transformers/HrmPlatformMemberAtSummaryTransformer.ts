import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IHrmPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformMember";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import { VariadicSingleton } from "tstl";
import typia, { tags } from "typia";

import { MyGlobal } from "../MyGlobal";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export namespace HrmPlatformMemberAtSummaryTransformer {
  export type Payload = Prisma.hrm_platform_membersGetPayload<
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
        phone_number: true,
        is_active: true,
        last_login_at: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
        sessions: true,
        passwordResetTokens: true,
        emailVerifications: true,
        ownedOrganizations: true,
        uploadedFiles: true,
        employees: true,
        employeeSnapshots: true,
        taskHistories: true,
        timesheetActions: true,
        activityLogs: true,
      },
    } satisfies Prisma.hrm_platform_membersFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IHrmPlatformMember.ISummary> {
    return {
      id: input.id,
      email: input.email,
      display_name: input.display_name ?? undefined,
      avatar_uri: input.avatar_uri ?? undefined,
      phone_number: input.phone_number ?? undefined,
      is_active: input.is_active,
      last_login_at: input.last_login_at?.toISOString() ?? null,
      created_at: input.created_at.toISOString(),
      updated_at: input.updated_at.toISOString(),
      deleted_at: input.deleted_at?.toISOString() ?? null,
    } satisfies IHrmPlatformMember.ISummary;
  }
}


//--------------------------------------------------------------
// TEMPLATE CODE
//--------------------------------------------------------------
//     export namespace HrmPlatformMemberAtSummaryTransformer {
//       export type Payload = Prisma.hrm_platform_membersGetPayload<ReturnType<typeof select>>;
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
//             phone_number: true,
//             is_active: true,
//             last_login_at: true,
//             created_at: true,
//             updated_at: true,
//             deleted_at: true,
//           },
//         } satisfies Prisma.hrm_platform_membersFindManyArgs;
//       }
// 
//       export async function transform(input: Payload): Promise<IHrmPlatformMember.ISummary> {
//         return {
//   id: {string},
//   email: {string},
//   display_name: {string},
//   avatar_uri: {string},
//   phone_number: {string},
//   is_active: {boolean},
//   last_login_at: {string | null},
//   created_at: {string},
//   updated_at: {string},
//   deleted_at: {string | null},
//         };
//       }
//     }
//--------------------------------------------------------------