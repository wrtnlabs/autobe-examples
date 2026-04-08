import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IRedditPlatformGuestSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformGuestSession";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import { VariadicSingleton } from "tstl";
import typia, { tags } from "typia";

import { MyGlobal } from "../MyGlobal";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export namespace RedditPlatformGuestSessionAtSummaryTransformer {
  export type Payload = Prisma.reddit_platform_guest_sessionsGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        ip: true,
        href: true,
        referrer: true,
        created_at: true,
        updated_at: true,
        expired_at: true,
        guest: true,
      },
    } satisfies Prisma.reddit_platform_guest_sessionsFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IRedditPlatformGuestSession.ISummary> {
    return {
      id: input.id,
      ip: input.ip,
      href: input.href,
      referrer: input.referrer,
      created_at: input.created_at.toISOString(),
      expired_at: input.expired_at.toISOString(),
    } satisfies IRedditPlatformGuestSession.ISummary;
  }
}


//--------------------------------------------------------------
// TEMPLATE CODE
//--------------------------------------------------------------
//     export namespace RedditPlatformGuestSessionAtSummaryTransformer {
//       export type Payload = Prisma.reddit_platform_guest_sessionsGetPayload<ReturnType<typeof select>>;
// 
//       export function select() {
//         // implicit return type for better type inference
//         return {
//           select: {
//             id: true,
//             ip: true,
//             href: true,
//             referrer: true,
//             created_at: true,
//             updated_at: true,
//             expired_at: true,
//             reddit_platform_guest_id: true,
//           },
//         } satisfies Prisma.reddit_platform_guest_sessionsFindManyArgs;
//       }
// 
//       export async function transform(input: Payload): Promise<IRedditPlatformGuestSession.ISummary> {
//         return {
//   id: {string},
//   ip: {string},
//   href: {string},
//   referrer: {string | null},
//   created_at: {string},
//   expired_at: {string},
//         };
//       }
//     }
//--------------------------------------------------------------