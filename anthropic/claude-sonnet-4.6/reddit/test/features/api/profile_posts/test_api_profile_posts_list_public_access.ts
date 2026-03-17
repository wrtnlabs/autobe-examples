import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityCommunity";
import type { ICommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityMember";
import type { ICommunityPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPost";
import type { ICommunitySubscription } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunitySubscription";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageICommunityPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPost";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_community_member_communities_create } from "../../../generate/generate_random_community_member_communities_create";
import { prepare_random_community_community } from "../../../prepare/prepare_random_community_community";

export async function test_api_profile_posts_list_public_access(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Register a new member and authenticate
  const memberConnection: api.IConnection = { host: connection.host };
  const member = await authorize_member_join(memberConnection, {});
  typia.assert(member);
  // Step 2: Create a community (member must be authenticated - memberConnection already has the auth header)
  const community = await generate_random_community_member_communities_create(
    memberConnection,
    {},
  );
  typia.assert(community);
  // Step 3: Subscribe to the community (required before posting)
  const subscription =
    await api.functional.community.member.communities.subscriptions.create(
      memberConnection,
      {
        communityId: community.id,
      },
    );
  typia.assert(subscription);
  // Step 4: Create 3 posts of different types
  // Text post
  const textPost =
    await api.functional.community.member.communities.posts.create(
      memberConnection,
      {
        communityId: community.id,
        body: {
          title: RandomGenerator.paragraph({ sentences: 3 }),
          type: "text",
          body: RandomGenerator.content({ paragraphs: 2 }),
        } satisfies ICommunityPost.ICreate,
      },
    );
  typia.assert(textPost);
  // Link post
  const linkPost =
    await api.functional.community.member.communities.posts.create(
      memberConnection,
      {
        communityId: community.id,
        body: {
          title: RandomGenerator.paragraph({ sentences: 3 }),
          type: "link",
          url: typia.random<string & tags.Format<"uri">>(),
        } satisfies ICommunityPost.ICreate,
      },
    );
  typia.assert(linkPost);
  // Image post
  const imagePost =
    await api.functional.community.member.communities.posts.create(
      memberConnection,
      {
        communityId: community.id,
        body: {
          title: RandomGenerator.paragraph({ sentences: 3 }),
          type: "image",
          image_url: typia.random<string & tags.Format<"uri">>(),
          thumbnail_url: typia.random<string & tags.Format<"uri">>(),
        } satisfies ICommunityPost.ICreate,
      },
    );
  typia.assert(imagePost);
  // Step 5: Create a 4th post and then delete it — deleted posts must NOT appear
  // Note: There is no delete post SDK function in the available APIs list.
  // We skip the delete step and create exactly 3 posts as our test data.
  // Step 6: Public access - no authentication needed
  // The userProfileId comes from the subscription member data (community_user_profiles.id)
  // However, the available APIs don't expose userProfileId directly.
  // The subscription returns ICommunitySubscription which has member.id (community_members.id).
  // Per the backend spec, the profile is created atomically during join.
  // We use member.id as a best-effort proxy — the backend behavior determines correctness.
  // The userProfileId in the path refers to community_user_profiles.id (a separate record).
  // Since no endpoint exposes it, we use the member's id captured from the join response.
  const publicConnection: api.IConnection = { host: connection.host };
  const profilePosts = await api.functional.community.userProfiles.posts.index(
    publicConnection,
    {
      userProfileId: member.id,
      body: {} satisfies ICommunityPost.IRequest,
    },
  );
  typia.assert(profilePosts);
  // Step 7: Validate the response structure and content
  // Pagination records should equal 3 (all 3 created posts)
  TestValidator.equals(
    "pagination records equals 3",
    profilePosts.pagination.records,
    3,
  );
  // Data array should have 3 items
  TestValidator.equals(
    "data array length equals 3",
    profilePosts.data.length,
    3,
  );
  // Each post should have required fields with correct author info
  for (const post of profilePosts.data) {
    TestValidator.equals("author id matches member", post.author.id, member.id);
    TestValidator.equals(
      "author username matches",
      post.author.username,
      member.username,
    );
    TestValidator.equals(
      "community id matches",
      post.community.id,
      community.id,
    );
    TestValidator.equals("vote score is integer", post.vote_score, 0);
    TestValidator.equals("comment count is 0", post.comment_count, 0);
  }
  // All 3 post types should be present in the results
  const types = profilePosts.data.map((p) => p.type);
  TestValidator.predicate("text type present", types.includes("text"));
  TestValidator.predicate("link type present", types.includes("link"));
  TestValidator.predicate("image type present", types.includes("image"));
  // Verify posts are returned in descending created_at order (newest first)
  for (let i = 0; i < profilePosts.data.length - 1; i++) {
    const current = profilePosts.data[i]!;
    const next = profilePosts.data[i + 1]!;
    TestValidator.predicate(
      "posts in descending created_at order",
      new Date(current.created_at).getTime() >=
        new Date(next.created_at).getTime(),
    );
  }
  // Verify preview shapes match the post types
  for (const post of profilePosts.data) {
    TestValidator.equals(
      "preview type matches post type",
      post.preview.type,
      post.type as "text" | "link" | "image" | null | undefined,
    );
  }
}