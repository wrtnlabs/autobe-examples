import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IRedditCloneCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneCommunity";
import { IRedditClonePost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditClonePost";
import { IRedditCloneUserProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneUserProfile";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import { VariadicSingleton } from "tstl";
import typia, { tags } from "typia";

import { MyGlobal } from "../MyGlobal";
import { toISOStringSafe } from "../utils/toISOStringSafe";
import { RedditCloneCommunityAtSummaryTransformer } from "./RedditCloneCommunityAtSummaryTransformer";
import { RedditCloneUserProfileAtSummaryTransformer } from "./RedditCloneUserProfileAtSummaryTransformer";

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
        text_content: true,
        link_url: true,
        image_url: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
        userProfile: RedditCloneUserProfileAtSummaryTransformer.select(),
        community: RedditCloneCommunityAtSummaryTransformer.select(),
        postVotes: {
          select: {
            vote_type: true,
          },
        } satisfies Prisma.reddit_clone_post_votesFindManyArgs,
        comments: {
          select: {
            deleted_at: true,
          },
        } satisfies Prisma.reddit_clone_commentsFindManyArgs,
        snapshots: {
          select: {
            id: true,
          },
        } satisfies Prisma.reddit_clone_post_snapshotsFindManyArgs,
        reports: {
          select: {
            id: true,
          },
        } satisfies Prisma.reddit_clone_reportsFindManyArgs,
      },
    } satisfies Prisma.reddit_clone_postsFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IRedditClonePost.ISummary> {
    // Compute vote_score: +1 for upvote, -1 for downvote
    const vote_score = input.postVotes.reduce((sum, vote) => {
      return vote.vote_type === "upvote" ? sum + 1 : sum - 1;
    }, 0);
    // Count non-deleted comments
    const comment_count = input.comments.filter(
      (c) => c.deleted_at === null,
    ).length;
    // Compute preview based on post_type
    let preview = "";
    if (input.post_type === "text") {
      const content = input.text_content ?? "";
      preview =
        content.length > 200 ? content.substring(0, 200) + "..." : content;
    } else if (input.post_type === "image") {
      preview = input.image_url ?? "";
    } else if (input.post_type === "link") {
      try {
        const url = new URL(input.link_url ?? "");
        preview = url.hostname;
      } catch {
        preview = input.link_url ?? "";
      }
    }
    return {
      id: input.id,
      title: input.title,
      post_type: input.post_type,
      author: await RedditCloneUserProfileAtSummaryTransformer.transform(
        input.userProfile,
      ),
      community: await RedditCloneCommunityAtSummaryTransformer.transform(
        input.community,
      ),
      vote_score,
      comment_count,
      created_at: input.created_at.toISOString(),
      preview,
    };
  }
}
