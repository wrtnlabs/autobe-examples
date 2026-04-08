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

export namespace RedditCloneMemberSessionAtSummaryTransformer {
  export type Payload = Prisma.reddit_clone_member_sessionsGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        access_token: true,
        refresh_token: true,
        member: RedditCloneMemberAtSummaryTransformer.select(),
        ip: true,
        href: true,
        referrer: true,
        created_at: true,
        expired_at: true,
      },
    } satisfies Prisma.reddit_clone_member_sessionsFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IRedditCloneMemberSession.ISummary> {
    return {
      id: input.id,
      member: await RedditCloneMemberAtSummaryTransformer.transform(
        input.member,
      ),
      ip: input.ip,
      href: input.href,
      referrer: input.referrer,
      created_at: input.created_at.toISOString(),
      expired_at: input.expired_at.toISOString(),
    } satisfies IRedditCloneMemberSession.ISummary;
  }
}


//--------------------------------------------------------------
// TEMPLATE CODE
//--------------------------------------------------------------
//     export namespace RedditCloneMemberSessionAtSummaryTransformer {
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
//       export async function transform(input: Payload): Promise<IRedditCloneMemberSession.ISummary> {
//         return {
//   id: {string},
//   member: await RedditCloneMemberAtSummaryTransformer.transform(input.member),
//   ip: {string},
//   href: {string},
//   referrer: {string},
//   created_at: {string},
//   expired_at: {string},
//         };
//       }
//     }
//--------------------------------------------------------------