import api from "@ORGANIZATION/PROJECT-api";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IRedditCommunityComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityComment";
import type { IRedditCommunityCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunity";
import type { IRedditCommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityMember";
import type { IRedditCommunityPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityPost";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { prepare_random_reddit_community_comment } from "../prepare/prepare_random_reddit_community_comment";

/**
 * Generate a random Reddit community comment via the API for E2E testing.
 *
 * Creates a comment on the specified post using randomized comment data. The comment
 * is authored by the authenticated member from the session and appears as a top-level
 * comment in the post's comment thread.
 *
 * The prepare function generates realistic comment content using RandomGenerator.paragraph()
 * with 2 sentences of 5-15 words each. The reddit_community_comment_id is set to a random
 * UUID by default for reply scenarios, but the API treats this as a top-level comment
 * when creating via this endpoint.
 *
 * @param connection API connection configuration
 * @param props Optional customization for body data and required postId URL parameter
 * @returns The created comment entity with full metadata including id, author, content, and timestamps
 */
export async function generate_random_reddit_community_member_posts_comments_create(
  connection: api.IConnection,
  props: {
    body?: DeepPartial<IRedditCommunityComment.ICreate>;
    params: {
      postId: string;
    };
  },
): Promise<IRedditCommunityComment> {
  const prepared: IRedditCommunityComment.ICreate =
    prepare_random_reddit_community_comment(props.body);
  const result: IRedditCommunityComment =
    await api.functional.redditCommunity.member.posts.comments.create(
      connection,
      {
        postId: props.params.postId,
        body: prepared,
      },
    );
  return result;
}
