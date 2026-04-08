import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IRedditCloneMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneMember";
import { IRedditCloneMemberSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneMemberSession";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import { VariadicSingleton } from "tstl";
import typia, { tags } from "typia";

import { MyGlobal } from "../MyGlobal";
import { toISOStringSafe } from "../utils/toISOStringSafe";
import { RedditCloneMemberAtSummaryTransformer } from "./RedditCloneMemberAtSummaryTransformer";

export namespace RedditCloneMemberSessionTransformer {
  export type Payload = Prisma.reddit_clone_member_sessionsGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        access_token: true,
        refresh_token: true,
        ip: true,
        href: true,
        referrer: true,
        created_at: true,
        expired_at: true,
        member: RedditCloneMemberAtSummaryTransformer.select(),
      },
    } satisfies Prisma.reddit_clone_member_sessionsFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IRedditCloneMemberSession> {
    return {
      id: input.id,
      ip: input.ip,
      href: input.href,
      referrer: input.referrer,
      createdAt: input.created_at.toISOString(),
      expiredAt: input.expired_at.toISOString(),
      member: await RedditCloneMemberAtSummaryTransformer.transform(
        input.member,
      ),
    } satisfies IRedditCloneMemberSession;
  }
}


//--------------------------------------------------------------
// TEMPLATE CODE
//--------------------------------------------------------------
//     export namespace RedditCloneMemberSessionTransformer {
//       export type Payload = Prisma.reddit_clone_member_sessionsGetPayload<ReturnType<typeof select>>;
// 
//       export function select() {
//         // implicit return type for better type inference
//         return {
//           select: {
//             id: true,
//             access_token: true,
//             refresh_token: true,
//             ip: true,
//             href: true,
//             referrer: true,
//             created_at: true,
//             expired_at: true,
//             member: RedditCloneMemberAtSummaryTransformer.select(),
//           },
//         } satisfies Prisma.reddit_clone_member_sessionsFindManyArgs;
//       }
// 
//       export async function transform(input: Payload): Promise<IRedditCloneMemberSession> {
//         return {
//   id: {string},
//   ip: {string},
//   href: {string},
//   referrer: {string},
//   createdAt: {string},
//   expiredAt: {string},
//   member: await RedditCloneMemberAtSummaryTransformer.transform(input.member),
//         };
//       }
//     }
//--------------------------------------------------------------