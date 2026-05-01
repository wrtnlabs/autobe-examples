import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityHubComment } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityHubComment";
import type { ICommunityHubCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityHubCommunity";
import type { ICommunityHubCommunitySubscription } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityHubCommunitySubscription";
import type { ICommunityHubMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityHubMember";
import type { ICommunityHubPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityHubPost";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageICommunityHubCommunitySubscription } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityHubCommunitySubscription";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_community_hub_member_communities_create } from "../../../generate/generate_random_community_hub_member_communities_create";
import { prepare_random_community_hub_community } from "../../../prepare/prepare_random_community_hub_community";

/**
 * Test community subscriptions listing with pagination support.
 *
 * Verifies that listing subscribers for a community returns correctly paginated results with complete member profile details and subscription timestamps. The test creates a community with three subscribers to ensure pagination works across multiple pages.
 *
 * 1. Community owner registers, creates a community, and subscribes to it.
 * 2. Two additional members register and each subscribe to the same community.
 * 3. Page 1 is retrieved with limit=2, validating pagination metadata and that each subscription record belongs to the target community.
 * 4. Subscriptions are validated for descending chronological order (newest first).
 * 5. Page 2 is retrieved with limit=2, verifying the remaining subscription and consistent pagination data.
 */
export async function test_api_community_subscriptions_list_with_pagination(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create community owner
  const ownerConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(ownerConnection, {});
  // 2. Create community
  const community =
    await generate_random_community_hub_member_communities_create(
      ownerConnection,
      {},
    );
  typia.assert(community);
  // 3. Owner subscribes to own community
  await api.functional.communityHub.member.communities.subscriptions.create(
    ownerConnection,
    { communityName: community.name },
  );
  // 4. Second member joins and subscribes
  const member2Connection: api.IConnection = { host: connection.host };
  await authorize_member_join(member2Connection, {});
  await api.functional.communityHub.member.communities.subscriptions.create(
    member2Connection,
    { communityName: community.name },
  );
  // 5. Third member joins and subscribes
  const member3Connection: api.IConnection = { host: connection.host };
  await authorize_member_join(member3Connection, {});
  await api.functional.communityHub.member.communities.subscriptions.create(
    member3Connection,
    { communityName: community.name },
  );
  // 6. List subscriptions - page 1 with limit=2
  const page1 =
    await api.functional.communityHub.communities.subscriptions.index(
      connection,
      {
        communityName: community.name,
        body: {
          page: 1,
          limit: 2,
        } satisfies ICommunityHubCommunitySubscription.IRequest,
      },
    );
  typia.assert(page1);
  // 7. Validate pagination metadata
  TestValidator.equals(
    "pagination current page 1",
    page1.pagination.current,
    1,
  );
  TestValidator.equals("pagination limit 2", page1.pagination.limit, 2);
  TestValidator.equals(
    "pagination total records 3",
    page1.pagination.records,
    3,
  );
  TestValidator.equals("pagination total pages 2", page1.pagination.pages, 2);
  TestValidator.equals("page1 data length", page1.data.length, 2);
  // 8. Validate subscription records belong to the community
  for (const sub of page1.data) {
    TestValidator.equals(
      "subscription community name",
      sub.community.name,
      community.name,
    );
  }
  // 9. Validate descending chronological order (newest first)
  for (let i = 0; i < page1.data.length - 1; i++) {
    TestValidator.predicate(
      "subscriptions sorted by created_at descending",
      new Date(page1.data[i].created_at).getTime() >=
        new Date(page1.data[i + 1].created_at).getTime(),
    );
  }
  // 10. Page 2
  const page2 =
    await api.functional.communityHub.communities.subscriptions.index(
      connection,
      {
        communityName: community.name,
        body: {
          page: 2,
          limit: 2,
        } satisfies ICommunityHubCommunitySubscription.IRequest,
      },
    );
  typia.assert(page2);
  // 11. Validate page 2 pagination
  TestValidator.equals("page2 current page", page2.pagination.current, 2);
  TestValidator.equals("page2 limit", page2.pagination.limit, 2);
  TestValidator.equals("page2 total records", page2.pagination.records, 3);
  TestValidator.equals("page2 total pages", page2.pagination.pages, 2);
  TestValidator.equals("page2 data length", page2.data.length, 1);
}
