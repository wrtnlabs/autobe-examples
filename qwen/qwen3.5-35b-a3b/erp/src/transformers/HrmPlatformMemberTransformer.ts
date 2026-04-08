import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IHrmPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformMember";
import { IHrmPlatformMemberEmailVerification } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformMemberEmailVerification";
import { IHrmPlatformMemberPasswordReset } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformMemberPasswordReset";
import { IHrmPlatformMemberSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformMemberSession";
import { IHrmPlatformOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformOrganization";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import { VariadicSingleton } from "tstl";
import typia, { tags } from "typia";

import { MyGlobal } from "../MyGlobal";
import { toISOStringSafe } from "../utils/toISOStringSafe";
import { HrmPlatformMemberEmailVerificationAtSummaryTransformer } from "./HrmPlatformMemberEmailVerificationAtSummaryTransformer";
import { HrmPlatformMemberPasswordResetAtSummaryTransformer } from "./HrmPlatformMemberPasswordResetAtSummaryTransformer";
import { HrmPlatformMemberSessionAtSummaryTransformer } from "./HrmPlatformMemberSessionAtSummaryTransformer";

export namespace HrmPlatformMemberTransformer {
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
        sessions: HrmPlatformMemberSessionAtSummaryTransformer.select(),
        passwordResetTokens:
          HrmPlatformMemberPasswordResetAtSummaryTransformer.select(),
        emailVerifications:
          HrmPlatformMemberEmailVerificationAtSummaryTransformer.select(),
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
  export async function transform(input: Payload): Promise<IHrmPlatformMember> {
    return {
      id: input.id,
      email: input.email,
      display_name: input.display_name ?? undefined,
      avatar_uri: input.avatar_uri ?? undefined,
      phone_number: input.phone_number ?? undefined,
      is_active: input.is_active,
      last_login_at: input.last_login_at?.toISOString() ?? undefined,
      created_at: input.created_at.toISOString(),
      updated_at: input.updated_at.toISOString(),
      deleted_at: input.deleted_at?.toISOString() ?? null,
      sessions: await ArrayUtil.asyncMap(
        input.sessions,
        HrmPlatformMemberSessionAtSummaryTransformer.transform,
      ),
      passwordResetTokens: await ArrayUtil.asyncMap(
        input.passwordResetTokens,
        HrmPlatformMemberPasswordResetAtSummaryTransformer.transform,
      ),
      emailVerifications: await ArrayUtil.asyncMap(
        input.emailVerifications,
        HrmPlatformMemberEmailVerificationAtSummaryTransformer.transform,
      ),
    } satisfies IHrmPlatformMember;
  }
}


//--------------------------------------------------------------
// TEMPLATE CODE
//--------------------------------------------------------------
//     export namespace HrmPlatformMemberTransformer {
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
//             passwordResetTokens: HrmPlatformMemberPasswordResetAtSummaryTransformer.select(),
//             sessions: HrmPlatformMemberSessionAtSummaryTransformer.select(),
//             emailVerifications: HrmPlatformMemberEmailVerificationAtSummaryTransformer.select(),
//           },
//         } satisfies Prisma.hrm_platform_membersFindManyArgs;
//       }
// 
//       export async function transform(input: Payload): Promise<IHrmPlatformMember> {
//         return {
//   id: {string},
//   email: {string},
//   display_name: {string},
//   avatar_uri: {string},
//   phone_number: {string},
//   is_active: {boolean},
//   last_login_at: {string},
//   created_at: {string},
//   updated_at: {string},
//   deleted_at: {string | null},
//   sessions: await ArrayUtil.asyncMap(input.sessions, HrmPlatformMemberSessionAtSummaryTransformer.transform),
//   passwordResetTokens: await ArrayUtil.asyncMap(input.passwordResetTokens, HrmPlatformMemberPasswordResetAtSummaryTransformer.transform),
//   emailVerifications: await ArrayUtil.asyncMap(input.emailVerifications, HrmPlatformMemberEmailVerificationAtSummaryTransformer.transform),
//         };
//       }
//     }
//--------------------------------------------------------------