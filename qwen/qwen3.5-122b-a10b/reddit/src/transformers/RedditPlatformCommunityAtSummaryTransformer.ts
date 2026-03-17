import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IRedditPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformCommunity";
import { IRedditPlatformFile } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformFile";
import { IRedditPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformMember";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import typia, { tags } from "typia";

import { toISOStringSafe } from "../utils/toISOStringSafe";
import { RedditPlatformFileTransformer } from "./RedditPlatformFileTransformer";
import { RedditPlatformMemberAtSummaryTransformer } from "./RedditPlatformMemberAtSummaryTransformer";

export namespace RedditPlatformCommunityAtSummaryTransformer {
  export type Payload = Prisma.reddit_platform_communitiesGetPayload<
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
        owner: RedditPlatformMemberAtSummaryTransformer.select(),
        icon: RedditPlatformFileTransformer.select(),
      },
    } satisfies Prisma.reddit_platform_communitiesFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IRedditPlatformCommunity.ISummary> {
    return {
      id: input.id,
      name: input.name,
      description: input.description ?? null,
      icon: input.icon
        ? await RedditPlatformFileTransformer.transform(input.icon)
        : null,
      owner: await RedditPlatformMemberAtSummaryTransformer.transform(
        input.owner,
      ),
      subscriber_count: input.subscriber_count,
      created_at: input.created_at.toISOString(),
    };
  }
}
