import { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import { ICommunityPlatformCommunityImage } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunityImage";
import { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import { VariadicSingleton } from "tstl";
import typia, { tags } from "typia";

import { MyGlobal } from "../MyGlobal";
import { toISOStringSafe } from "../utils/toISOStringSafe";
import { CommunityPlatformCommunityImageTransformer } from "./CommunityPlatformCommunityImageTransformer";
import { CommunityPlatformMemberAtSummaryTransformer } from "./CommunityPlatformMemberAtSummaryTransformer";

export namespace CommunityPlatformCommunityTransformer {
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
        updated_at: true,
        owner: CommunityPlatformMemberAtSummaryTransformer.select(),
        images: {
          ...CommunityPlatformCommunityImageTransformer.select(),
          orderBy: { created_at: "desc" as const },
          take: 1,
        } satisfies Prisma.community_platform_community_imagesFindManyArgs,
      },
    } satisfies Prisma.community_platform_communitiesFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<ICommunityPlatformCommunity> {
    return {
      id: input.id,
      name: input.name,
      description: input.description,
      subscriberCount: input.subscriber_count,
      owner: await CommunityPlatformMemberAtSummaryTransformer.transform(
        input.owner,
      ),
      icon:
        input.images.length > 0
          ? await CommunityPlatformCommunityImageTransformer.transform(
              input.images[0],
            )
          : null,
      createdAt: input.created_at.toISOString(),
      updatedAt: input.updated_at.toISOString(),
    } satisfies ICommunityPlatformCommunity;
  }
}


//--------------------------------------------------------------
// TEMPLATE CODE
//--------------------------------------------------------------
//     export namespace CommunityPlatformCommunityTransformer {
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
//             images: CommunityPlatformCommunityImageTransformer.select(),
//           },
//         } satisfies Prisma.community_platform_communitiesFindManyArgs;
//       }
// 
//       export async function transform(input: Payload): Promise<ICommunityPlatformCommunity> {
//         return {
//   id: {string},
//   name: {string},
//   description: {string},
//   subscriberCount: {integer},
//   owner: await CommunityPlatformMemberAtSummaryTransformer.transform(input.owner),
//   icon: input.images ? await CommunityPlatformCommunityImageTransformer.transform(input.images) : null,
//   createdAt: {string},
//   updatedAt: {string},
//         };
//       }
//     }
//--------------------------------------------------------------