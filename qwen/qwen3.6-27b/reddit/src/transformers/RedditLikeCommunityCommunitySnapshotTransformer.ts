import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IREdditLikeCommunityCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IREdditLikeCommunityCommunity";
import { IREdditLikeCommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IREdditLikeCommunityMember";
import { IRedditLikeCommunityCommunitySnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeCommunityCommunitySnapshot";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import { VariadicSingleton } from "tstl";
import typia, { tags } from "typia";

import { MyGlobal } from "../MyGlobal";
import { toISOStringSafe } from "../utils/toISOStringSafe";
import { REdditLikeCommunityCommunityAtSummaryTransformer } from "./REdditLikeCommunityCommunityAtSummaryTransformer";
import { REdditLikeCommunityMemberAtSummaryTransformer } from "./REdditLikeCommunityMemberAtSummaryTransformer";

export namespace RedditLikeCommunityCommunitySnapshotTransformer {
  export type Payload =
    Prisma.reddit_like_community_community_snapshotsGetPayload<
      ReturnType<typeof select>
    >;
  export function select() {
    return {
      select: {
        id: true,
        name: true,
        description: true,
        icon_uri: true,
        created_at: true,
        community: REdditLikeCommunityCommunityAtSummaryTransformer.select(),
        owner: REdditLikeCommunityMemberAtSummaryTransformer.select(),
      },
    } satisfies Prisma.reddit_like_community_community_snapshotsFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IRedditLikeCommunityCommunitySnapshot> {
    return {
      id: input.id,
      community:
        await REdditLikeCommunityCommunityAtSummaryTransformer.transform(
          input.community,
        ),
      owner: await REdditLikeCommunityMemberAtSummaryTransformer.transform(
        input.owner,
      ),
      name: input.name,
      description: input.description ?? null,
      icon_uri: input.icon_uri ?? null,
      created_at: input.created_at.toISOString(),
    };
  }
}


//--------------------------------------------------------------
// TEMPLATE CODE
//--------------------------------------------------------------
//     export namespace RedditLikeCommunityCommunitySnapshotTransformer {
//       export type Payload = Prisma.reddit_like_community_community_snapshotsGetPayload<ReturnType<typeof select>>;
// 
//       export function select() {
//         // implicit return type for better type inference
//         return {
//           select: {
//             id: true,
//             name: true,
//             description: true,
//             icon_uri: true,
//             created_at: true,
//             community: REdditLikeCommunityCommunityAtSummaryTransformer.select(),
//             owner: REdditLikeCommunityMemberAtSummaryTransformer.select(),
//           },
//         } satisfies Prisma.reddit_like_community_community_snapshotsFindManyArgs;
//       }
// 
//       export async function transform(input: Payload): Promise<IRedditLikeCommunityCommunitySnapshot> {
//         return {
//   id: {string},
//   community: await REdditLikeCommunityCommunityAtSummaryTransformer.transform(input.community),
//   owner: await REdditLikeCommunityMemberAtSummaryTransformer.transform(input.owner),
//   name: {string},
//   description: {string | null},
//   icon_uri: {string | null},
//   created_at: {string},
//         };
//       }
//     }
//--------------------------------------------------------------