import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IRedditCloneGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneGuest";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import { VariadicSingleton } from "tstl";
import typia, { tags } from "typia";

import { MyGlobal } from "../MyGlobal";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export namespace RedditCloneGuestAtSummaryTransformer {
  export type Payload = Prisma.reddit_clone_guestsGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        fingerprint: true,
        created_at: true,
        updated_at: true,
        sessions: {
          select: {
            id: true,
          },
        } satisfies Prisma.reddit_clone_guest_sessionsFindManyArgs,
      },
    } satisfies Prisma.reddit_clone_guestsFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IRedditCloneGuest.ISummary> {
    return {
      id: input.id,
      fingerprint: input.fingerprint,
      createdAt: input.created_at.toISOString(),
      updatedAt: input.updated_at.toISOString(),
    } satisfies IRedditCloneGuest.ISummary;
  }
}


//--------------------------------------------------------------
// TEMPLATE CODE
//--------------------------------------------------------------
//     export namespace RedditCloneGuestAtSummaryTransformer {
//       export type Payload = Prisma.reddit_clone_guestsGetPayload<ReturnType<typeof select>>;
// 
//       export function select() {
//         // implicit return type for better type inference
//         return {
//           select: {
//             id: true,
//             fingerprint: true,
//             created_at: true,
//             updated_at: true,
//           },
//         } satisfies Prisma.reddit_clone_guestsFindManyArgs;
//       }
// 
//       export async function transform(input: Payload): Promise<IRedditCloneGuest.ISummary> {
//         return {
//   id: {string},
//   fingerprint: {string},
//   createdAt: {string},
//   updatedAt: {string},
//         };
//       }
//     }
//--------------------------------------------------------------