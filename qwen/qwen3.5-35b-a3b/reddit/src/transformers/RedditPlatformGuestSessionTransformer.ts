import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IRedditPlatformGuestSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformGuestSession";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import { VariadicSingleton } from "tstl";
import typia, { tags } from "typia";

import { MyGlobal } from "../MyGlobal";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export namespace RedditPlatformGuestSessionTransformer {
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
        guest: {
          select: { id: true },
        } satisfies Prisma.reddit_platform_guestsFindManyArgs,
      },
    } satisfies Prisma.reddit_platform_guest_sessionsFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IRedditPlatformGuestSession> {
    return {
      id: input.id,
      reddit_platform_guest_id: input.guest.id,
      ip: input.ip,
      href: input.href,
      referrer: input.referrer ?? null,
      created_at: input.created_at.toISOString(),
      updated_at: input.updated_at.toISOString(),
      expired_at: input.expired_at.toISOString(),
    } satisfies IRedditPlatformGuestSession;
  }
}


//--------------------------------------------------------------
// TEMPLATE CODE
//--------------------------------------------------------------
//     export namespace RedditPlatformGuestSessionTransformer {
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
//       export async function transform(input: Payload): Promise<IRedditPlatformGuestSession> {
//         return {
//   id: {string},
//   reddit_platform_guest_id: {string},
//   ip: {string},
//   href: {string},
//   referrer: {string | null},
//   created_at: {string},
//   updated_at: {string},
//   expired_at: {string},
//         };
//       }
//     }
//--------------------------------------------------------------