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
 * Generate a random comment on an existing post via the API for E2E testing.
 *
 * Prepares random comment data using the prepare function, then calls the creation endpoint
 * with the specified post ID. The comment will be associated with the authenticated user
 * and the target post specified by postId.
 */
export async function generate_random_reddit_community_member_posts_comments_create(
  connection: api.IConnection,
  props: {
    body?: DeepPartial<IRedditCommunityComment.ICreate> | undefined;
    params: {
      postId: string;
    };
  },
): Promise<IRedditCommunityComment> {
  const prepared: IRedditCommunityComment.ICreate =
    prepare_random_reddit_community_comment(props.body);
  return await api.functional.redditCommunity.member.posts.comments.create(
    connection,
    {
      body: prepared,
      postId: props.params.postId,
    },
  );
}
