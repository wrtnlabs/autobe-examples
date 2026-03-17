import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IRedditCommunityCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunity";
import { IRedditCommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityMember";
import { IRedditCommunityPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityPost";
import { IRedditCommunityPostSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityPostSnapshot";
import { IRedditCommunityUserProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityUserProfile";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import typia, { tags } from "typia";

import { toISOStringSafe } from "../utils/toISOStringSafe";
import { RedditCommunityMemberAtSummaryTransformer } from "./RedditCommunityMemberAtSummaryTransformer";

export namespace RedditCommunityPostSnapshotTransformer {
  export type Payload = Prisma.reddit_community_post_snapshotsGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        title: true,
        post_type: true,
        text_body: true,
        link_url: true,
        image_file_id: true,
        vote_score: true,
        comment_count: true,
        created_at: true,
        post: {
          select: {
            id: true,
            title: true,
            post_type: true,
            vote_score: true,
            comment_count: true,
            created_at: true,
            author: {
              select: {
                id: true,
                username: true,
                created_at: true,
              },
            },
            community: {
              select: {
                id: true,
                name: true,
                subscriber_count: true,
                owner: {
                  select: {
                    id: true,
                    username: true,
                    created_at: true,
                  },
                },
                description: true,
                created_at: true,
                updated_at: true,
                deleted_at: true,
              },
            },
          },
        },
        editedByMember: RedditCommunityMemberAtSummaryTransformer.select(),
      },
    } satisfies Prisma.reddit_community_post_snapshotsFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IRedditCommunityPostSnapshot> {
    const community: IRedditCommunityCommunity.ISummary = {
      id: input.post.community.id,
      name: input.post.community.name,
      description: input.post.community.description ?? null,
      subscriber_count: input.post.community.subscriber_count,
      owner: {
        id: input.post.community.owner.id,
        username: input.post.community.owner.username,
        created_at: input.post.community.owner.created_at.toISOString(),
      },
      created_at: input.post.community.created_at.toISOString(),
      updated_at: input.post.community.updated_at.toISOString(),
      deleted_at: input.post.community.deleted_at
        ? input.post.community.deleted_at.toISOString()
        : null,
    } satisfies IRedditCommunityCommunity.ISummary;
    const post: IRedditCommunityPost.ISummary = {
      id: input.post.id,
      title: input.post.title,
      author: {
        id: input.post.author.id,
        username: input.post.author.username,
        created_at: input.post.author.created_at.toISOString(),
      },
      community: community,
      vote_score: input.post.vote_score,
      comment_count: input.post.comment_count,
      created_at: input.post.created_at.toISOString(),
      post_type: input.post.post_type as "text" | "link" | "image",
      preview_content: null,
    } satisfies IRedditCommunityPost.ISummary;
    return {
      id: input.id,
      redditCommunityPostId: input.post.id,
      editedByMember: await RedditCommunityMemberAtSummaryTransformer.transform(
        input.editedByMember,
      ),
      title: input.title,
      postType: input.post_type,
      textBody: input.text_body ?? null,
      linkUrl: input.link_url ?? null,
      imageFileId: input.image_file_id ?? null,
      voteScore: input.vote_score,
      commentCount: input.comment_count,
      createdAt: input.created_at.toISOString(),
      post: post,
    };
  }
}
