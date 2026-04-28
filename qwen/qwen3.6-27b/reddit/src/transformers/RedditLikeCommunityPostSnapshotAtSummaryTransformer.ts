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

export namespace RedditLikeCommunityPostSnapshotAtSummaryTransformer {
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
        post: {
          select: {
            id: true,
          },
        },
        community: REdditLikeCommunityCommunityAtSummaryTransformer.select(),
        member: REdditLikeCommunityMemberAtSummaryTransformer.select(),
      },
    } satisfies Prisma.reddit_like_community_post_snapshotsFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IRedditLikeCommunityPostSnapshot.ISummary> {
    return {
      title: input.title,
      postType: input.post_type,
      body: input.body,
      url: input.url,
      community:
        await REdditLikeCommunityCommunityAtSummaryTransformer.transform(
          input.community,
        ),
      author: await REdditLikeCommunityMemberAtSummaryTransformer.transform(
        input.member,
      ),
      createdAt: input.created_at.toISOString(),
    } satisfies IRedditLikeCommunityPostSnapshot.ISummary;
  }
}


//--------------------------------------------------------------
// TEMPLATE CODE
//--------------------------------------------------------------
//     export namespace RedditLikeCommunityPostSnapshotAtSummaryTransformer {
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
//       export async function transform(input: Payload): Promise<IRedditLikeCommunityPostSnapshot.ISummary> {
//         return {
//   title: {string},
//   postType: {string},
//   body: {string | null},
//   url: {string | null},
//   community: await REdditLikeCommunityCommunityAtSummaryTransformer.transform(input.community),
//   author: await REdditLikeCommunityMemberAtSummaryTransformer.transform(input.member),
//   createdAt: {string},
//         };
//       }
//     }
//--------------------------------------------------------------