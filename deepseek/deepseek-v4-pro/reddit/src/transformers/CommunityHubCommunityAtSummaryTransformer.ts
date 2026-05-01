import { ICommunityHubCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityHubCommunity";
import { ICommunityHubMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityHubMember";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import { VariadicSingleton } from "tstl";
import typia, { tags } from "typia";

import { MyGlobal } from "../MyGlobal";
import { toISOStringSafe } from "../utils/toISOStringSafe";
import { CommunityHubMemberAtSummaryTransformer } from "./CommunityHubMemberAtSummaryTransformer";

export namespace CommunityHubCommunityAtSummaryTransformer {
  export type Payload = Prisma.community_hub_communitiesGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        name: true,
        description: true,
        icon_image: true,
        subscriber_count: true,
        created_at: true,
        owner: CommunityHubMemberAtSummaryTransformer.select(),
      },
    } satisfies Prisma.community_hub_communitiesFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<ICommunityHubCommunity.ISummary> {
    return {
      id: input.id,
      name: input.name,
      description: input.description,
      icon_image: input.icon_image,
      owner: await CommunityHubMemberAtSummaryTransformer.transform(
        input.owner,
      ),
      subscriber_count: input.subscriber_count,
      created_at: input.created_at.toISOString(),
    } satisfies ICommunityHubCommunity.ISummary;
  }
}


//--------------------------------------------------------------
// TEMPLATE CODE
//--------------------------------------------------------------
//     export namespace CommunityHubCommunityAtSummaryTransformer {
//       export type Payload = Prisma.community_hub_communitiesGetPayload<ReturnType<typeof select>>;
// 
//       export function select() {
//         // implicit return type for better type inference
//         return {
//           select: {
//             id: true,
//             name: true,
//             description: true,
//             icon_image: true,
//             subscriber_count: true,
//             created_at: true,
//             updated_at: true,
//             deleted_at: true,
//             owner: CommunityHubMemberAtSummaryTransformer.select(),
//           },
//         } satisfies Prisma.community_hub_communitiesFindManyArgs;
//       }
// 
//       export async function transform(input: Payload): Promise<ICommunityHubCommunity.ISummary> {
//         return {
//   id: {string},
//   name: {string},
//   description: {string | null},
//   icon_image: {string | null},
//   owner: await CommunityHubMemberAtSummaryTransformer.transform(input.owner),
//   subscriber_count: {integer},
//   created_at: {string},
//         };
//       }
//     }
//--------------------------------------------------------------