import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IRedditPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformCommunity";
import { IRedditPlatformFile } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformFile";
import { IRedditPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformMember";
import { IRedditPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformPost";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import typia, { tags } from "typia";

import { toISOStringSafe } from "../utils/toISOStringSafe";
import { RedditPlatformCommunityAtSummaryTransformer } from "./RedditPlatformCommunityAtSummaryTransformer";
import { RedditPlatformFileTransformer } from "./RedditPlatformFileTransformer";
import { RedditPlatformMemberAtSummaryTransformer } from "./RedditPlatformMemberAtSummaryTransformer";

export namespace RedditPlatformPostTransformer {
  export type Payload = Prisma.reddit_platform_postsGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        title: true,
        post_type: true,
        text_content: true,
        url: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
        author: RedditPlatformMemberAtSummaryTransformer.select(),
        community: RedditPlatformCommunityAtSummaryTransformer.select(),
        file: RedditPlatformFileTransformer.select(),
        votes: {
          select: {
            type: true,
          },
        },
        snapshots: {
          select: { id: true },
        } satisfies Prisma.reddit_platform_post_snapshotsFindManyArgs,
        comments: {
          select: { id: true },
        } satisfies Prisma.reddit_platform_commentsFindManyArgs,
        reports: {
          select: { id: true },
        } satisfies Prisma.reddit_platform_reportsFindManyArgs,
      },
    } satisfies Prisma.reddit_platform_postsFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IRedditPlatformPost> {
    const voteScore = input.votes.reduce((score, vote) => {
      return score + (vote.type === "upvote" ? 1 : -1);
    }, 0);
    return {
      id: input.id,
      title: input.title,
      post_type: input.post_type,
      text_content: input.text_content,
      url: input.url,
      file: input.file
        ? await RedditPlatformFileTransformer.transform(input.file)
        : null,
      author: await RedditPlatformMemberAtSummaryTransformer.transform(
        input.author,
      ),
      community: await RedditPlatformCommunityAtSummaryTransformer.transform(
        input.community,
      ),
      vote_score: voteScore,
      comment_count: input.comments.length,
      created_at: toISOStringSafe(input.created_at),
      updated_at: toISOStringSafe(input.updated_at),
      deleted_at: input.deleted_at ? toISOStringSafe(input.deleted_at) : null,
    };
  }
}
