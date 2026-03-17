import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IRedditCloneComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneComment";
import { IRedditCloneCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneCommunity";
import { IRedditCloneMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneMember";
import { IRedditClonePost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditClonePost";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import typia, { tags } from "typia";

import { toISOStringSafe } from "../utils/toISOStringSafe";
import { RedditCloneCommentAtSummaryTransformer } from "./RedditCloneCommentAtSummaryTransformer";
import { RedditCloneCommunityAtSummaryTransformer } from "./RedditCloneCommunityAtSummaryTransformer";
import { RedditCloneMemberAtSummaryTransformer } from "./RedditCloneMemberAtSummaryTransformer";

export namespace RedditCloneCommentTransformer {
  export type Payload = Prisma.reddit_clone_commentsGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        body: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
        member: RedditCloneMemberAtSummaryTransformer.select(),
        post: {
          select: {
            id: true,
            title: true,
            post_type: true,
            created_at: true,
            member: RedditCloneMemberAtSummaryTransformer.select(),
            community: {
              select: {
                id: true,
                name: true,
                description: true,
                icon: true,
                subscriber_count: true,
                created_at: true,
                owner: RedditCloneMemberAtSummaryTransformer.select(),
              },
            } satisfies Prisma.reddit_clone_communitiesFindManyArgs,
            text: {
              select: {
                body: true,
              },
            } satisfies Prisma.reddit_clone_post_textsFindManyArgs,
            link: {
              select: {
                url: true,
              },
            } satisfies Prisma.reddit_clone_post_linksFindManyArgs,
            postImage: {
              select: {
                id: true,
              },
            } satisfies Prisma.reddit_clone_post_imagesFindManyArgs,
            comments: {
              select: {
                id: true,
              },
            } satisfies Prisma.reddit_clone_commentsFindManyArgs,
          },
        } satisfies Prisma.reddit_clone_postsFindManyArgs,
        parent: RedditCloneCommentAtSummaryTransformer.select(),
        children: RedditCloneCommentTransformer.select(),
      },
    } satisfies Prisma.reddit_clone_commentsFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IRedditCloneComment> {
    const postPreview = (() => {
      switch (input.post.post_type) {
        case "TEXT":
          return input.post.text?.body?.substring(0, 200) ?? "";
        case "LINK":
          return input.post.link?.url
            ? new URL(input.post.link.url).hostname
            : "";
        case "IMAGE":
          return input.post.postImage?.id ?? "";
        default:
          return "";
      }
    })();
    return {
      id: input.id,
      body: input.body,
      author: await RedditCloneMemberAtSummaryTransformer.transform(
        input.member,
      ),
      post: {
        id: input.post.id,
        title: input.post.title,
        post_type: input.post.post_type,
        author: await RedditCloneMemberAtSummaryTransformer.transform(
          input.post.member,
        ),
        community: await RedditCloneCommunityAtSummaryTransformer.transform(
          input.post.community,
        ),
        vote_score: 0,
        comment_count: input.post.comments.length,
        created_at: input.post.created_at.toISOString(),
        preview: postPreview,
      } satisfies IRedditClonePost.ISummary,
      parent: input.parent
        ? await RedditCloneCommentAtSummaryTransformer.transform(input.parent)
        : null,
      children: await ArrayUtil.asyncMap(
        input.children,
        RedditCloneCommentTransformer.transform,
      ),
      vote_score: 0,
      created_at: input.created_at.toISOString(),
      updated_at: input.updated_at.toISOString(),
      deleted_at: input.deleted_at?.toISOString() ?? null,
    };
  }
}
