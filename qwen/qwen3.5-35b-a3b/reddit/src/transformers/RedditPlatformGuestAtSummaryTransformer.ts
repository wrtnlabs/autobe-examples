import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IRedditPlatformGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformGuest";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import { VariadicSingleton } from "tstl";
import typia, { tags } from "typia";

import { MyGlobal } from "../MyGlobal";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export namespace RedditPlatformGuestAtSummaryTransformer {
  export type Payload = Prisma.reddit_platform_guestsGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        fingerprint: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
        _count: {
          select: {
            guestSessions: true,
          },
        },
      },
    } satisfies Prisma.reddit_platform_guestsFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IRedditPlatformGuest.ISummary> {
    return {
      id: input.id,
      fingerprint: input.fingerprint,
      created_at: input.created_at.toISOString(),
      updated_at: input.updated_at.toISOString(),
      deleted_at: input.deleted_at?.toISOString() ?? null,
      active_session_count: input._count.guestSessions,
    } satisfies IRedditPlatformGuest.ISummary;
  }
}


//--------------------------------------------------------------
// TEMPLATE CODE
//--------------------------------------------------------------
//     export namespace RedditPlatformGuestAtSummaryTransformer {
//       export type Payload = Prisma.reddit_platform_guestsGetPayload<ReturnType<typeof select>>;
// 
//       export function select() {
//         // implicit return type for better type inference
//         return {
//           select: {
//             id: true,
//             fingerprint: true,
//             created_at: true,
//             updated_at: true,
//             deleted_at: true,
//           },
//         } satisfies Prisma.reddit_platform_guestsFindManyArgs;
//       }
// 
//       export async function transform(input: Payload): Promise<IRedditPlatformGuest.ISummary> {
//         return {
//   id: {string},
//   fingerprint: {string},
//   created_at: {string},
//   updated_at: {string},
//   deleted_at: {string | null},
//   active_session_count: {integer},
//         };
//       }
//     }
//--------------------------------------------------------------