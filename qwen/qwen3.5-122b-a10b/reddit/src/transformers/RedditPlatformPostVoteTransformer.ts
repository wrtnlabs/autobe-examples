import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IRedditPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformCommunity";
import { IRedditPlatformFile } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformFile";
import { IRedditPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformMember";
import { IRedditPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformPost";
import { IRedditPlatformPostVote } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformPostVote";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import typia, { tags } from "typia";

import { toISOStringSafe } from "../utils/toISOStringSafe";
import { RedditPlatformCommunityAtSummaryTransformer } from "./RedditPlatformCommunityAtSummaryTransformer";
import { RedditPlatformMemberAtSummaryTransformer } from "./RedditPlatformMemberAtSummaryTransformer";

export namespace RedditPlatformPostVoteTransformer {
  export type Payload = Prisma.reddit_platform_post_votesGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        type: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
        member: RedditPlatformMemberAtSummaryTransformer.select(),
        post: {
          select: {
            id: true,
            title: true,
            post_type: true,
            created_at: true,
            text_content: true,
            url: true,
            file_id: true,
            author: RedditPlatformMemberAtSummaryTransformer.select(),
            community: RedditPlatformCommunityAtSummaryTransformer.select(),
            file: {
              select: {
                id: true,
                file_path: true,
              },
            } satisfies Prisma.reddit_platform_filesFindManyArgs,
            votes: {
              select: {
                type: true,
              },
            } satisfies Prisma.reddit_platform_post_votesFindManyArgs,
            comments: {
              select: {
                id: true,
              },
            } satisfies Prisma.reddit_platform_commentsFindManyArgs,
          },
        } satisfies Prisma.reddit_platform_postsFindManyArgs,
      },
    } satisfies Prisma.reddit_platform_post_votesFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IRedditPlatformPostVote> {
    // Compute vote_score from post's votes
    const upvotes = input.post.votes.filter((v) => v.type === "upvote").length;
    const downvotes = input.post.votes.filter(
      (v) => v.type === "downvote",
    ).length;
    const vote_score = upvotes - downvotes;
    // Compute comment_count
    const comment_count = input.post.comments.length;
    // Compute preview based on post_type
    let preview: string;
    if (input.post.post_type === "text") {
      preview = input.post.text_content?.substring(0, 200) ?? "";
    } else if (input.post.post_type === "link") {
      try {
        const urlObj = new URL(input.post.url ?? "");
        preview = urlObj.hostname;
      } catch {
        preview = input.post.url ?? "";
      }
    } else if (input.post.post_type === "image") {
      preview = input.post.file?.file_path ?? "";
    } else {
      preview = "";
    }
    return {
      id: input.id,
      type: typia.assert<"upvote" | "downvote">(input.type),
      created_at: toISOStringSafe(input.created_at),
      updated_at: toISOStringSafe(input.updated_at),
      deleted_at: input.deleted_at ? toISOStringSafe(input.deleted_at) : null,
      member: await RedditPlatformMemberAtSummaryTransformer.transform(
        input.member,
      ),
      post: {
        id: input.post.id,
        title: input.post.title,
        author: await RedditPlatformMemberAtSummaryTransformer.transform(
          input.post.author,
        ),
        community: await RedditPlatformCommunityAtSummaryTransformer.transform(
          input.post.community,
        ),
        vote_score,
        comment_count,
        created_at: toISOStringSafe(input.post.created_at),
        post_type: input.post.post_type,
        preview,
      },
    };
  }
}
