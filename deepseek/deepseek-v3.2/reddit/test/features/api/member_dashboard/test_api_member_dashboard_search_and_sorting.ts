import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdmin";
import type { ICommunityPlatformComment } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformComment";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformFile } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformFile";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import type { ICommunityPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPost";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

export async function test_api_member_dashboard_search_and_sorting(
  connection: api.IConnection,
): Promise<void> {
  // Create member-specific connection
  const memberConnection: api.IConnection = { host: connection.host };
  // Authorize member using utility function (priority over SDK)
  const memberAuth = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.Format<"password">>(),
      username: RandomGenerator.alphaNumeric(12),
      nickname: RandomGenerator.name(1),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies ICommunityPlatformMember.IJoin,
  });
  typia.assert(memberAuth);
  // Prepare dashboard request with search, sorting, and pagination
  const searchTerm = RandomGenerator.alphabets(5);
  const dashboardRequest = {
    search: searchTerm satisfies string & tags.MaxLength<100>,
    sort_by: "name" as const,
    sort_order: "asc" as const,
    page: 2 satisfies number & tags.Type<"int32"> & tags.Minimum<1>,
    limit: 10 satisfies number &
      tags.Type<"int32"> &
      tags.Minimum<1> &
      tags.Maximum<100>,
  } satisfies ICommunityPlatformCommunity.IRequest;
  // Call dashboard endpoint using member-specific connection
  const dashboardResponse =
    await api.functional.communityPlatform.member.dashboard.search(
      memberConnection,
      { body: dashboardRequest },
    );
  typia.assert(dashboardResponse);
  // The dashboard endpoint returns a single community (ICommunityPlatformCommunity)
  // We validate the response structure through typia.assert() above
  // Additional business logic validation can be added if needed
  // Note: The API documentation suggests this returns a community dashboard
  // with aggregated statistics for a specific community matching the search criteria
  // We validate that the returned community exists and has expected structure
  TestValidator.predicate(
    "community has valid ID",
    typeof dashboardResponse.id === "string" && dashboardResponse.id.length > 0,
  );
  TestValidator.predicate(
    "community has name",
    typeof dashboardResponse.name === "string" &&
      dashboardResponse.name.length > 0,
  );
  // Validate owner exists and has expected structure
  typia.assert(dashboardResponse.owner);
  TestValidator.predicate(
    "owner has valid email",
    typeof dashboardResponse.owner.email === "string" &&
      dashboardResponse.owner.email.includes("@"),
  );
  // Validate subscriber count is non-negative integer
  TestValidator.predicate(
    "subscriber count is non-negative integer",
    Number.isInteger(dashboardResponse.subscriber_count) &&
      dashboardResponse.subscriber_count >= 0,
  );
  // Validate timestamps are valid ISO strings
  TestValidator.predicate(
    "created_at is valid ISO date",
    typeof dashboardResponse.created_at === "string" &&
      !isNaN(Date.parse(dashboardResponse.created_at)),
  );
  TestValidator.predicate(
    "updated_at is valid ISO date",
    typeof dashboardResponse.updated_at === "string" &&
      !isNaN(Date.parse(dashboardResponse.updated_at)),
  );
}
