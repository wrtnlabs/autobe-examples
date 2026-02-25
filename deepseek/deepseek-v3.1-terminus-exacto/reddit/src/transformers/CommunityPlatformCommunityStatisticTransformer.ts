import { ICommunityPlatformCommunityStatistic } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunityStatistic";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import typia, { tags } from "typia";

import { toISOStringSafe } from "../utils/toISOStringSafe";

export namespace CommunityPlatformCommunityStatisticTransformer {
  // 1. Payload type first
  export type Payload =
    Prisma.community_platform_community_statisticsGetPayload<
      ReturnType<typeof select>
    >;
  // 2. select() function second
  export function select() {
    return {
      select: {
        id: true,
        subscriber_count: true,
        post_count: true,
        comment_count: true,
        daily_active_users: true,
        last_calculated_at: true,
        created_at: true,
        updated_at: true,
        // community relation is required by database schema but not used in DTO
        community: false,
      },
    } satisfies Prisma.community_platform_community_statisticsFindManyArgs;
  }
  // 3. transform() function last
  export async function transform(
    input: Payload,
  ): Promise<ICommunityPlatformCommunityStatistic> {
    return {
      id: input.id,
      subscriber_count: input.subscriber_count,
      post_count: input.post_count,
      comment_count: input.comment_count,
      daily_active_users: input.daily_active_users,
      last_calculated_at: input.last_calculated_at.toISOString(),
      created_at: input.created_at.toISOString(),
      updated_at: input.updated_at.toISOString(),
    };
  }
}
