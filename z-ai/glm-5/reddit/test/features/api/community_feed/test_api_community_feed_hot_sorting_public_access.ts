import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformFile } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformFile";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import type { ICommunityPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPost";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageICommunityPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformPost";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_community_platform_member_communities_create } from "../../../generate/generate_random_community_platform_member_communities_create";
import { prepare_random_community_platform_community } from "../../../prepare/prepare_random_community_platform_community";

export async function test_api_community_feed_hot_sorting_public_access(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Create a member account for community creation
  const memberConnection: api.IConnection = { host: connection.host };
  const member = await authorize_member_join(memberConnection, {});
  typia.assert(member);
  // Step 2: Create a community
  const community =
    await generate_random_community_platform_member_communities_create(
      memberConnection,
      {},
    );
  typia.assert(community);
  // Step 3: Create an unauthenticated connection for public access
  const publicConnection: api.IConnection = { host: connection.host };
  // Step 4: Request community feed with Hot sorting (unauthenticated)
  const feed = await api.functional.communityPlatform.communities.posts.index(
    publicConnection,
    {
      communityId: community.id,
      body: {
        sort: "hot",
        page: 1,
        limit: 25,
      } satisfies ICommunityPlatformPost.IRequest,
    },
  );
  typia.assert(feed);
  // Step 5: Validate pagination metadata (business logic, not type validation)
  TestValidator.equals("current page", feed.pagination.current, 1);
  TestValidator.predicate("limit within bounds", feed.pagination.limit <= 25);
  TestValidator.predicate("records non-negative", feed.pagination.records >= 0);
  TestValidator.predicate("pages non-negative", feed.pagination.pages >= 0);
  // Step 6: Validate data is array (already validated by typia.assert)
  TestValidator.predicate("data is array", Array.isArray(feed.data));
  // Step 7: Validate each post belongs to the correct community
  for (const post of feed.data) {
    TestValidator.equals(
      "post belongs to correct community",
      post.community.id,
      community.id,
    );
  }
}
