import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IRedditLikeAttachment } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeAttachment";
import { IRedditLikeCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeCommunity";
import { IRedditLikeMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeMember";
import { IRedditLikePost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikePost";
import { IRedditLikePostImageContent } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikePostImageContent";
import { IRedditLikePostLinkContent } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikePostLinkContent";
import { IRedditLikePostTextContent } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikePostTextContent";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import typia, { tags } from "typia";

import { toISOStringSafe } from "../utils/toISOStringSafe";
import { RedditLikeCommunityAtSummaryTransformer } from "./RedditLikeCommunityAtSummaryTransformer";
import { RedditLikeMemberAtSummaryTransformer } from "./RedditLikeMemberAtSummaryTransformer";
import { RedditLikePostImageContentTransformer } from "./RedditLikePostImageContentTransformer";
import { RedditLikePostLinkContentTransformer } from "./RedditLikePostLinkContentTransformer";
import { RedditLikePostTextContentTransformer } from "./RedditLikePostTextContentTransformer";

export namespace RedditLikePostTransformer {
  export type Payload = Prisma.reddit_like_postsGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        title: true,
        post_type: true,
        vote_score: true,
        comment_count: true,
        is_deleted: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
        author: RedditLikeMemberAtSummaryTransformer.select(),
        community: RedditLikeCommunityAtSummaryTransformer.select(),
        textContent: RedditLikePostTextContentTransformer.select(),
        linkContent: RedditLikePostLinkContentTransformer.select(),
        imageContent: RedditLikePostImageContentTransformer.select(),
      },
    } satisfies Prisma.reddit_like_postsFindManyArgs;
  }
  export async function transform(input: Payload): Promise<IRedditLikePost> {
    let content:
      | IRedditLikePostTextContent
      | IRedditLikePostLinkContent
      | IRedditLikePostImageContent;
    switch (input.post_type) {
      case "text":
        content = await RedditLikePostTextContentTransformer.transform(
          input.textContent!,
        );
        break;
      case "link":
        content = await RedditLikePostLinkContentTransformer.transform(
          input.linkContent!,
        );
        break;
      case "image":
        content = await RedditLikePostImageContentTransformer.transform(
          input.imageContent!,
        );
        break;
      default:
        throw new Error(`Unknown post type: ${input.post_type}`);
    }
    return {
      id: input.id,
      title: input.title,
      postType: input.post_type as "text" | "link" | "image",
      voteScore: input.vote_score,
      commentCount: input.comment_count,
      isDeleted: input.is_deleted,
      author: await RedditLikeMemberAtSummaryTransformer.transform(
        input.author,
      ),
      community: await RedditLikeCommunityAtSummaryTransformer.transform(
        input.community,
      ),
      content,
      createdAt: input.created_at.toISOString(),
      updatedAt: input.updated_at.toISOString(),
      deletedAt: input.deleted_at?.toISOString() ?? null,
    };
  }
}
