import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IRedditCloneCommunityModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneCommunityModerator";
import { IRedditCloneMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneMember";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import { VariadicSingleton } from "tstl";
import typia, { tags } from "typia";

import { MyGlobal } from "../MyGlobal";
import { toISOStringSafe } from "../utils/toISOStringSafe";
import { RedditCloneMemberAtSummaryTransformer } from "./RedditCloneMemberAtSummaryTransformer";

export namespace RedditCloneCommunityModeratorAtSummaryTransformer {
  export type Payload = Prisma.reddit_clone_community_moderatorsGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        role: true,
        created_at: true,
        updated_at: true,
        community: true,
        member: RedditCloneMemberAtSummaryTransformer.select(),
        assigner: RedditCloneMemberAtSummaryTransformer.select(),
        issuedBans: true,
      },
    } satisfies Prisma.reddit_clone_community_moderatorsFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IRedditCloneCommunityModerator.ISummary> {
    return {
      id: input.id,
      role: input.role,
      assignedAt: input.created_at.toISOString(),
      member: await RedditCloneMemberAtSummaryTransformer.transform(
        input.member,
      ),
      assigner: input.assigner
        ? await RedditCloneMemberAtSummaryTransformer.transform(input.assigner)
        : undefined,
    } satisfies IRedditCloneCommunityModerator.ISummary;
  }
}


//--------------------------------------------------------------
// TEMPLATE CODE
//--------------------------------------------------------------
//     export namespace RedditCloneCommunityModeratorAtSummaryTransformer {
//       export type Payload = Prisma.reddit_clone_community_moderatorsGetPayload<ReturnType<typeof select>>;
// 
//       export function select() {
//         // implicit return type for better type inference
//         return {
//           select: {
//             id: true,
//             role: true,
//             created_at: true,
//             updated_at: true,
//             reddit_clone_community_id: true,
//             reddit_clone_member_id: true,
//             assigned_by: true,
//             ...
//           },
//         } satisfies Prisma.reddit_clone_community_moderatorsFindManyArgs;
//       }
// 
//       export async function transform(input: Payload): Promise<IRedditCloneCommunityModerator.ISummary> {
//         return {
//   id: {string},
//   role: {string},
//   assignedAt: {string},
//   member: {IRedditCloneMember.ISummary},
//   assigner: {IRedditCloneMember.ISummary | null},
//         };
//       }
//     }
//--------------------------------------------------------------