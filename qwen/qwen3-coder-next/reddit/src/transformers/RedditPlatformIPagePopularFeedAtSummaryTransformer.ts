import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IRedditPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformCommunity";
import { IRedditPlatformIPagePopularFeed } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformIPagePopularFeed";
import { IRedditPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformMember";
import { IRedditPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformPost";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import typia, { tags } from "typia";

import { toISOStringSafe } from "../utils/toISOStringSafe";
import { RedditPlatformCommunityAtSummaryTransformer } from "./RedditPlatformCommunityAtSummaryTransformer";
import { RedditPlatformMemberAtSummaryTransformer } from "./RedditPlatformMemberAtSummaryTransformer";

export namespace RedditPlatformIPagePopularFeedAtSummaryTransformer {
  // 1. Payload type first
  export type Payload = Prisma.reddit_platform_postsGetPayload<
    ReturnType<typeof select>
  >;
  // 2. select() function second
  export function select() {
    return {
      select: {
        id: true,
        title: true,
        type: true,
        content: true,
        url: true,
        image_url: true,
        vote_score: true,
        comment_count: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
        author: RedditPlatformMemberAtSummaryTransformer.select(),
        community: RedditPlatformCommunityAtSummaryTransformer.select(),
      },
    } satisfies Prisma.reddit_platform_postsFindManyArgs;
  }
  // 3. transform() function last
  export async function transform(
    input: Payload,
  ): Promise<IRedditPlatformIPagePopularFeed.ISummary> {
    return {
      pagination: {
        current: 1,
        limit: 10,
        records: 0,
        pages: 0,
      },
      data: [
        {
          id: input.id,
          title: input.title,
          type: typia.assert<"TEXT" | "LINK" | "IMAGE">(input.type),
          author: await RedditPlatformMemberAtSummaryTransformer.transform(
            input.author,
          ),
          community:
            await RedditPlatformCommunityAtSummaryTransformer.transform(
              input.community,
            ),
          voteScore: input.vote_score,
          commentCount: input.comment_count,
          createdAt: toISOStringSafe(input.created_at),
          contentPreview:
            input.type === "TEXT"
              ? (input.content?.slice(0, 200) ?? null)
              : null,
          imagePreview:
            input.type === "IMAGE" ? (input.image_url ?? null) : null,
          domainPreview:
            input.type === "LINK" && input.url
              ? new URL(input.url).hostname
              : null,
        },
      ],
    };
  }
}
