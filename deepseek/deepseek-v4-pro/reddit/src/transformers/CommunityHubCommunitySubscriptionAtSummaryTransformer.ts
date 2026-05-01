import { ICommunityHubCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityHubCommunity";
import { ICommunityHubCommunitySubscription } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityHubCommunitySubscription";
import { ICommunityHubMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityHubMember";
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

export namespace CommunityHubCommunitySubscriptionAtSummaryTransformer {
  export type Payload = Prisma.community_hub_community_subscriptionsGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        created_at: true,
        updated_at: true,
        member: CommunityHubMemberAtSummaryTransformer.select(),
        community: CommunityHubCommunityAtSummaryTransformer.select(),
      },
    } satisfies Prisma.community_hub_community_subscriptionsFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<ICommunityHubCommunitySubscription.ISummary> {
    return {
      id: input.id,
      member: await CommunityHubMemberAtSummaryTransformer.transform(
        input.member,
      ),
      community: await CommunityHubCommunityAtSummaryTransformer.transform(
        input.community,
      ),
      created_at: input.created_at.toISOString(),
    } satisfies ICommunityHubCommunitySubscription.ISummary;
  }
}


//--------------------------------------------------------------
// TEMPLATE CODE
//--------------------------------------------------------------
//     export namespace CommunityHubCommunitySubscriptionAtSummaryTransformer {
//       export type Payload = Prisma.community_hub_community_subscriptionsGetPayload<ReturnType<typeof select>>;
// 
//       export function select() {
//         // implicit return type for better type inference
//         return {
//           select: {
//             id: true,
//             created_at: true,
//             updated_at: true,
//             member: CommunityHubMemberAtSummaryTransformer.select(),
//             community: CommunityHubCommunityAtSummaryTransformer.select(),
//           },
//         } satisfies Prisma.community_hub_community_subscriptionsFindManyArgs;
//       }
// 
//       export async function transform(input: Payload): Promise<ICommunityHubCommunitySubscription.ISummary> {
//         return {
//   id: {string},
//   member: await CommunityHubMemberAtSummaryTransformer.transform(input.member),
//   community: await CommunityHubCommunityAtSummaryTransformer.transform(input.community),
//   created_at: {string},
//         };
//       }
//     }
//--------------------------------------------------------------