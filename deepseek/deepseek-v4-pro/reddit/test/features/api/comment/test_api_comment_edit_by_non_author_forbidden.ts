import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityHubComment } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityHubComment";
import type { ICommunityHubCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityHubCommunity";
import type { ICommunityHubCommunitySubscription } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityHubCommunitySubscription";
import type { ICommunityHubMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityHubMember";
import type { ICommunityHubPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityHubPost";
import type { ICommunityHubPostImage } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityHubPostImage";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_community_hub_communities_posts_create } from "../../../generate/generate_random_community_hub_communities_posts_create";
import { generate_random_community_hub_member_communities_create } from "../../../generate/generate_random_community_hub_member_communities_create";
import { generate_random_community_hub_posts_comments_create } from "../../../generate/generate_random_community_hub_posts_comments_create";
import { prepare_random_community_hub_comment } from "../../../prepare/prepare_random_community_hub_comment";
import { prepare_random_community_hub_community } from "../../../prepare/prepare_random_community_hub_community";
import { prepare_random_community_hub_post } from "../../../prepare/prepare_random_community_hub_post";

/**
 * Test that a non-author member is forbidden from editing another member's comment.
 *
 * Verifies the authorization boundary for the comment editing endpoint: only
 * the original author may modify their comment's content through the PATCH
 * operation. When a different authenticated member attempts to edit a comment
 * they did not write, the server must reject the request with HTTP 403
 * Forbidden, regardless of whether the submitted content body is valid.
 *
 * The authorization check happens before content validation in the server's
 * processing pipeline, so the request is denied solely on the basis of member
 * identity mismatch between the authenticated session and the comment's
 * original author.
 *
 * 1. Author member joins the platform, creates a community, subscribes to it,
 *    creates a text post, and writes a top-level comment.
 * 2. A different second member joins the platform.
 * 3. The second member attempts to edit the author's comment via PATCH.
 * 4. The server rejects the request with 403 Forbidden.
 */
export async function test_api_comment_edit_by_non_author_forbidden(
  connection: api.IConnection,
): Promise<void> {
  // 1. Author setup
  const authorConnection: api.IConnection = { host: connection.host };
  const author = await authorize_member_join(authorConnection, {});
  typia.assert(author);
  const community =
    await generate_random_community_hub_member_communities_create(
      authorConnection,
      {},
    );
  typia.assert(community);
  await api.functional.communityHub.member.communities.subscriptions.create(
    authorConnection,
    { communityName: community.name },
  );
  const post = await generate_random_community_hub_communities_posts_create(
    authorConnection,
    { params: { communityName: community.name } },
  );
  typia.assert(post);
  const comment = await generate_random_community_hub_posts_comments_create(
    authorConnection,
    { params: { postId: post.id } },
  );
  typia.assert(comment);
  // 2. Different member setup
  const otherConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(otherConnection, {});
  // 3. Attempt edit as non-author — expect 403
  await TestValidator.httpError(
    "non-author cannot edit another member's comment",
    403,
    async () => {
      await api.functional.communityHub.comments.update(otherConnection, {
        commentId: comment.id,
        body: {
          content: RandomGenerator.paragraph({ sentences: 3 }),
        } satisfies ICommunityHubComment.IUpdate,
      });
    },
  );
}
