import { ICommunityHubCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityHubCommunity";
import { ICommunityHubMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityHubMember";
import { ICommunityHubPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityHubPost";
import { ICommunityHubPostImage } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityHubPostImage";
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
import { CommunityHubPostImageTransformer } from "./CommunityHubPostImageTransformer";

export namespace CommunityHubPostTransformer {
  export type Payload = Prisma.community_hub_postsGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        type: true,
        title: true,
        body: true,
        url: true,
        vote_score: true,
        comment_count: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
        member: CommunityHubMemberAtSummaryTransformer.select(),
        community: CommunityHubCommunityAtSummaryTransformer.select(),
        image: CommunityHubPostImageTransformer.select(),
      },
    } satisfies Prisma.community_hub_postsFindManyArgs;
  }
  export async function transform(input: Payload): Promise<ICommunityHubPost> {
    return {
      id: input.id,
      type: input.type as "text" | "link" | "image",
      title: input.title,
      body: input.body,
      url: input.url,
      vote_score: input.vote_score,
      comment_count: input.comment_count,
      author: await CommunityHubMemberAtSummaryTransformer.transform(
        input.member,
      ),
      community: await CommunityHubCommunityAtSummaryTransformer.transform(
        input.community,
      ),
      image: input.image
        ? await CommunityHubPostImageTransformer.transform(input.image)
        : null,
      created_at: input.created_at.toISOString(),
      updated_at: input.updated_at.toISOString(),
      deleted_at: input.deleted_at?.toISOString() ?? null,
    } satisfies ICommunityHubPost;
  }
}


//--------------------------------------------------------------
// TEMPLATE CODE
//--------------------------------------------------------------
//     export namespace CommunityHubPostTransformer {
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
//             image: CommunityHubPostImageTransformer.select(),
//           },
//         } satisfies Prisma.community_hub_postsFindManyArgs;
//       }
// 
//       export async function transform(input: Payload): Promise<ICommunityHubPost> {
//         return {
//   id: {string},
//   type: {"text" | "link" | "image"},
//   title: {string},
//   body: {string | null},
//   url: {string | null},
//   vote_score: {integer},
//   comment_count: {integer},
//   author: await CommunityHubMemberAtSummaryTransformer.transform(input.member),
//   community: await CommunityHubCommunityAtSummaryTransformer.transform(input.community),
//   image: input.image ? await CommunityHubPostImageTransformer.transform(input.image) : null,
//   created_at: {string},
//   updated_at: {string},
//   deleted_at: {string | null},
//         };
//       }
//     }
//--------------------------------------------------------------