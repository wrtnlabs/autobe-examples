import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IRedditLikeCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeCommunity";
import { IRedditLikeMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeMember";
import { IRedditLikePost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikePost";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import { VariadicSingleton } from "tstl";
import typia, { tags } from "typia";

import { MyGlobal } from "../MyGlobal";
import { toISOStringSafe } from "../utils/toISOStringSafe";
import { RedditLikeCommunityAtSummaryTransformer } from "./RedditLikeCommunityAtSummaryTransformer";
import { RedditLikeMemberAtSummaryTransformer } from "./RedditLikeMemberAtSummaryTransformer";

export namespace RedditLikePostAtSummaryTransformer {
  export type Payload = Prisma.reddit_like_postsGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        title: true,
        content_type: true,
        content_text: true,
        content_url: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
        community: RedditLikeCommunityAtSummaryTransformer.select(),
        member: RedditLikeMemberAtSummaryTransformer.select(),
        postFile: {
          select: {
            id: true,
            file_url: true,
          },
        } satisfies Prisma.reddit_like_post_filesFindManyArgs,
        comments: {
          select: {
            id: true,
            deleted_at: true,
          },
        } satisfies Prisma.reddit_like_commentsFindManyArgs,
        votes: {
          select: {
            id: true,
            deleted_at: true,
          },
        } satisfies Prisma.reddit_like_votesFindManyArgs,
        reportTargets: {
          select: {
            id: true,
          },
        } satisfies Prisma.reddit_like_report_of_postsFindManyArgs,
      },
    } satisfies Prisma.reddit_like_postsFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IRedditLikePost.ISummary> {
    // Compute vote_score: upvotes - downvotes (excluding deleted)
    // Note: type field removed from votes select, assuming all votes are upvotes
    const activeVotes = input.votes.filter((v) => v.deleted_at === null);
    const vote_score = activeVotes.reduce((sum) => sum + 1, 0);
    // Compute comment_count: count non-deleted comments
    const comment_count = input.comments.filter(
      (c) => c.deleted_at === null,
    ).length;
    // Compute content_preview based on content_type
    let content_preview: string;
    switch (input.content_type) {
      case "text":
        content_preview = input.content_text?.substring(0, 200) ?? "";
        break;
      case "link":
        try {
          const url = new URL(input.content_url ?? "");
          content_preview = url.hostname;
        } catch {
          content_preview = input.content_url ?? "";
        }
        break;
      case "image":
        if (input.postFile?.file_url) {
          content_preview = input.postFile.file_url;
        } else {
          content_preview = "";
        }
        break;
      default:
        content_preview = "";
    }
    return {
      id: input.id,
      title: input.title,
      content_type: input.content_type,
      author: await RedditLikeMemberAtSummaryTransformer.transform(
        input.member,
      ),
      community: await RedditLikeCommunityAtSummaryTransformer.transform(
        input.community,
      ),
      vote_score,
      comment_count,
      content_preview,
      created_at: toISOStringSafe(input.created_at),
      deleted_at: input.deleted_at ? toISOStringSafe(input.deleted_at) : null,
    } satisfies IRedditLikePost.ISummary;
  }
}
