import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformCommunityFlair } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunityFlair";
import type { ICommunityPlatformCommunityFlairAssignment } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunityFlairAssignment";
import type { ICommunityPlatformModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformModerator";
import type { ICommunityPlatformUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformUser";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageICommunityPlatformCommunityFlairAssignment } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformCommunityFlairAssignment";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_moderator_join } from "../../../authorize/authorize_moderator_join";
import { authorize_moderator_login } from "../../../authorize/authorize_moderator_login";
import { authorize_moderator_refresh } from "../../../authorize/authorize_moderator_refresh";

export async function test_api_community_flair_assignment_expired_search(
  connection: api.IConnection,
): Promise<void> {
  // Create moderator connection
  const moderatorConnection: api.IConnection = { host: connection.host };
  const moderator = await authorize_moderator_join(moderatorConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      username: RandomGenerator.alphabets(8),
      display_name: RandomGenerator.name(),
      bio: RandomGenerator.paragraph({ sentences: 2 }),
      avatar_url: typia.random<string & tags.Format<"uri">>(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies ICommunityPlatformModerator.IJoin,
  });
  typia.assert(moderator);
  // Create a community ID for testing
  const communityId = typia.random<string & tags.Format<"uuid">>();
  // Test 1: Search for expired flair assignments
  const expiredSearch =
    await api.functional.communityPlatform.moderator.communities.flair_assignments.index(
      moderatorConnection,
      {
        communityId,
        body: {
          expired_at: new Date(Date.now() - 86400000).toISOString(), // Expired yesterday
        } satisfies ICommunityPlatformCommunityFlairAssignment.IRequest,
      },
    );
  typia.assert(expiredSearch);
  // Test 2: Search for active flair assignments (null expiration)
  const activeSearch =
    await api.functional.communityPlatform.moderator.communities.flair_assignments.index(
      moderatorConnection,
      {
        communityId,
        body: {
          expired_at: null,
        } satisfies ICommunityPlatformCommunityFlairAssignment.IRequest,
      },
    );
  typia.assert(activeSearch);
  // Test 3: Search with date range constraints
  const dateRangeSearch =
    await api.functional.communityPlatform.moderator.communities.flair_assignments.index(
      moderatorConnection,
      {
        communityId,
        body: {
          created_at_start: new Date(Date.now() - 2592000000).toISOString(), // 30 days ago
          created_at_end: new Date().toISOString(),
        } satisfies ICommunityPlatformCommunityFlairAssignment.IRequest,
      },
    );
  typia.assert(dateRangeSearch);
  // Validate pagination structure
  TestValidator.equals(
    "pagination structure present",
    typeof expiredSearch.pagination,
    "object",
  );
  TestValidator.predicate(
    "pagination has current page",
    expiredSearch.pagination.current >= 0,
  );
  TestValidator.predicate(
    "pagination has limit",
    expiredSearch.pagination.limit >= 0,
  );
  TestValidator.predicate(
    "pagination has records count",
    expiredSearch.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination has pages count",
    expiredSearch.pagination.pages >= 0,
  );
  // Validate data structure
  TestValidator.equals(
    "data is array",
    Array.isArray(expiredSearch.data),
    true,
  );
  if (expiredSearch.data.length > 0) {
    const assignment = expiredSearch.data[0];
    TestValidator.equals("assignment has id", typeof assignment.id, "string");
    TestValidator.equals(
      "assignment has user",
      typeof assignment.user,
      "object",
    );
    TestValidator.equals(
      "assignment has flair",
      typeof assignment.flair,
      "object",
    );
    TestValidator.equals(
      "assignment has assigned_by",
      typeof assignment.assigned_by,
      "object",
    );
    TestValidator.equals(
      "assignment has created_at",
      typeof assignment.created_at,
      "string",
    );
    TestValidator.equals(
      "assignment has expired_at",
      typeof assignment.expired_at,
      "string",
    );
  }
}
