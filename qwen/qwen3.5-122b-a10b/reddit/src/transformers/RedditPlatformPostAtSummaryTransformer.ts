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

export namespace RedditPlatformPostAtSummaryTransformer {
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
        author: RedditPlatformMemberAtSummaryTransformer.select(),
        community: RedditPlatformCommunityAtSummaryTransformer.select(),
        file: RedditPlatformFileTransformer.select(),
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
    } satisfies Prisma.reddit_platform_postsFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IRedditPlatformPost.ISummary> {
    // Compute vote_score: upvotes - downvotes
    const upvotes = input.votes.filter((v) => v.type === "upvote").length;
    const downvotes = input.votes.filter((v) => v.type === "downvote").length;
    const vote_score = upvotes - downvotes;
    // Compute comment_count
    const comment_count = input.comments.length;
    // Compute preview based on post_type
    let preview: string;
    if (input.post_type === "text") {
      preview = input.text_content?.substring(0, 200) ?? "";
    } else if (input.post_type === "link") {
      try {
        const urlObj = new URL(input.url ?? "");
        preview = urlObj.hostname;
      } catch {
        preview = input.url ?? "";
      }
    } else if (input.post_type === "image") {
      preview = input.file?.file_path ?? "";
    } else {
      preview = "";
    }
    return {
      id: input.id,
      title: input.title,
      author: await RedditPlatformMemberAtSummaryTransformer.transform(
        input.author,
      ),
      community: await RedditPlatformCommunityAtSummaryTransformer.transform(
        input.community,
      ),
      vote_score,
      comment_count,
      created_at: toISOStringSafe(input.created_at),
      post_type: input.post_type,
      preview,
    };
  }
}
