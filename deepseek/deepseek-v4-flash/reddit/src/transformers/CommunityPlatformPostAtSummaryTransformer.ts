import { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import { ICommunityPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPost";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import { VariadicSingleton } from "tstl";
import typia, { tags } from "typia";

import { MyGlobal } from "../MyGlobal";
import { toISOStringSafe } from "../utils/toISOStringSafe";
import { CommunityPlatformCommunityAtSummaryTransformer } from "./CommunityPlatformCommunityAtSummaryTransformer";
import { CommunityPlatformMemberAtSummaryTransformer } from "./CommunityPlatformMemberAtSummaryTransformer";

export namespace CommunityPlatformPostAtSummaryTransformer {
  export type Payload = Prisma.community_platform_postsGetPayload<
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
        author: CommunityPlatformMemberAtSummaryTransformer.select(),
        community: CommunityPlatformCommunityAtSummaryTransformer.select(),
        text: {
          select: {
            body: true,
          },
        } satisfies Prisma.community_platform_post_textsFindManyArgs,
        link: {
          select: {
            domain_name: true,
          },
        } satisfies Prisma.community_platform_post_linksFindManyArgs,
        image: {
          select: {
            url: true,
          },
        } satisfies Prisma.community_platform_post_imagesFindManyArgs,
      },
    } satisfies Prisma.community_platform_postsFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<ICommunityPlatformPost.ISummary> {
    return {
      id: input.id,
      type: input.type,
      title: input.title,
      vote_score: input.vote_score,
      comment_count: input.comment_count,
      created_at: input.created_at.toISOString(),
      author: await CommunityPlatformMemberAtSummaryTransformer.transform(
        input.author,
      ),
      community: await CommunityPlatformCommunityAtSummaryTransformer.transform(
        input.community,
      ),
      text_preview:
        input.type === "text"
          ? (input.text?.body.substring(0, 200) ?? undefined)
          : undefined,
      image_url:
        input.type === "image" ? (input.image?.url ?? undefined) : undefined,
      domain_name:
        input.type === "link"
          ? (input.link?.domain_name ?? undefined)
          : undefined,
    } satisfies ICommunityPlatformPost.ISummary;
  }
}


//--------------------------------------------------------------
// TEMPLATE CODE
//--------------------------------------------------------------
//     export namespace CommunityPlatformPostAtSummaryTransformer {
//       export type Payload = Prisma.community_platform_postsGetPayload<ReturnType<typeof select>>;
// 
//       export function select() {
//         // implicit return type for better type inference
//         return {
//           select: {
//             id: true,
//             type: true,
//             title: true,
//             vote_score: true,
//             comment_count: true,
//             created_at: true,
//             updated_at: true,
//             deleted_at: true,
//             author: CommunityPlatformMemberAtSummaryTransformer.select(),
//             community: CommunityPlatformCommunityAtSummaryTransformer.select(),
//           },
//         } satisfies Prisma.community_platform_postsFindManyArgs;
//       }
// 
//       export async function transform(input: Payload): Promise<ICommunityPlatformPost.ISummary> {
//         return {
//   id: {string},
//   type: {string},
//   title: {string},
//   vote_score: {integer},
//   comment_count: {integer},
//   created_at: {string},
//   author: await CommunityPlatformMemberAtSummaryTransformer.transform(input.author),
//   community: await CommunityPlatformCommunityAtSummaryTransformer.transform(input.community),
//   text_preview: {string},
//   image_url: {string},
//   domain_name: {string},
//         };
//       }
//     }
//--------------------------------------------------------------