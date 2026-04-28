import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IREdditLikeCommunityCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IREdditLikeCommunityCommunity";
import { IREdditLikeCommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IREdditLikeCommunityMember";
import { IRedditLikeCommunityPostSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeCommunityPostSnapshot";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import { VariadicSingleton } from "tstl";
import typia, { tags } from "typia";

import { MyGlobal } from "../MyGlobal";
import { toISOStringSafe } from "../utils/toISOStringSafe";
import { REdditLikeCommunityCommunityAtSummaryTransformer } from "./REdditLikeCommunityCommunityAtSummaryTransformer";
import { REdditLikeCommunityMemberAtSummaryTransformer } from "./REdditLikeCommunityMemberAtSummaryTransformer";

export namespace RedditLikeCommunityPostSnapshotTransformer {
  export type Payload = Prisma.reddit_like_community_post_snapshotsGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        title: true,
        post_type: true,
        body: true,
        url: true,
        created_at: true,
        member: REdditLikeCommunityMemberAtSummaryTransformer.select(),
        community: REdditLikeCommunityCommunityAtSummaryTransformer.select(),
      },
    } satisfies Prisma.reddit_like_community_post_snapshotsFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IRedditLikeCommunityPostSnapshot> {
    return {
      id: input.id,
      title: input.title,
      post_type: input.post_type,
      body: input.body,
      url: input.url,
      author: await REdditLikeCommunityMemberAtSummaryTransformer.transform(
        input.member,
      ),
      community:
        await REdditLikeCommunityCommunityAtSummaryTransformer.transform(
          input.community,
        ),
      created_at: input.created_at.toISOString(),
    };
  }
}


//--------------------------------------------------------------
// TEMPLATE CODE
//--------------------------------------------------------------
//     export namespace RedditLikeCommunityPostSnapshotTransformer {
//       export type Payload = Prisma.reddit_like_community_post_snapshotsGetPayload<ReturnType<typeof select>>;
// 
//       export function select() {
//         // implicit return type for better type inference
//         return {
//           select: {
//             id: true,
//             title: true,
//             post_type: true,
//             body: true,
//             url: true,
//             created_at: true,
//             reddit_like_community_post_id: true,
//             community: REdditLikeCommunityCommunityAtSummaryTransformer.select(),
//             member: REdditLikeCommunityMemberAtSummaryTransformer.select(),
//           },
//         } satisfies Prisma.reddit_like_community_post_snapshotsFindManyArgs;
//       }
// 
//       export async function transform(input: Payload): Promise<IRedditLikeCommunityPostSnapshot> {
//         return {
//   id: {string},
//   title: {string},
//   post_type: {string},
//   body: {string | null},
//   url: {string | null},
//   author: await REdditLikeCommunityMemberAtSummaryTransformer.transform(input.member),
//   community: await REdditLikeCommunityCommunityAtSummaryTransformer.transform(input.community),
//   created_at: {string},
//         };
//       }
//     }
//--------------------------------------------------------------