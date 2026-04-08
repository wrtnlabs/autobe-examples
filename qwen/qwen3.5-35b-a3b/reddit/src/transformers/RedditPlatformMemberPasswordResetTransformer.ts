import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IRedditPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformMember";
import { IRedditPlatformMemberPasswordReset } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformMemberPasswordReset";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import { VariadicSingleton } from "tstl";
import typia, { tags } from "typia";

import { MyGlobal } from "../MyGlobal";
import { toISOStringSafe } from "../utils/toISOStringSafe";
import { RedditPlatformMemberAtSummaryTransformer } from "./RedditPlatformMemberAtSummaryTransformer";

export namespace RedditPlatformMemberPasswordResetTransformer {
  export type Payload = Prisma.reddit_platform_member_password_resetsGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        token: true,
        expires_at: true,
        used_at: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
        member: RedditPlatformMemberAtSummaryTransformer.select(),
      },
    } satisfies Prisma.reddit_platform_member_password_resetsFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IRedditPlatformMemberPasswordReset> {
    return {
      id: input.id,
      member_id: input.member.id,
      token: input.token,
      used_at: input.used_at ? toISOStringSafe(input.used_at) : null,
      expires_at: toISOStringSafe(
        input.expires_at ?? new Date("9999-12-31T23:59:59.999Z"),
      ),
      created_at: toISOStringSafe(input.created_at),
      updated_at: toISOStringSafe(input.updated_at),
      deleted_at: input.deleted_at ? toISOStringSafe(input.deleted_at) : null,
      member: input.member
        ? await RedditPlatformMemberAtSummaryTransformer.transform(input.member)
        : undefined,
    } satisfies IRedditPlatformMemberPasswordReset;
  }
}


//--------------------------------------------------------------
// TEMPLATE CODE
//--------------------------------------------------------------
//     export namespace RedditPlatformMemberPasswordResetTransformer {
//       export type Payload = Prisma.reddit_platform_member_password_resetsGetPayload<ReturnType<typeof select>>;
// 
//       export function select() {
//         // implicit return type for better type inference
//         return {
//           select: {
//             id: true,
//             member_id: true,
//             token: true,
//             used_at: true,
//             expires_at: true,
//             created_at: true,
//             updated_at: true,
//             deleted_at: true,
//             ...
//           },
//         } satisfies Prisma.reddit_platform_member_password_resetsFindManyArgs;
//       }
// 
//       export async function transform(input: Payload): Promise<IRedditPlatformMemberPasswordReset> {
//         return {
//   id: {string},
//   member_id: {string},
//   token: {string},
//   used_at: {string | null},
//   expires_at: {string},
//   created_at: {string},
//   updated_at: {string},
//   deleted_at: {string | null},
//   member: {IRedditPlatformMember.ISummary},
//         };
//       }
//     }
//--------------------------------------------------------------