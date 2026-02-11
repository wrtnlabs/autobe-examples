import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IRedditPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformCommunity";
import { IRedditPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformMember";
import { IRedditPlatformModeration } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformModeration";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import typia, { tags } from "typia";

import { toISOStringSafe } from "../utils/toISOStringSafe";
import { RedditPlatformCommunityAtSummaryTransformer } from "./RedditPlatformCommunityAtSummaryTransformer";
import { RedditPlatformMemberAtSummaryTransformer } from "./RedditPlatformMemberAtSummaryTransformer";

export namespace RedditPlatformModerationTransformer {
  export type Payload = Prisma.reddit_platform_moderationsGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        role: true,
        created_at: true,
        community_id: true,
        user_id: true,
        community: RedditPlatformCommunityAtSummaryTransformer.select(),
        user: RedditPlatformMemberAtSummaryTransformer.select(),
      },
    } satisfies Prisma.reddit_platform_moderationsFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IRedditPlatformModeration> {
    return {
      id: input.id,
      community_id: input.community_id,
      user_id: input.user_id,
      role: input.role as "OWNER" | "MODERATOR",
      created_at: toISOStringSafe(input.created_at),
      community: await RedditPlatformCommunityAtSummaryTransformer.transform(
        input.community,
      ),
      user: await RedditPlatformMemberAtSummaryTransformer.transform(
        input.user,
      ),
    };
  }
}
