import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityHubComment } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityHubComment";
import type { ICommunityHubCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityHubCommunity";
import type { ICommunityHubMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityHubMember";
import type { ICommunityHubPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityHubPost";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { prepare_random_community_hub_comment } from "../prepare/prepare_random_community_hub_comment";

/**
 * Generate a random community hub comment on a specified post via the API for E2E testing.
 *
 * Prepares random comment data using the prepare function, then calls the comment creation endpoint
 * to create a new top-level comment on the post identified by postId. The comment is placed at depth
 * zero in the conversation tree with no parent comment, and its vote score begins at zero.
 *
 * Authentication is required — only registered members can create comments. The post must exist
 * and be active (not soft-deleted). If the authenticated member has been banned from the community
 * that owns the post, the request will be rejected with a 403 status.
 *
 * @param connection API connection with required authentication headers
 * @param props.body Optional partial comment data to override randomly generated defaults. The
 *                   content field can be customized; all other fields (id, depth, vote score,
 *                   timestamps) are determined server-side.
 * @param props.params.postId The unique identifier of the post to create the comment on
 * @returns The newly created comment with generated id, depth (zero), vote score (zero), author
 *          metadata, post summary, and timestamps
 */
export async function generate_random_community_hub_posts_comments_create(
  connection: api.IConnection,
  props: {
    body?: DeepPartial<ICommunityHubComment.ICreate> | undefined;
    params: {
      postId: string;
    };
  },
): Promise<ICommunityHubComment> {
  const prepared: ICommunityHubComment.ICreate =
    prepare_random_community_hub_comment(props.body);
  return await api.functional.communityHub.posts.comments.create(connection, {
    body: prepared,
    postId: props.params.postId,
  });
}
