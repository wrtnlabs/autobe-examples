import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IRedditPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformCommunity";
import { IRedditPlatformFile } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformFile";
import { IRedditPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformMember";
import { IRedditPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformPost";
import { IRedditPlatformPostSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformPostSnapshot";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import typia, { tags } from "typia";

import { toISOStringSafe } from "../utils/toISOStringSafe";
import { RedditPlatformCommunityAtSummaryTransformer } from "./RedditPlatformCommunityAtSummaryTransformer";
import { RedditPlatformMemberAtSummaryTransformer } from "./RedditPlatformMemberAtSummaryTransformer";

export namespace RedditPlatformPostSnapshotTransformer {
  export type Payload = Prisma.reddit_platform_post_snapshotsGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        reddit_platform_post_id: true,
        title: true,
        content: true,
        post_type: true,
        vote_score: true,
        comment_count: true,
        created_at: true,
        author: RedditPlatformMemberAtSummaryTransformer.select(),
        community: RedditPlatformCommunityAtSummaryTransformer.select(),
      },
    } satisfies Prisma.reddit_platform_post_snapshotsFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IRedditPlatformPostSnapshot> {
    return {
      id: input.id,
      postId: input.reddit_platform_post_id,
      authorId: input.author.id,
      communityId: input.community.id,
      title: input.title,
      content: input.content ?? null,
      postType: input.post_type,
      voteScore: input.vote_score,
      commentCount: input.comment_count,
      createdAt: toISOStringSafe(input.created_at),
      author: await RedditPlatformMemberAtSummaryTransformer.transform(
        input.author,
      ),
      community: await RedditPlatformCommunityAtSummaryTransformer.transform(
        input.community,
      ),
      post: {
        id: input.reddit_platform_post_id,
        title: input.title,
        author: await RedditPlatformMemberAtSummaryTransformer.transform(
          input.author,
        ),
        community: await RedditPlatformCommunityAtSummaryTransformer.transform(
          input.community,
        ),
        vote_score: input.vote_score,
        comment_count: input.comment_count,
        created_at: toISOStringSafe(input.created_at),
        post_type: input.post_type,
        preview: input.content?.substring(0, 200) ?? "",
      } satisfies IRedditPlatformPost.ISummary,
    };
  }
}
