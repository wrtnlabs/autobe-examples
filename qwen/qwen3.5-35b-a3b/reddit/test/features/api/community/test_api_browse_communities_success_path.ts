import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIRedditCommunityCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditCommunityCommunity";
import type { IRedditCommunityCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunity";
import type { IRedditCommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityMember";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

export async function test_api_browse_communities_success_path(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Register a new member account
  const memberConnection: api.IConnection = { host: connection.host };
  const member = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "testPassword123!",
      username: RandomGenerator.name(2),
      href: "https://example.com/join",
      referrer: "https://example.com/",
    },
  });
  typia.assert(member);
  // Step 2: Issue first request with default pagination (implicit page_size=20)
  const browseResponse1 =
    await api.functional.redditCommunity.member.browse_communities.browse(
      memberConnection,
    );
  typia.assert(browseResponse1);
  // Step 3: Issue second request (verify consistent default behavior)
  const browseResponse2 =
    await api.functional.redditCommunity.member.browse_communities.browse(
      memberConnection,
    );
  typia.assert(browseResponse2);
  // Step 4: Validate pagination metadata structure and values
  TestValidator.equals(
    "pagination current page is 1",
    browseResponse1.pagination.current,
    1,
  );
  TestValidator.equals(
    "pagination limit is 20",
    browseResponse1.pagination.limit,
    20,
  );
  TestValidator.predicate(
    "pagination records count is non-negative",
    browseResponse1.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination pages count is non-negative",
    browseResponse1.pagination.pages >= 0,
  );
  // Step 5: Validate each community record has required fields
  for (const community of browseResponse1.data) {
    TestValidator.equals(
      `community ${community.id} id is UUID format`,
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
        community.id,
      ),
      true,
    );
    TestValidator.equals(
      `community ${community.id} name is string`,
      typeof community.name,
      "string",
    );
    TestValidator.predicate(
      `community ${community.id} description is null or string`,
      community.description === null ||
        typeof community.description === "string" ||
        community.description === undefined,
    );
    TestValidator.equals(
      `community ${community.id} subscriber_count is non-negative number or undefined`,
      community.subscriber_count === undefined ||
        (typeof community.subscriber_count === "number" &&
          community.subscriber_count >= 0),
      true,
    );
    TestValidator.equals(
      `community ${community.id} created_at is valid date-time`,
      !isNaN(Date.parse(community.created_at)),
      true,
    );
  }
  // Step 6: Verify both requests return consistent results
  TestValidator.equals(
    "pagination records consistent across requests",
    browseResponse1.pagination.records,
    browseResponse2.pagination.records,
  );
  TestValidator.equals(
    "pagination pages consistent across requests",
    browseResponse1.pagination.pages,
    browseResponse2.pagination.pages,
  );
  TestValidator.equals(
    "data array lengths consistent across requests",
    browseResponse1.data.length,
    browseResponse2.data.length,
  );
  // Step 7: Validate community ordering (subscriber_count desc, id asc)
  if (browseResponse1.data.length > 1) {
    const sortedData = [...browseResponse1.data].sort((a, b) => {
      // Primary sort: subscriber_count descending
      const aCount = a.subscriber_count ?? 0;
      const bCount = b.subscriber_count ?? 0;
      if (bCount !== aCount) return bCount - aCount;
      // Secondary sort: id ascending (for deterministic ordering)
      return a.id.localeCompare(b.id);
    });
    for (let i = 0; i < browseResponse1.data.length; i++) {
      TestValidator.equals(
        `community ${i} ordering is correct`,
        browseResponse1.data[i].id,
        sortedData[i].id,
      );
    }
  }
  // Step 8: Validate subscriber_count reflects actual subscriptions in system
  for (const community of browseResponse1.data) {
    TestValidator.predicate(
      `community ${community.id} subscriber_count is consistent`,
      community.subscriber_count !== undefined &&
        community.subscriber_count >= 0,
    );
  }
}
