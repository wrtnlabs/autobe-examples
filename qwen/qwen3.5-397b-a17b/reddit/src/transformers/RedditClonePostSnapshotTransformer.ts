import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IRedditCloneCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneCommunity";
import { IRedditCloneMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneMember";
import { IRedditClonePost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditClonePost";
import { IRedditClonePostSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditClonePostSnapshot";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import typia, { tags } from "typia";

import { toISOStringSafe } from "../utils/toISOStringSafe";
import { RedditCloneCommunityAtSummaryTransformer } from "./RedditCloneCommunityAtSummaryTransformer";
import { RedditCloneMemberAtSummaryTransformer } from "./RedditCloneMemberAtSummaryTransformer";

export namespace RedditClonePostSnapshotTransformer {
  export type Payload = Prisma.reddit_clone_post_snapshotsGetPayload<
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
        image_file_id: true,
        created_at: true,
        post: {
          select: {
            id: true,
            title: true,
            post_type: true,
            created_at: true,
            member: RedditCloneMemberAtSummaryTransformer.select(),
            community: RedditCloneCommunityAtSummaryTransformer.select(),
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
                file_uri: true,
              },
            } satisfies Prisma.reddit_clone_post_imagesFindManyArgs,
            comments: {
              select: {
                id: true,
              },
            } satisfies Prisma.reddit_clone_commentsFindManyArgs,
          },
        } satisfies Prisma.reddit_clone_postsFindManyArgs,
        member: RedditCloneMemberAtSummaryTransformer.select(),
        community: RedditCloneCommunityAtSummaryTransformer.select(),
      },
    } satisfies Prisma.reddit_clone_post_snapshotsFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IRedditClonePostSnapshot> {
    return {
      id: input.id,
      title: input.title,
      postType: input.post_type,
      textContent: input.text_content ?? null,
      linkUrl: input.link_url ?? null,
      imageFileId: input.image_file_id ?? null,
      createdAt: input.created_at.toISOString(),
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
        preview: (() => {
          switch (input.post.post_type) {
            case "TEXT":
              return input.post.text?.body?.substring(0, 200) ?? "";
            case "LINK":
              return input.post.link?.url
                ? new URL(input.post.link.url).hostname
                : "";
            case "IMAGE":
              return input.post.postImage?.file_uri ?? "";
            default:
              return "";
          }
        })(),
      } satisfies IRedditClonePost.ISummary,
      member: await RedditCloneMemberAtSummaryTransformer.transform(
        input.member,
      ),
      community: await RedditCloneCommunityAtSummaryTransformer.transform(
        input.community,
      ),
    };
  }
}
