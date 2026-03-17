import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdmin";
import type { ICommunityPlatformComment } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformComment";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformFile } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformFile";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import type { ICommunityPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPost";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformCommunity";
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

export async function test_api_communities_browsing_default(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create member account for community ownership
  const memberConnection: api.IConnection = { host: connection.host };
  const member = await authorize_member_join(memberConnection, {});
  typia.assert(member);
  // 2. Create 2-3 distinct communities with random data
  const communities: ICommunityPlatformCommunity[] = [];
  for (let i = 0; i < 3; i++) {
    const community =
      await generate_random_community_platform_member_communities_create(
        memberConnection,
        {
          body: {
            name: RandomGenerator.alphaNumeric(10).toLowerCase(),
            description: RandomGenerator.paragraph({ sentences: 2 }),
          },
        },
      );
    typia.assert(community);
    communities.push(community);
  }
  // 3. Call community listing endpoint with empty/default request body
  const page = await api.functional.communityPlatform.communities.index(
    connection, // base connection - no auth required for browsing
    {
      body: {} satisfies ICommunityPlatformCommunity.IRequest,
    },
  );
  typia.assert(page);
  // 4. Validate pagination metadata
  TestValidator.equals("current page should be 1", page.pagination.current, 1);
  TestValidator.predicate(
    "limit should be positive default",
    page.pagination.limit > 0,
  );
  TestValidator.equals(
    "records should include created communities",
    page.pagination.records >= communities.length,
    true,
  );
  TestValidator.equals(
    "pages should be calculated correctly",
    page.pagination.pages,
    Math.ceil(page.pagination.records / page.pagination.limit),
  );
  // 5. Verify each community includes required fields
  for (const summary of page.data) {
    typia.assert(summary);
    TestValidator.predicate(
      `community ${summary.id} should have UUID id`,
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
        summary.id,
      ),
    );
    TestValidator.predicate(
      `community ${summary.id} should have name`,
      summary.name.length > 0,
    );
    // description can be null
    typia.assert(summary.owner);
    TestValidator.equals(
      `community ${summary.id} should have subscriber_count 0 for new communities`,
      summary.subscriber_count,
      0,
    );
  }
  // 6. Ensure communities are sorted by created_at descending (newest first)
  for (let i = 1; i < page.data.length; i++) {
    const current = new Date(page.data[i].created_at).getTime();
    const previous = new Date(page.data[i - 1].created_at).getTime();
    TestValidator.predicate(
      `communities should be sorted by created_at descending at index ${i}`,
      previous >= current,
    );
  }
  // 7. Confirm only active communities (not deleted) are returned
  // We need to fetch full community objects to check deleted_at
  const createdCommunityIds = communities.map((c) => c.id);
  const matchingSummaries = page.data.filter((summary) =>
    createdCommunityIds.includes(summary.id),
  );
  // For our created communities, verify they exist in the listing
  TestValidator.equals(
    "created communities should appear in listing",
    matchingSummaries.length,
    communities.length,
  );
  // Additional validation: Ensure our created communities have the expected data
  for (const community of communities) {
    const summary = page.data.find((s) => s.id === community.id);
    TestValidator.predicate(
      `community ${community.id} should be in listing`,
      summary !== undefined,
    );
    if (summary) {
      TestValidator.equals(
        `community ${community.id} name matches`,
        summary.name,
        community.name,
      );
      TestValidator.equals(
        `community ${community.id} description matches`,
        summary.description,
        community.description,
      );
      TestValidator.equals(
        `community ${community.id} owner id matches`,
        summary.owner.id,
        member.id,
      );
    }
  }
}
