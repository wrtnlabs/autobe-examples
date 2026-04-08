import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IHrmPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformMember";
import { IHrmPlatformMemberPasswordReset } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformMemberPasswordReset";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import { VariadicSingleton } from "tstl";
import typia, { tags } from "typia";

import { MyGlobal } from "../MyGlobal";
import { toISOStringSafe } from "../utils/toISOStringSafe";
import { HrmPlatformMemberAtSummaryTransformer } from "./HrmPlatformMemberAtSummaryTransformer";

export namespace HrmPlatformMemberPasswordResetAtSummaryTransformer {
  export type Payload = Prisma.hrm_platform_member_password_resetsGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        token: true,
        used_at: true,
        expired_at: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
        member: HrmPlatformMemberAtSummaryTransformer.select(),
      },
    } satisfies Prisma.hrm_platform_member_password_resetsFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IHrmPlatformMemberPasswordReset.ISummary> {
    const now = new Date();
    const status: "active" | "used" | "expired" = input.used_at
      ? "used"
      : input.expired_at < now
        ? "expired"
        : "active";
    return {
      id: input.id,
      member: await HrmPlatformMemberAtSummaryTransformer.transform(
        input.member,
      ),
      status: status,
      created_at: input.created_at.toISOString(),
      expired_at: input.expired_at.toISOString(),
      deleted_at: input.deleted_at?.toISOString() ?? null,
    } satisfies IHrmPlatformMemberPasswordReset.ISummary;
  }
}


//--------------------------------------------------------------
// TEMPLATE CODE
//--------------------------------------------------------------
//     export namespace HrmPlatformMemberPasswordResetAtSummaryTransformer {
//       export type Payload = Prisma.hrm_platform_member_password_resetsGetPayload<ReturnType<typeof select>>;
// 
//       export function select() {
//         // implicit return type for better type inference
//         return {
//           select: {
//             id: true,
//             token: true,
//             used_at: true,
//             expired_at: true,
//             created_at: true,
//             updated_at: true,
//             deleted_at: true,
//             member: HrmPlatformMemberAtSummaryTransformer.select(),
//           },
//         } satisfies Prisma.hrm_platform_member_password_resetsFindManyArgs;
//       }
// 
//       export async function transform(input: Payload): Promise<IHrmPlatformMemberPasswordReset.ISummary> {
//         return {
//   id: {string},
//   member: await HrmPlatformMemberAtSummaryTransformer.transform(input.member),
//   status: {"active" | "used" | "expired"},
//   created_at: {string},
//   expired_at: {string},
//   deleted_at: {string | null},
//         };
//       }
//     }
//--------------------------------------------------------------