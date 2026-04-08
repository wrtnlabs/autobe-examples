import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IRedditLikeCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeCommunity";
import { IRedditLikeMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeMember";
import { IRedditLikePost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikePost";
import { IRedditLikePostFile } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikePostFile";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import { VariadicSingleton } from "tstl";
import typia, { tags } from "typia";

import { MyGlobal } from "../MyGlobal";
import { toISOStringSafe } from "../utils/toISOStringSafe";
import { RedditLikeCommunityAtSummaryTransformer } from "./RedditLikeCommunityAtSummaryTransformer";
import { RedditLikeMemberAtSummaryTransformer } from "./RedditLikeMemberAtSummaryTransformer";
import { RedditLikePostFileTransformer } from "./RedditLikePostFileTransformer";

export namespace RedditLikePostTransformer {
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
        member: RedditLikeMemberAtSummaryTransformer.select(),
        community: RedditLikeCommunityAtSummaryTransformer.select(),
        postFile: RedditLikePostFileTransformer.select(),
        comments: {
          select: { id: true },
        } satisfies Prisma.reddit_like_commentsFindManyArgs,
        votes: {
          select: { vote_type: true },
        } satisfies Prisma.reddit_like_votesFindManyArgs,
        reportTargets: {
          select: { id: true },
        } satisfies Prisma.reddit_like_report_of_postsFindManyArgs,
        _count: {
          select: { comments: true },
        },
      },
    } satisfies Prisma.reddit_like_postsFindManyArgs;
  }
  export async function transform(input: Payload): Promise<IRedditLikePost> {
    const upvoteCount = input.votes.filter(
      (v) => v.vote_type === "upvote",
    ).length;
    const downvoteCount = input.votes.filter(
      (v) => v.vote_type === "downvote",
    ).length;
    return {
      id: input.id,
      title: input.title,
      content_type: input.content_type,
      content_text: input.content_text ?? null,
      content_url: input.content_url ?? null,
      author: await RedditLikeMemberAtSummaryTransformer.transform(
        input.member,
      ),
      community: await RedditLikeCommunityAtSummaryTransformer.transform(
        input.community,
      ),
      post_files: input.postFile
        ? [await RedditLikePostFileTransformer.transform(input.postFile)]
        : [],
      comments_count: input._count.comments,
      vote_score: upvoteCount - downvoteCount,
      created_at: input.created_at.toISOString(),
      updated_at: input.updated_at.toISOString(),
      deleted_at: input.deleted_at?.toISOString() ?? null,
    } satisfies IRedditLikePost;
  }
}
