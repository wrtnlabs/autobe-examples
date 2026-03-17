import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityComment } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityComment";
import type { ICommunityCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityCommunity";
import type { ICommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityMember";
import type { ICommunityPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPost";
import type { ICommunitySubscription } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunitySubscription";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageICommunityComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityComment";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_community_member_communities_create } from "../../../generate/generate_random_community_member_communities_create";
import { generate_random_community_member_posts_comments_create } from "../../../generate/generate_random_community_member_posts_comments_create";
import { prepare_random_community_comment } from "../../../prepare/prepare_random_community_comment";
import { prepare_random_community_community } from "../../../prepare/prepare_random_community_community";

export async function test_api_post_comments_listing_default_sort(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register a new member and create actor-specific connection
  const memberConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberConnection, {});
  // 2. Create a community using utility function
  const community = await generate_random_community_member_communities_create(
    memberConnection,
    {},
  );
  typia.assert(community);
  // 3. Subscribe to the community (prerequisite for posting)
  const subscription =
    await api.functional.community.member.communities.subscriptions.create(
      memberConnection,
      { communityId: community.id },
    );
  typia.assert(subscription);
  // 4. Create a text post in the community
  const post = await api.functional.community.member.communities.posts.create(
    memberConnection,
    {
      communityId: community.id,
      body: {
        title: RandomGenerator.paragraph({ sentences: 3 }),
        type: "text",
        body: RandomGenerator.content({ paragraphs: 1 }),
      } satisfies ICommunityPost.ICreate,
    },
  );
  typia.assert(post);
  // 5. Create 3 comments on the post using utility function
  const comments = await ArrayUtil.asyncRepeat(3, async () => {
    const comment =
      await generate_random_community_member_posts_comments_create(
        memberConnection,
        {
          params: { postId: post.id },
        },
      );
    typia.assert(comment);
    return comment;
  });
  // 6. Retrieve comments anonymously (no auth required)
  const anonConnection: api.IConnection = { host: connection.host };
  const page = await api.functional.community.posts.comments.index(
    anonConnection,
    {
      postId: post.id,
      body: {} satisfies ICommunityComment.IRequest,
    },
  );
  typia.assert(page);
  // 7. Validate pagination structure
  TestValidator.predicate(
    "pagination current >= 1",
    page.pagination.current >= 1,
  );
  TestValidator.predicate("pagination limit >= 1", page.pagination.limit >= 1);
  TestValidator.predicate(
    "pagination records >= 3",
    page.pagination.records >= 3,
  );
  TestValidator.predicate("pagination pages >= 1", page.pagination.pages >= 1);
  // 8. Validate data array has at least 3 comments
  TestValidator.predicate(
    "data array has at least 3 comments",
    page.data.length >= 3,
  );
  // 9. Validate each comment belongs to the correct post and has valid structure
  for (const comment of page.data) {
    TestValidator.equals(
      "comment belongs to correct post",
      comment.post.id,
      post.id,
    );
    TestValidator.predicate(
      "comment content is non-empty",
      comment.content.length > 0,
    );
  }
  // 10. Edge case: verify 404 for non-existent postId
  await TestValidator.httpError(
    "non-existent postId returns 404",
    404,
    async () => {
      await api.functional.community.posts.comments.index(anonConnection, {
        postId: typia.random<string & tags.Format<"uuid">>(),
        body: {} satisfies ICommunityComment.IRequest,
      });
    },
  );
}
