import { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import { ICommunityPlatformMemberPasswordReset } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMemberPasswordReset";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import { VariadicSingleton } from "tstl";
import typia, { tags } from "typia";

import { MyGlobal } from "../MyGlobal";
import { toISOStringSafe } from "../utils/toISOStringSafe";
import { CommunityPlatformMemberAtSummaryTransformer } from "./CommunityPlatformMemberAtSummaryTransformer";

export namespace CommunityPlatformMemberPasswordResetAtSummaryTransformer {
  export type Payload =
    Prisma.community_platform_member_password_resetsGetPayload<
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
        member: CommunityPlatformMemberAtSummaryTransformer.select(),
      },
    } satisfies Prisma.community_platform_member_password_resetsFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<ICommunityPlatformMemberPasswordReset.ISummary> {
    return {
      id: input.id,
      member: await CommunityPlatformMemberAtSummaryTransformer.transform(
        input.member,
      ),
      used_at: input.used_at?.toISOString() ?? null,
      expired_at: input.expired_at.toISOString(),
      created_at: input.created_at.toISOString(),
    } satisfies ICommunityPlatformMemberPasswordReset.ISummary;
  }
}


//--------------------------------------------------------------
// TEMPLATE CODE
//--------------------------------------------------------------
//     export namespace CommunityPlatformMemberPasswordResetAtSummaryTransformer {
//       export type Payload = Prisma.community_platform_member_password_resetsGetPayload<ReturnType<typeof select>>;
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
//             member: CommunityPlatformMemberAtSummaryTransformer.select(),
//           },
//         } satisfies Prisma.community_platform_member_password_resetsFindManyArgs;
//       }
// 
//       export async function transform(input: Payload): Promise<ICommunityPlatformMemberPasswordReset.ISummary> {
//         return {
//   id: {string},
//   member: await CommunityPlatformMemberAtSummaryTransformer.transform(input.member),
//   used_at: {string | null},
//   expired_at: {string},
//   created_at: {string},
//         };
//       }
//     }
//--------------------------------------------------------------