import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformComment } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformComment";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformCommunityImage } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunityImage";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import type { ICommunityPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPost";
import type { ICommunityPlatformProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformProfile";
import type { ICommunityPlatformSubscription } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformSubscription";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageICommunityPlatformComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformComment";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_community_platform_member_communities_create } from "../../../generate/generate_random_community_platform_member_communities_create";
import { generate_random_community_platform_member_communities_subscribers_create } from "../../../generate/generate_random_community_platform_member_communities_subscribers_create";
import { generate_random_community_platform_member_posts_create } from "../../../generate/generate_random_community_platform_member_posts_create";
import { prepare_random_community_platform_community } from "../../../prepare/prepare_random_community_platform_community";
import { prepare_random_community_platform_community_image } from "../../../prepare/prepare_random_community_platform_community_image";
import { prepare_random_community_platform_post } from "../../../prepare/prepare_random_community_platform_post";
import { prepare_random_community_platform_subscription } from "../../../prepare/prepare_random_community_platform_subscription";

/**
 * Test that all three comment sort modes (best, new, controversial) are accepted by the member profile comments listing endpoint.
 *
 * Validates the structural integrity and correct API handling of the profile comments endpoint under each sort mode. Since the comment creation and voting APIs are not available in this SDK, the test focuses on ensuring the endpoint accepts each sort mode parameter correctly and returns a valid paginated response structure.
 *
 * The test sets up two member accounts, a community with a text post, then queries the profile comments endpoint with each sort mode, verifying that the paginated response structure conforms to expectations.
 *
 * 1. Register Member A (the comment author) via `authorize_member_join`.
 * 2. Register Member B (an additional member) via `authorize_member_join`.
 * 3. Member A creates a community.
 * 4. Member A subscribes to the community (prerequisite for posting).
 * 5. Member A creates a text post in the community.
 * 6. Fetch Member A&#39;s profile comments with `sort: &quot;best&quot;`, validate response.
 * 7. Fetch Member A&#39;s profile comments with `sort: &quot;new&quot;`, validate response.
 * 8. Fetch Member A&#39;s profile comments with `sort: &quot;controversial&quot;`, validate response.
 * 9. Validate pagination metadata is consistent across all three calls.
 */
export async function test_api_profile_comments_sort_modes(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register Member A (comment author)
  const memberAConnection: api.IConnection = { host: connection.host };
  const memberA = await authorize_member_join(memberAConnection, {});
  typia.assert(memberA);
  // 2. Register Member B
  const memberBConnection: api.IConnection = { host: connection.host };
  const memberB = await authorize_member_join(memberBConnection, {});
  typia.assert(memberB);
  // 3. Member A creates a community
  const community =
    await generate_random_community_platform_member_communities_create(
      memberAConnection,
      {},
    );
  typia.assert(community);
  // 4. Member A subscribes to the community
  const subscription =
    await generate_random_community_platform_member_communities_subscribers_create(
      memberAConnection,
      {
        params: { communityId: community.id },
      },
    );
  typia.assert(subscription);
  // 5. Member A creates a text post in the community
  const post = await generate_random_community_platform_member_posts_create(
    memberAConnection,
    {
      body: {
        communityId: community.id,
        type: "text",
      } as DeepPartial<ICommunityPlatformPost.ICreate>,
    },
  );
  typia.assert(post);
  // 6. Fetch with sort='best'
  const bestResult =
    await api.functional.communityPlatform.member.profiles.comments.index(
      memberAConnection,
      {
        memberId: memberA.id,
        body: {
          sort: "best",
          page: 1,
          limit: 10,
        } satisfies ICommunityPlatformComment.IRequest,
      },
    );
  typia.assert(bestResult);
  // 7. Fetch with sort='new'
  const newResult =
    await api.functional.communityPlatform.member.profiles.comments.index(
      memberAConnection,
      {
        memberId: memberA.id,
        body: {
          sort: "new",
          page: 1,
          limit: 10,
        } satisfies ICommunityPlatformComment.IRequest,
      },
    );
  typia.assert(newResult);
  // 8. Fetch with sort='controversial'
  const controversialResult =
    await api.functional.communityPlatform.member.profiles.comments.index(
      memberAConnection,
      {
        memberId: memberA.id,
        body: {
          sort: "controversial",
          page: 1,
          limit: 10,
        } satisfies ICommunityPlatformComment.IRequest,
      },
    );
  typia.assert(controversialResult);
  // 9. Validate pagination metadata is consistent across all three calls
  TestValidator.equals(
    "pagination page same across sorts",
    bestResult.pagination.current,
    newResult.pagination.current,
  );
  TestValidator.equals(
    "pagination limit same across sorts",
    bestResult.pagination.limit,
    newResult.pagination.limit,
  );
  TestValidator.equals(
    "pagination records same across sorts",
    bestResult.pagination.records,
    controversialResult.pagination.records,
  );
}
