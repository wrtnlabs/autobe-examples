import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IRedditPlatformMemberPasswordReset } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformMemberPasswordReset";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import { VariadicSingleton } from "tstl";
import typia, { tags } from "typia";

import { MyGlobal } from "../MyGlobal";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export namespace RedditPlatformMemberPasswordResetAtSummaryTransformer {
  export type Payload = Prisma.reddit_platform_member_password_resetsGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        token: true,
        member: true,
        expires_at: true,
        used_at: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
      },
    } satisfies Prisma.reddit_platform_member_password_resetsFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IRedditPlatformMemberPasswordReset.ISummary> {
    return {
      id: input.id,
      created_at: input.created_at.toISOString(),
      updated_at: input.updated_at.toISOString(),
      expires_at: input.expires_at.toISOString(),
      used_at: input.used_at?.toISOString() ?? null,
      deleted_at: input.deleted_at?.toISOString() ?? null,
    } satisfies IRedditPlatformMemberPasswordReset.ISummary;
  }
}


//--------------------------------------------------------------
// TEMPLATE CODE
//--------------------------------------------------------------
//     export namespace RedditPlatformMemberPasswordResetAtSummaryTransformer {
//       export type Payload = Prisma.reddit_platform_member_password_resetsGetPayload<ReturnType<typeof select>>;
// 
//       export function select() {
//         // implicit return type for better type inference
//         return {
//           select: {
//             id: true,
//             token: true,
//             expires_at: true,
//             used_at: true,
//             created_at: true,
//             updated_at: true,
//             deleted_at: true,
//             member_id: true,
//           },
//         } satisfies Prisma.reddit_platform_member_password_resetsFindManyArgs;
//       }
// 
//       export async function transform(input: Payload): Promise<IRedditPlatformMemberPasswordReset.ISummary> {
//         return {
//   id: {string},
//   created_at: {string},
//   updated_at: {string},
//   expires_at: {string},
//   used_at: {string | null},
//   deleted_at: {string | null},
//         };
//       }
//     }
//--------------------------------------------------------------