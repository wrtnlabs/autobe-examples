import { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import { VariadicSingleton } from "tstl";
import typia, { tags } from "typia";

import { MyGlobal } from "../MyGlobal";
import { toISOStringSafe } from "../utils/toISOStringSafe";
import { CommunityPlatformMemberAtSummaryTransformer } from "./CommunityPlatformMemberAtSummaryTransformer";

export namespace CommunityPlatformCommunityAtSummaryTransformer {
  export type Payload = Prisma.community_platform_communitiesGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        name: true,
        description: true,
        subscriber_count: true,
        created_at: true,
        owner: CommunityPlatformMemberAtSummaryTransformer.select(),
        images: {
          select: {
            url: true,
          },
          orderBy: {
            created_at: "desc",
          },
          take: 1,
        } satisfies Prisma.community_platform_community_imagesFindManyArgs,
      },
    } satisfies Prisma.community_platform_communitiesFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<ICommunityPlatformCommunity.ISummary> {
    return {
      id: input.id,
      name: input.name,
      description: input.description,
      icon_uri: input.images.length > 0 ? input.images[0].url : null,
      subscriber_count: input.subscriber_count,
      owner: await CommunityPlatformMemberAtSummaryTransformer.transform(
        input.owner,
      ),
      created_at: input.created_at.toISOString(),
    } satisfies ICommunityPlatformCommunity.ISummary;
  }
}


//--------------------------------------------------------------
// TEMPLATE CODE
//--------------------------------------------------------------
//     export namespace CommunityPlatformCommunityAtSummaryTransformer {
//       export type Payload = Prisma.community_platform_communitiesGetPayload<ReturnType<typeof select>>;
// 
//       export function select() {
//         // implicit return type for better type inference
//         return {
//           select: {
//             id: true,
//             name: true,
//             description: true,
//             subscriber_count: true,
//             created_at: true,
//             updated_at: true,
//             deleted_at: true,
//             owner: CommunityPlatformMemberAtSummaryTransformer.select(),
//           },
//         } satisfies Prisma.community_platform_communitiesFindManyArgs;
//       }
// 
//       export async function transform(input: Payload): Promise<ICommunityPlatformCommunity.ISummary> {
//         return {
//   id: {string},
//   name: {string},
//   description: {string},
//   icon_uri: {string | null},
//   subscriber_count: {integer},
//   owner: await CommunityPlatformMemberAtSummaryTransformer.transform(input.owner),
//   created_at: {string},
//         };
//       }
//     }
//--------------------------------------------------------------