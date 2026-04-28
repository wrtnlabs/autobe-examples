import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIRedditLikeCommunityCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditLikeCommunityCommunity";
import type { IREdditLikeCommunityCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IREdditLikeCommunityCommunity";
import type { IREdditLikeCommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IREdditLikeCommunityMember";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_reddit_like_community_member_communities_create } from "../../../generate/generate_random_reddit_like_community_member_communities_create";
import { prepare_random_reddit_like_community_community } from "../../../prepare/prepare_random_reddit_like_community_community";

/**
 * Test paginated listing of active communities accessible to guests.
 *
 * Validates the community browsing endpoint returns correctly paginated results with proper metadata and complete community summaries. Creates multiple test communities through an authenticated member, then accesses the unauthenticated guest endpoint to verify pagination behavior and data integrity.
 *
 * 1. Register member account for test data setup.
 * 2. Create multiple communities.
 * 3. Query community profiles page 1 with limit 3 as guest.
 * 4. Validate pagination metadata and community summaries on first page.
 * 5. Query page 2 to verify pagination.
 */
export async function test_api_community_list_active_pagination(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register member account for test data setup
  const memberConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      username: RandomGenerator.name(1),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  // 2. Create multiple communities
  const communities: IREdditLikeCommunityCommunity[] = [];
  for (let i = 0; i < 5; i++) {
    const community =
      await generate_random_reddit_like_community_member_communities_create(
        memberConnection,
        {
          body: {
            name: RandomGenerator.name(1) + `-community-${i}`,
            description: RandomGenerator.paragraph({ sentences: 3 }),
          },
        },
      );
    communities.push(community);
  }
  // 3. Query community profiles page 1 with limit 3 as guest
  const guestConnection: api.IConnection = { host: connection.host };
  const page1Body = {
    page: 1 satisfies number as number,
    limit: 3 satisfies number as number,
  } satisfies IREdditLikeCommunityCommunity.IRequest;
  const page1Response =
    await api.functional.redditLikeCommunity.community_profiles.index(
      guestConnection,
      { body: page1Body },
    );
  typia.assert(page1Response);
  // 4. Validate pagination metadata and community summaries on first page
  TestValidator.predicate("page1 has data", page1Response.data.length > 0);
  TestValidator.equals(
    "page1 current page",
    page1Response.pagination.current,
    1,
  );
  TestValidator.equals("page1 limit", page1Response.pagination.limit, 3);
  TestValidator.predicate(
    "page1 records equals or exceeds created communities",
    page1Response.pagination.records >= 5,
  );
  TestValidator.equals(
    "page1 total pages",
    page1Response.pagination.pages,
    Math.ceil(page1Response.pagination.records / 3),
  );
  TestValidator.predicate(
    "page1 data length matches limit or records",
    page1Response.data.length === Math.min(3, page1Response.pagination.records),
  );
  for (const summary of page1Response.data) {
    typia.assert(summary);
    typia.assert(summary.creator);
    TestValidator.predicate(
      `community ${summary.id} has valid id`,
      summary.id.length > 0,
    );
    TestValidator.predicate(
      `community ${summary.name} has valid name`,
      summary.name.length > 0,
    );
    TestValidator.predicate(
      `community ${summary.id} has subscriber count`,
      summary.subscriber_count >= 0,
    );
  }
  // 5. Query page 2 to verify pagination
  const page2Body = {
    page: 2 satisfies number as number,
    limit: 3 satisfies number as number,
  } satisfies IREdditLikeCommunityCommunity.IRequest;
  const page2Response =
    await api.functional.redditLikeCommunity.community_profiles.index(
      guestConnection,
      { body: page2Body },
    );
  typia.assert(page2Response);
  TestValidator.equals(
    "page2 current page",
    page2Response.pagination.current,
    2,
  );
  TestValidator.equals(
    "page2 pagination records consistent",
    page2Response.pagination.records,
    page1Response.pagination.records,
  );
  TestValidator.equals(
    "page2 pagination limit consistent",
    page2Response.pagination.limit,
    3,
  );
  const page1Ids = page1Response.data.map((c) => c.id);
  const page2Ids = page2Response.data.map((c) => c.id);
  const overlap = page1Ids.filter((id) => page2Ids.includes(id));
  TestValidator.equals(
    "no overlapping communities between pages",
    overlap.length,
    0,
  );
}
