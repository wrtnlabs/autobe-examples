import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IRedditCommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityMember";
import { IRedditCommunityMemberSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityMemberSession";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import { VariadicSingleton } from "tstl";
import typia, { tags } from "typia";

import { MyGlobal } from "../MyGlobal";
import { toISOStringSafe } from "../utils/toISOStringSafe";
import { RedditCommunityMemberAtSummaryTransformer } from "./RedditCommunityMemberAtSummaryTransformer";

export namespace RedditCommunityMemberSessionAtFullTransformer {
  export type Payload = Prisma.reddit_community_member_sessionsGetPayload<
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
        deleted_at: true,
        member: RedditCommunityMemberAtSummaryTransformer.select(),
      },
    } satisfies Prisma.reddit_community_member_sessionsFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IRedditCommunityMemberSession.IFull> {
    return {
      id: input.id,
      member: await RedditCommunityMemberAtSummaryTransformer.transform(
        input.member,
      ),
      ip: input.ip,
      href: input.href,
      referrer: input.referrer,
      created_at: input.created_at.toISOString(),
      updated_at: input.updated_at.toISOString(),
      expired_at: input.expired_at.toISOString(),
      deleted_at: input.deleted_at?.toISOString() ?? null,
    } satisfies IRedditCommunityMemberSession.IFull;
  }
}


//--------------------------------------------------------------
// TEMPLATE CODE
//--------------------------------------------------------------
//     export namespace RedditCommunityMemberSessionAtFullTransformer {
//       export type Payload = Prisma.reddit_community_member_sessionsGetPayload<ReturnType<typeof select>>;
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
//             deleted_at: true,
//             member: RedditCommunityMemberAtSummaryTransformer.select(),
//           },
//         } satisfies Prisma.reddit_community_member_sessionsFindManyArgs;
//       }
// 
//       export async function transform(input: Payload): Promise<IRedditCommunityMemberSession.IFull> {
//         return {
//   id: {string},
//   member: await RedditCommunityMemberAtSummaryTransformer.transform(input.member),
//   ip: {string | null},
//   href: {string | null},
//   referrer: {string | null},
//   created_at: {string},
//   updated_at: {string},
//   expired_at: {string},
//   deleted_at: {string | null},
//         };
//       }
//     }
//--------------------------------------------------------------