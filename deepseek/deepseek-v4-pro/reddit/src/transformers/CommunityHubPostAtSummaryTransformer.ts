import { ICommunityHubCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityHubCommunity";
import { ICommunityHubMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityHubMember";
import { ICommunityHubPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityHubPost";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import { VariadicSingleton } from "tstl";
import typia, { tags } from "typia";

import { MyGlobal } from "../MyGlobal";
import { toISOStringSafe } from "../utils/toISOStringSafe";
import { CommunityHubCommunityAtSummaryTransformer } from "./CommunityHubCommunityAtSummaryTransformer";
import { CommunityHubMemberAtSummaryTransformer } from "./CommunityHubMemberAtSummaryTransformer";

export namespace CommunityHubPostAtSummaryTransformer {
  export type Payload = Prisma.community_hub_postsGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        type: true,
        title: true,
        vote_score: true,
        comment_count: true,
        created_at: true,
        member: CommunityHubMemberAtSummaryTransformer.select(),
        community: CommunityHubCommunityAtSummaryTransformer.select(),
      },
    } satisfies Prisma.community_hub_postsFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<ICommunityHubPost.ISummary> {
    return {
      id: input.id,
      type: input.type,
      title: input.title,
      vote_score: input.vote_score,
      comment_count: input.comment_count,
      author: await CommunityHubMemberAtSummaryTransformer.transform(
        input.member,
      ),
      community: await CommunityHubCommunityAtSummaryTransformer.transform(
        input.community,
      ),
      created_at: input.created_at.toISOString(),
    } satisfies ICommunityHubPost.ISummary;
  }
}


//--------------------------------------------------------------
// TEMPLATE CODE
//--------------------------------------------------------------
//     export namespace CommunityHubPostAtSummaryTransformer {
//       export type Payload = Prisma.community_hub_postsGetPayload<ReturnType<typeof select>>;
// 
//       export function select() {
//         // implicit return type for better type inference
//         return {
//           select: {
//             id: true,
//             type: true,
//             title: true,
//             body: true,
//             url: true,
//             vote_score: true,
//             comment_count: true,
//             created_at: true,
//             updated_at: true,
//             deleted_at: true,
//             member: CommunityHubMemberAtSummaryTransformer.select(),
//             community: CommunityHubCommunityAtSummaryTransformer.select(),
//           },
//         } satisfies Prisma.community_hub_postsFindManyArgs;
//       }
// 
//       export async function transform(input: Payload): Promise<ICommunityHubPost.ISummary> {
//         return {
//   id: {string},
//   type: {string},
//   title: {string},
//   vote_score: {integer},
//   comment_count: {integer},
//   author: await CommunityHubMemberAtSummaryTransformer.transform(input.member),
//   community: await CommunityHubCommunityAtSummaryTransformer.transform(input.community),
//   created_at: {string},
//         };
//       }
//     }
//--------------------------------------------------------------