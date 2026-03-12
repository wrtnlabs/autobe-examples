import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IRedditCloneCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneCommunity";
import { IRedditCloneMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneMember";
import { IRedditClonePost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditClonePost";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import typia, { tags } from "typia";

import { toISOStringSafe } from "../utils/toISOStringSafe";
import { RedditCloneCommunityAtSummaryTransformer } from "./RedditCloneCommunityAtSummaryTransformer";
import { RedditCloneMemberAtSummaryTransformer } from "./RedditCloneMemberAtSummaryTransformer";

export namespace RedditClonePostAtSummaryTransformer {
  export type Payload = Prisma.reddit_clone_postsGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        title: true,
        post_type: true,
        score: true,
        created_at: true,
        comments: {
          select: {
            id: true,
          },
        } satisfies Prisma.reddit_clone_commentsFindManyArgs,
        author: RedditCloneMemberAtSummaryTransformer.select(),
        community: RedditCloneCommunityAtSummaryTransformer.select(),
        content: true,
        updated_at: true,
        deleted_at: true,
        images: true,
        snapshots: true,
        commentSnapshots: true,
        reports: true,
      },
    } satisfies Prisma.reddit_clone_postsFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IRedditClonePost.ISummary> {
    return {
      id: input.id,
      title: input.title,
      post_type: input.post_type,
      score: input.score,
      comment_count: input.comments.length,
      created_at: input.created_at.toISOString(),
      author: await RedditCloneMemberAtSummaryTransformer.transform(
        input.author,
      ),
      community: await RedditCloneCommunityAtSummaryTransformer.transform(
        input.community,
      ),
    };
  }
}
