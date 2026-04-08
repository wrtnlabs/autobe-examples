import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IRedditPlatformCommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformCommunityMember";
import { IRedditPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformMember";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import { VariadicSingleton } from "tstl";
import typia, { tags } from "typia";

import { MyGlobal } from "../MyGlobal";
import { toISOStringSafe } from "../utils/toISOStringSafe";
import { RedditPlatformMemberAtSummaryTransformer } from "./RedditPlatformMemberAtSummaryTransformer";

export namespace RedditPlatformCommunityMemberAtSummaryTransformer {
  export type Payload = Prisma.reddit_platform_community_membersGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        role: true,
        joined_at: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
        user: RedditPlatformMemberAtSummaryTransformer.select(),
        community: true,
      },
    } satisfies Prisma.reddit_platform_community_membersFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IRedditPlatformCommunityMember.ISummary> {
    return {
      id: input.id,
      role: input.role,
      user: await RedditPlatformMemberAtSummaryTransformer.transform(
        input.user,
      ),
      joined_at: input.joined_at.toISOString(),
      created_at: input.created_at.toISOString(),
      updated_at: input.updated_at.toISOString(),
      deleted_at: input.deleted_at?.toISOString() ?? null,
    } satisfies IRedditPlatformCommunityMember.ISummary;
  }
}


//--------------------------------------------------------------
// TEMPLATE CODE
//--------------------------------------------------------------
//     export namespace RedditPlatformCommunityMemberAtSummaryTransformer {
//       export type Payload = Prisma.reddit_platform_community_membersGetPayload<ReturnType<typeof select>>;
// 
//       export function select() {
//         // implicit return type for better type inference
//         return {
//           select: {
//             id: true,
//             role: true,
//             joined_at: true,
//             created_at: true,
//             updated_at: true,
//             deleted_at: true,
//             user: RedditPlatformMemberAtSummaryTransformer.select(),
//             community_id: true,
//           },
//         } satisfies Prisma.reddit_platform_community_membersFindManyArgs;
//       }
// 
//       export async function transform(input: Payload): Promise<IRedditPlatformCommunityMember.ISummary> {
//         return {
//   id: {string},
//   role: {string},
//   user: await RedditPlatformMemberAtSummaryTransformer.transform(input.user),
//   joined_at: {string},
//   created_at: {string},
//   updated_at: {string},
//   deleted_at: {string | null},
//         };
//       }
//     }
//--------------------------------------------------------------