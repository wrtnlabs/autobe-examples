import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IRedditCloneGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneGuest";
import { IRedditCloneGuestSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneGuestSession";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import { VariadicSingleton } from "tstl";
import typia, { tags } from "typia";

import { MyGlobal } from "../MyGlobal";
import { toISOStringSafe } from "../utils/toISOStringSafe";
import { RedditCloneGuestAtSummaryTransformer } from "./RedditCloneGuestAtSummaryTransformer";

export namespace RedditCloneGuestSessionTransformer {
  export type Payload = Prisma.reddit_clone_guest_sessionsGetPayload<
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
        expired_at: true,
        guest: RedditCloneGuestAtSummaryTransformer.select(),
      },
    } satisfies Prisma.reddit_clone_guest_sessionsFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IRedditCloneGuestSession> {
    return {
      id: input.id,
      redditCloneGuestId: input.guest.id,
      ip: input.ip,
      href: input.href,
      referrer: input.referrer,
      createdAt: input.created_at.toISOString(),
      expiredAt: input.expired_at.toISOString(),
      guest: await RedditCloneGuestAtSummaryTransformer.transform(input.guest),
    } satisfies IRedditCloneGuestSession;
  }
}


//--------------------------------------------------------------
// TEMPLATE CODE
//--------------------------------------------------------------
//     export namespace RedditCloneGuestSessionTransformer {
//       export type Payload = Prisma.reddit_clone_guest_sessionsGetPayload<ReturnType<typeof select>>;
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
//             expired_at: true,
//             guest: RedditCloneGuestAtSummaryTransformer.select(),
//           },
//         } satisfies Prisma.reddit_clone_guest_sessionsFindManyArgs;
//       }
// 
//       export async function transform(input: Payload): Promise<IRedditCloneGuestSession> {
//         return {
//   id: {string},
//   redditCloneGuestId: {string},
//   ip: {string},
//   href: {string},
//   referrer: {string},
//   createdAt: {string},
//   expiredAt: {string},
//   guest: await RedditCloneGuestAtSummaryTransformer.transform(input.guest),
//         };
//       }
//     }
//--------------------------------------------------------------