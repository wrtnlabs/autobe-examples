import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IRedditCommunityCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunity";
import { IRedditCommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityMember";
import { IRedditCommunityModeratorRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityModeratorRole";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import { VariadicSingleton } from "tstl";
import typia, { tags } from "typia";

import { MyGlobal } from "../MyGlobal";
import { toISOStringSafe } from "../utils/toISOStringSafe";
import { RedditCommunityCommunityAtSummaryTransformer } from "./RedditCommunityCommunityAtSummaryTransformer";
import { RedditCommunityMemberAtSummaryTransformer } from "./RedditCommunityMemberAtSummaryTransformer";

export namespace RedditCommunityModeratorRoleAtSummaryTransformer {
  export type Payload = Prisma.reddit_community_moderator_rolesGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        role: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
        community: RedditCommunityCommunityAtSummaryTransformer.select(),
        member: RedditCommunityMemberAtSummaryTransformer.select(),
      },
    } satisfies Prisma.reddit_community_moderator_rolesFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IRedditCommunityModeratorRole.ISummary> {
    return {
      id: input.id,
      role: typia.assert<"owner" | "moderator">(input.role),
      created_at: toISOStringSafe(input.created_at),
      updated_at: toISOStringSafe(input.updated_at),
      community: await RedditCommunityCommunityAtSummaryTransformer.transform(
        input.community,
      ),
      member: await RedditCommunityMemberAtSummaryTransformer.transform(
        input.member,
      ),
    } satisfies IRedditCommunityModeratorRole.ISummary;
  }
}


//--------------------------------------------------------------
// TEMPLATE CODE
//--------------------------------------------------------------
//     export namespace RedditCommunityModeratorRoleAtSummaryTransformer {
//       export type Payload = Prisma.reddit_community_moderator_rolesGetPayload<ReturnType<typeof select>>;
// 
//       export function select() {
//         // implicit return type for better type inference
//         return {
//           select: {
//             id: true,
//             role: true,
//             created_at: true,
//             updated_at: true,
//             ...
//           },
//         } satisfies Prisma.reddit_community_moderator_rolesFindManyArgs;
//       }
// 
//       export async function transform(input: Payload): Promise<IRedditCommunityModeratorRole.ISummary> {
//         return {
//   id: {string},
//   role: {"owner" | "moderator"},
//   created_at: {string},
//   updated_at: {string},
//   community: {IRedditCommunityCommunity.ISummary},
//   member: {IRedditCommunityMember.ISummary},
//         };
//       }
//     }
//--------------------------------------------------------------