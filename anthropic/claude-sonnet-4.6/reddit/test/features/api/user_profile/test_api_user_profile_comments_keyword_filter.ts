import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityComment } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityComment";
import type { ICommunityCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityCommunity";
import type { ICommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityMember";
import type { ICommunityPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPost";
import type { ICommunitySubscription } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunitySubscription";
import type { ICommunityUserProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityUserProfile";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageICommunityComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityComment";
import type { IPageICommunityUserProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityUserProfile";
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

export async function test_api_user_profile_comments_keyword_filter(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Register a member and get authenticated connection
  const memberConnection: api.IConnection = { host: connection.host };
  const memberAuth = await authorize_member_join(memberConnection, {});
  typia.assert(memberAuth);
  // Step 2: Create a community using the utility function
  const community = await generate_random_community_member_communities_create(
    memberConnection,
    {},
  );
  typia.assert(community);
  // Step 3: Subscribe the member to the community
  const subscription =
    await api.functional.community.member.communities.subscriptions.create(
      memberConnection,
      { communityId: community.id },
    );
  typia.assert(subscription);
  // Step 4: Create a post in the community
  const post = await api.functional.community.member.communities.posts.create(
    memberConnection,
    {
      communityId: community.id,
      body: {
        title: RandomGenerator.paragraph({ sentences: 3 }),
        type: "text",
        body: RandomGenerator.paragraph({ sentences: 5 }),
      } satisfies ICommunityPost.ICreate,
    },
  );
  typia.assert(post);
  // Step 5: Create two comments with distinct content using unique keywords
  const keyword1 = "uniquekeyword123";
  const keyword2 = "anotherword456xyz";
  const comment1 = await generate_random_community_member_posts_comments_create(
    memberConnection,
    {
      params: { postId: post.id },
      body: {
        content: `This comment contains the special ${keyword1} search term for testing`,
      },
    },
  );
  typia.assert(comment1);
  const comment2 = await generate_random_community_member_posts_comments_create(
    memberConnection,
    {
      params: { postId: post.id },
      body: {
        content: `This is a completely different comment with ${keyword2} content`,
      },
    },
  );
  typia.assert(comment2);
  // Step 6: Retrieve the userProfileId for the registered member
  const publicConnection: api.IConnection = { host: connection.host };
  const profilesPage = await api.functional.community.userProfiles.index(
    publicConnection,
    {
      body: {
        search: memberAuth.username,
      } satisfies ICommunityUserProfile.IRequest,
    },
  );
  typia.assert(profilesPage);
  const userProfile = profilesPage.data.find(
    (p) => p.username === memberAuth.username,
  );
  TestValidator.predicate("user profile found", userProfile !== undefined);
  const userProfileId = userProfile!.id;
  // Step 7: Test keyword1 filter — should return only comment1
  const resultKeyword1 =
    await api.functional.community.userProfiles.comments.index(
      publicConnection,
      {
        userProfileId,
        body: {
          keyword: keyword1,
        } satisfies ICommunityComment.IRequest,
      },
    );
  typia.assert(resultKeyword1);
  TestValidator.equals(
    "keyword1 filter returns exactly 1 comment",
    resultKeyword1.pagination.records,
    1,
  );
  TestValidator.predicate(
    "keyword1 result content contains keyword",
    resultKeyword1.data[0]!.content.toLowerCase().includes(
      keyword1.toLowerCase(),
    ),
  );
  TestValidator.predicate(
    "comment2 not in keyword1 results",
    !resultKeyword1.data.some((c) => c.id === comment2.id),
  );
  // Step 8: Test keyword2 filter — should return only comment2
  const resultKeyword2 =
    await api.functional.community.userProfiles.comments.index(
      publicConnection,
      {
        userProfileId,
        body: {
          keyword: keyword2,
        } satisfies ICommunityComment.IRequest,
      },
    );
  typia.assert(resultKeyword2);
  TestValidator.equals(
    "keyword2 filter returns exactly 1 comment",
    resultKeyword2.pagination.records,
    1,
  );
  TestValidator.predicate(
    "keyword2 result content contains keyword",
    resultKeyword2.data[0]!.content.toLowerCase().includes(
      keyword2.toLowerCase(),
    ),
  );
  // Step 9: Test with no keyword filter — should return both comments
  const resultNoFilter =
    await api.functional.community.userProfiles.comments.index(
      publicConnection,
      {
        userProfileId,
        body: {} satisfies ICommunityComment.IRequest,
      },
    );
  typia.assert(resultNoFilter);
  TestValidator.equals(
    "no filter returns both comments",
    resultNoFilter.pagination.records,
    2,
  );
  // Step 10: Test case-insensitive search — uppercase keyword1 should match comment1
  const resultCaseInsensitive =
    await api.functional.community.userProfiles.comments.index(
      publicConnection,
      {
        userProfileId,
        body: {
          keyword: keyword1.toUpperCase(),
        } satisfies ICommunityComment.IRequest,
      },
    );
  typia.assert(resultCaseInsensitive);
  TestValidator.equals(
    "case-insensitive filter returns 1 comment",
    resultCaseInsensitive.pagination.records,
    1,
  );
  // Step 11: Test non-matching keyword — should return empty results
  const resultNoMatch =
    await api.functional.community.userProfiles.comments.index(
      publicConnection,
      {
        userProfileId,
        body: {
          keyword: "zzznomatch99999totally",
        } satisfies ICommunityComment.IRequest,
      },
    );
  typia.assert(resultNoMatch);
  TestValidator.equals(
    "non-matching keyword returns 0 comments",
    resultNoMatch.pagination.records,
    0,
  );
}
