import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IRedditCloneUserKarma } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneUserKarma";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import { VariadicSingleton } from "tstl";
import typia, { tags } from "typia";

import { MyGlobal } from "../MyGlobal";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export namespace RedditCloneUserKarmaAtSummaryTransformer {
  export type Payload = Prisma.reddit_clone_user_karmasGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        karma_score: true,
        created_at: true,
        updated_at: true,
        member: {
          select: {
            id: true,
          },
        } satisfies Prisma.reddit_clone_membersFindManyArgs,
      },
    } satisfies Prisma.reddit_clone_user_karmasFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IRedditCloneUserKarma.ISummary> {
    return {
      karmaScore: Number(input.karma_score),
    } satisfies IRedditCloneUserKarma.ISummary;
  }
}


//--------------------------------------------------------------
// TEMPLATE CODE
//--------------------------------------------------------------
//     export namespace RedditCloneUserKarmaAtSummaryTransformer {
//       export type Payload = Prisma.reddit_clone_user_karmasGetPayload<ReturnType<typeof select>>;
// 
//       export function select() {
//         // implicit return type for better type inference
//         return {
//           select: {
//             id: true,
//             karma_score: true,
//             created_at: true,
//             updated_at: true,
//             reddit_clone_member_id: true,
//           },
//         } satisfies Prisma.reddit_clone_user_karmasFindManyArgs;
//       }
// 
//       export async function transform(input: Payload): Promise<IRedditCloneUserKarma.ISummary> {
//         return {
//   karmaScore: {integer},
//         };
//       }
//     }
//--------------------------------------------------------------