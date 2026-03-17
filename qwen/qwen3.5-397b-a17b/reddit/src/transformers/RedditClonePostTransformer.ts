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

export namespace RedditClonePostTransformer {
  export type Payload = Prisma.reddit_clone_postsGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        title: true,
        post_type: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
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
        snapshots: {
          select: {
            id: true,
          },
        } satisfies Prisma.reddit_clone_post_snapshotsFindManyArgs,
        comments: {
          select: {
            id: true,
          },
        } satisfies Prisma.reddit_clone_commentsFindManyArgs,
        commentSnapshots: {
          select: {
            id: true,
          },
        } satisfies Prisma.reddit_clone_comment_snapshotsFindManyArgs,
        reportOfPosts: {
          select: {
            id: true,
          },
        } satisfies Prisma.reddit_clone_report_of_postsFindManyArgs,
        _count: {
          select: {
            comments: true,
          },
        },
      },
    } satisfies Prisma.reddit_clone_postsFindManyArgs;
  }
  export async function transform(input: Payload): Promise<IRedditClonePost> {
    return {
      id: input.id,
      title: input.title,
      post_type: input.post_type,
      author: await RedditCloneMemberAtSummaryTransformer.transform(
        input.member,
      ),
      community: await RedditCloneCommunityAtSummaryTransformer.transform(
        input.community,
      ),
      vote_score: 0,
      comment_count: input._count.comments,
      body: input.text?.body ?? null,
      url: input.link?.url ?? null,
      file_uri: input.postImage?.file_uri ?? null,
      created_at: input.created_at.toISOString(),
      updated_at: input.updated_at.toISOString(),
      deleted_at: input.deleted_at?.toISOString() ?? null,
    };
  }
}
