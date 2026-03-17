import { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import { ICommunityPlatformMvCommunitySubscriberCount } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMvCommunitySubscriberCount";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import typia, { tags } from "typia";

import { toISOStringSafe } from "../utils/toISOStringSafe";
import { CommunityPlatformCommunityAtSummaryTransformer } from "./CommunityPlatformCommunityAtSummaryTransformer";

export namespace CommunityPlatformMvCommunitySubscriberCountTransformer {
  export type Payload =
    Prisma.community_platform_mv_community_subscriber_countsGetPayload<
      ReturnType<typeof select>
    >;
  export function select() {
    return {
      select: {
        id: true,
        subscriber_count: true,
        created_at: true,
        updated_at: true,
        community: CommunityPlatformCommunityAtSummaryTransformer.select(),
      },
    } satisfies Prisma.community_platform_mv_community_subscriber_countsFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<ICommunityPlatformMvCommunitySubscriberCount> {
    return {
      id: input.id,
      subscriber_count: input.subscriber_count,
      created_at: input.created_at.toISOString(),
      updated_at: input.updated_at.toISOString(),
      community: await CommunityPlatformCommunityAtSummaryTransformer.transform(
        input.community,
      ),
    };
  }
}
