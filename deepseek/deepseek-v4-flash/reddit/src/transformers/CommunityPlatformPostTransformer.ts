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

export namespace CommunityPlatformPostTransformer {
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
        updated_at: true,
        deleted_at: true,
        author: CommunityPlatformMemberAtSummaryTransformer.select(),
        community: CommunityPlatformCommunityAtSummaryTransformer.select(),
        text: {
          select: {
            body: true,
            created_at: true,
            updated_at: true,
          },
        } satisfies Prisma.community_platform_post_textsFindManyArgs,
        link: {
          select: {
            url: true,
            domain_name: true,
            created_at: true,
            updated_at: true,
          },
        } satisfies Prisma.community_platform_post_linksFindManyArgs,
        image: {
          select: {
            url: true,
            created_at: true,
            updated_at: true,
          },
        } satisfies Prisma.community_platform_post_imagesFindManyArgs,
      },
    } satisfies Prisma.community_platform_postsFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<ICommunityPlatformPost> {
    return {
      id: input.id,
      type: input.type,
      title: input.title,
      vote_score: input.vote_score,
      comment_count: input.comment_count,
      created_at: input.created_at.toISOString(),
      updated_at: input.updated_at?.toISOString() ?? null,
      deleted_at: input.deleted_at?.toISOString() ?? null,
      author: await CommunityPlatformMemberAtSummaryTransformer.transform(
        input.author,
      ),
      community: await CommunityPlatformCommunityAtSummaryTransformer.transform(
        input.community,
      ),
      text: input.text
        ? {
            body: input.text.body,
            created_at: input.text.created_at.toISOString(),
            updated_at: input.text.updated_at.toISOString(),
          }
        : undefined,
      link: input.link
        ? {
            url: input.link.url,
            domain_name: input.link.domain_name,
            created_at: input.link.created_at.toISOString(),
            updated_at: input.link.updated_at.toISOString(),
          }
        : undefined,
      image: input.image
        ? {
            url: input.image.url,
            created_at: input.image.created_at.toISOString(),
            updated_at: input.image.updated_at.toISOString(),
          }
        : undefined,
    } satisfies ICommunityPlatformPost;
  }
}


//--------------------------------------------------------------
// TEMPLATE CODE
//--------------------------------------------------------------
//     export namespace CommunityPlatformPostTransformer {
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
//             ...
//           },
//         } satisfies Prisma.community_platform_postsFindManyArgs;
//       }
// 
//       export async function transform(input: Payload): Promise<ICommunityPlatformPost> {
//         return {
//   id: {string},
//   type: {string},
//   title: {string},
//   vote_score: {integer},
//   comment_count: {integer},
//   created_at: {string},
//   updated_at: {string | null},
//   deleted_at: {string | null},
//   author: await CommunityPlatformMemberAtSummaryTransformer.transform(input.author),
//   community: await CommunityPlatformCommunityAtSummaryTransformer.transform(input.community),
//   text: {object},
//   link: {object},
//   image: {object},
//         };
//       }
//     }
//--------------------------------------------------------------