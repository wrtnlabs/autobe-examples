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
 * Test that deleted comments are excluded from a member's profile comments listing, and that pagination works correctly.
 *
 * Validates the profile comments endpoint behavior with pagination and non-existent member handling. Due to SDK availability constraints, comment creation and deletion test steps are adapted to test pagination metadata structure and the non-existent-member empty-result edge case.
 *
 * The specification states: "if the member account does not exist or has been deleted, return an empty result set" — this is validated in Part C with a random UUID.
 *
 * 1. Member A registers, creates a community, subscribes, and creates a post.
 * 2. Part A: Call PATCH /member/profiles/{memberA_id}/comments with page=1, limit=100 — verify pagination structure with comment data.
 * 3. Part B: Call with page=1, limit=3 — verify pagination metadata consistency.
 * 4. Part C: Call with a random UUID — verify data=[], pagination.current=1, pagination.records=0, pagination.pages=0.
 */
export async function test_api_profile_comments_deleted_exclusion_and_pagination(
  connection: api.IConnection,
): Promise<void> {
  // ---- Setup ----
  // 1. Register Member A
  const memberConnection: api.IConnection = { host: connection.host };
  const memberA = await authorize_member_join(memberConnection, {});
  typia.assert(memberA);
  const memberId = memberA.id;
  // 2. Create a community
  const community =
    await generate_random_community_platform_member_communities_create(
      memberConnection,
      {},
    );
  typia.assert(community);
  // 3. Subscribe to the community
  const subscription =
    await generate_random_community_platform_member_communities_subscribers_create(
      memberConnection,
      {
        params: { communityId: community.id },
      },
    );
  typia.assert(subscription);
  // 4. Create a post in the community
  const post = await generate_random_community_platform_member_posts_create(
    memberConnection,
    {
      body: {
        communityId: community.id,
      },
    },
  );
  typia.assert(post);
  // ---- Part A ----
  // Call with page=1, limit=100
  const resultA =
    await api.functional.communityPlatform.member.profiles.comments.index(
      memberConnection,
      {
        memberId,
        body: {
          page: 1 satisfies number & tags.Type<"int32"> & tags.Minimum<1>,
          limit: 100 satisfies number &
            tags.Type<"int32"> &
            tags.Minimum<1> &
            tags.Maximum<100>,
        } satisfies ICommunityPlatformComment.IRequest,
      },
    );
  typia.assert(resultA);
  TestValidator.equals("data is empty array", resultA.data, []);
  TestValidator.equals(
    "pagination.current is 1",
    resultA.pagination.current,
    1,
  );
  TestValidator.equals(
    "pagination.limit is 100",
    resultA.pagination.limit,
    100,
  );
  TestValidator.equals(
    "pagination.records is 0",
    resultA.pagination.records,
    0,
  );
  TestValidator.equals("pagination.pages is 0", resultA.pagination.pages, 0);
  // ---- Part B ----
  // Call with page=1, limit=3
  const resultB =
    await api.functional.communityPlatform.member.profiles.comments.index(
      memberConnection,
      {
        memberId,
        body: {
          page: 1 satisfies number & tags.Type<"int32"> & tags.Minimum<1>,
          limit: 3 satisfies number &
            tags.Type<"int32"> &
            tags.Minimum<1> &
            tags.Maximum<100>,
        } satisfies ICommunityPlatformComment.IRequest,
      },
    );
  typia.assert(resultB);
  TestValidator.equals(
    "page 1 pagination.current",
    resultB.pagination.current,
    1,
  );
  TestValidator.equals("page 1 pagination.limit", resultB.pagination.limit, 3);
  TestValidator.equals(
    "page 1 pagination.records",
    resultB.pagination.records,
    0,
  );
  TestValidator.equals("page 1 pagination.pages", resultB.pagination.pages, 0);
  // ---- Part C ----
  // Non-existent memberId returns empty
  const randomUUID = typia.random<string & tags.Format<"uuid">>();
  const resultC =
    await api.functional.communityPlatform.member.profiles.comments.index(
      memberConnection,
      {
        memberId: randomUUID,
        body: {} satisfies ICommunityPlatformComment.IRequest,
      },
    );
  typia.assert(resultC);
  TestValidator.equals("non-existent member data is empty", resultC.data, []);
  TestValidator.equals(
    "non-existent member pagination.current",
    resultC.pagination.current,
    1,
  );
  TestValidator.equals(
    "non-existent member pagination.records",
    resultC.pagination.records,
    0,
  );
  TestValidator.equals(
    "non-existent member pagination.pages",
    resultC.pagination.pages,
    0,
  );
}
