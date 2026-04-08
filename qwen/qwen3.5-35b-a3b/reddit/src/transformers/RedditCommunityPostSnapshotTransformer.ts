import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IRedditCommunityCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunity";
import { IRedditCommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityMember";
import { IRedditCommunityPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityPost";
import { IRedditCommunityPostSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityPostSnapshot";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import { VariadicSingleton } from "tstl";
import typia, { tags } from "typia";

import { MyGlobal } from "../MyGlobal";
import { toISOStringSafe } from "../utils/toISOStringSafe";
import { RedditCommunityCommunityAtSummaryTransformer } from "./RedditCommunityCommunityAtSummaryTransformer";
import { RedditCommunityMemberAtSummaryTransformer } from "./RedditCommunityMemberAtSummaryTransformer";
import { RedditCommunityPostAtSummaryTransformer } from "./RedditCommunityPostAtSummaryTransformer";

export namespace RedditCommunityPostSnapshotTransformer {
  export type Payload = Prisma.reddit_community_post_snapshotsGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        title: true,
        post_type: true,
        content: true,
        link_url: true,
        status: true,
        created_at: true,
        redditCommunityPost: RedditCommunityPostAtSummaryTransformer.select(),
        author: RedditCommunityMemberAtSummaryTransformer.select(),
        community: RedditCommunityCommunityAtSummaryTransformer.select(),
      },
    } satisfies Prisma.reddit_community_post_snapshotsFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IRedditCommunityPostSnapshot> {
    return {
      id: input.id,
      title: input.title,
      post_type: input.post_type,
      content: input.content ?? undefined,
      link_url: input.link_url ?? undefined,
      status: input.status,
      created_at: input.created_at.toISOString(),
      author: await RedditCommunityMemberAtSummaryTransformer.transform(
        input.author,
      ),
      community: await RedditCommunityCommunityAtSummaryTransformer.transform(
        input.community,
      ),
      redditCommunityPost:
        await RedditCommunityPostAtSummaryTransformer.transform(
          input.redditCommunityPost,
        ),
    } satisfies IRedditCommunityPostSnapshot;
  }
}


//--------------------------------------------------------------
// TEMPLATE CODE
//--------------------------------------------------------------
//     export namespace RedditCommunityPostSnapshotTransformer {
//       export type Payload = Prisma.reddit_community_post_snapshotsGetPayload<ReturnType<typeof select>>;
// 
//       export function select() {
//         // implicit return type for better type inference
//         return {
//           select: {
//             id: true,
//             title: true,
//             post_type: true,
//             content: true,
//             link_url: true,
//             status: true,
//             created_at: true,
//             redditCommunityPost: RedditCommunityPostAtSummaryTransformer.select(),
//             author: RedditCommunityMemberAtSummaryTransformer.select(),
//             community: RedditCommunityCommunityAtSummaryTransformer.select(),
//           },
//         } satisfies Prisma.reddit_community_post_snapshotsFindManyArgs;
//       }
// 
//       export async function transform(input: Payload): Promise<IRedditCommunityPostSnapshot> {
//         return {
//   id: {string},
//   title: {string},
//   post_type: {string},
//   content: {string | null},
//   link_url: {string | null},
//   status: {string},
//   created_at: {string},
//   author: await RedditCommunityMemberAtSummaryTransformer.transform(input.author),
//   community: await RedditCommunityCommunityAtSummaryTransformer.transform(input.community),
//   redditCommunityPost: await RedditCommunityPostAtSummaryTransformer.transform(input.redditCommunityPost),
//         };
//       }
//     }
//--------------------------------------------------------------