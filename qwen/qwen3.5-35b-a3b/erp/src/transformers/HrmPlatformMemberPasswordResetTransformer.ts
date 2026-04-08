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

export namespace HrmPlatformMemberPasswordResetTransformer {
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
  ): Promise<IHrmPlatformMemberPasswordReset> {
    return {
      id: input.id,
      token: input.token,
      used_at: input.used_at?.toISOString() ?? null,
      expired_at: input.expired_at.toISOString(),
      created_at: input.created_at.toISOString(),
      updated_at: input.updated_at.toISOString(),
      deleted_at: input.deleted_at?.toISOString() ?? null,
      member: await HrmPlatformMemberAtSummaryTransformer.transform(
        input.member,
      ),
    } satisfies IHrmPlatformMemberPasswordReset;
  }
}


//--------------------------------------------------------------
// TEMPLATE CODE
//--------------------------------------------------------------
//     export namespace HrmPlatformMemberPasswordResetTransformer {
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
//       export async function transform(input: Payload): Promise<IHrmPlatformMemberPasswordReset> {
//         return {
//   id: {string},
//   token: {string},
//   used_at: {string | null},
//   expired_at: {string},
//   created_at: {string},
//   updated_at: {string},
//   deleted_at: {string | null},
//   member: await HrmPlatformMemberAtSummaryTransformer.transform(input.member),
//         };
//       }
//     }
//--------------------------------------------------------------