import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformComment } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformComment";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformCommunityMembership } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunityMembership";
import type { ICommunityPlatformMemberuser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMemberuser";
import type { ICommunityPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPost";

/**
 * Validate that a non-member of a community cannot comment on a post belonging
 * to that community.
 *
 * Business flow covered by this test:
 *
 * 1. Member A joins the platform (auth.memberUser.join) and becomes an
 *    authenticated memberUser.
 * 2. Member A creates a community using
 *    communityPlatform.memberUser.communities.create.
 * 3. Member A creates a membership for that community via
 *    communityPlatform.memberUser.communities.memberships.create, ensuring they
 *    are an approved member of the community.
 * 4. Member A creates a post in that community using
 *    communityPlatform.memberUser.posts.create.
 * 5. Member B joins the platform (auth.memberUser.join) and becomes another
 *    authenticated memberUser, but does NOT join the community.
 * 6. While authenticated as Member B, attempt to create a comment on the post
 *    created by Member A using
 *    communityPlatform.memberUser.posts.comments.create.
 * 7. Assert that the comment creation fails with an error, proving that community
 *    membership is required to comment on posts in that community.
 */
export async function test_api_comment_creation_rejected_for_non_member_of_community(
  connection: api.IConnection,
) {
  // 1. Member A joins the platform
  const memberAJoinBody = typia.random<ICommunityPlatformMemberuser.IJoin>();
  const memberA: ICommunityPlatformMemberuser.IAuthorized =
    await api.functional.auth.memberUser.join(connection, {
      body: memberAJoinBody,
    });
  typia.assert(memberA);

  // 2. Member A creates a community
  const communityCreateBody =
    typia.random<ICommunityPlatformCommunity.ICreate>();
  const community: ICommunityPlatformCommunity =
    await api.functional.communityPlatform.memberUser.communities.create(
      connection,
      {
        body: communityCreateBody,
      },
    );
  typia.assert(community);

  // 3. Member A creates a membership for that community
  const membershipCreateBody =
    typia.random<ICommunityPlatformCommunityMembership.ICreate>();
  const membership: ICommunityPlatformCommunityMembership =
    await api.functional.communityPlatform.memberUser.communities.memberships.create(
      connection,
      {
        communitySlug: community.slug,
        body: membershipCreateBody,
      },
    );
  typia.assert(membership);

  // 4. Member A creates a post in that community
  const postCreateBody = {
    communityId: community.id,
    communityCode: community.slug,
    title: RandomGenerator.paragraph({ sentences: 3 }),
    body: RandomGenerator.paragraph({ sentences: 8 }),
    url: undefined,
    postType: "text",
  } satisfies ICommunityPlatformPost.ICreate;

  const post: ICommunityPlatformPost =
    await api.functional.communityPlatform.memberUser.posts.create(connection, {
      body: postCreateBody,
    });
  typia.assert(post);

  // Sanity check: Post is linked to the expected community
  TestValidator.equals(
    "post should belong to created community",
    post.community_id,
    community.id,
  );

  // 5. Member B joins the platform (new authenticated context)
  const memberBJoinBody = typia.random<ICommunityPlatformMemberuser.IJoin>();
  const memberB: ICommunityPlatformMemberuser.IAuthorized =
    await api.functional.auth.memberUser.join(connection, {
      body: memberBJoinBody,
    });
  typia.assert(memberB);

  // 6. As Member B (non-member of the community), attempt to create a comment
  const forbiddenCommentBody = {
    content: RandomGenerator.paragraph({ sentences: 4 }),
  } satisfies ICommunityPlatformComment.ICreate;

  await TestValidator.error(
    "non-member should not be able to create a comment on community post",
    async () => {
      await api.functional.communityPlatform.memberUser.posts.comments.create(
        connection,
        {
          postId: post.id,
          body: forbiddenCommentBody,
        },
      );
    },
  );
}
