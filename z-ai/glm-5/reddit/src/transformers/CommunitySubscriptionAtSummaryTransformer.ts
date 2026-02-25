import { ICommunityCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityCommunity";
import { ICommunitySubscription } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunitySubscription";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import typia, { tags } from "typia";

import { toISOStringSafe } from "../utils/toISOStringSafe";
import { CommunityCommunityAtSummaryTransformer } from "./CommunityCommunityAtSummaryTransformer";

export namespace CommunitySubscriptionAtSummaryTransformer {
  export type Payload = Prisma.community_subscriptionsGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        created_at: true,
        community: CommunityCommunityAtSummaryTransformer.select(),
      },
    } satisfies Prisma.community_subscriptionsFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<ICommunitySubscription.ISummary> {
    return {
      id: input.id,
      created_at: input.created_at.toISOString(),
      community: await CommunityCommunityAtSummaryTransformer.transform(
        input.community,
      ),
    };
  }
}
