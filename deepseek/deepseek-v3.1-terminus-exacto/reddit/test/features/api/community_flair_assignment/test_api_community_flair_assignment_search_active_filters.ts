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

export async function test_api_community_flair_assignment_search_active_filters(
  connection: api.IConnection,
): Promise<void> {
  // Authenticate as moderator
  const moderatorConnection: api.IConnection = { host: connection.host };
  await authorize_moderator_join(moderatorConnection, {
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
  // Create test community ID
  const communityId = typia.random<string & tags.Format<"uuid">>();
  // Test 1: Search for active assignments (expired_at: null)
  const activeSearchResult =
    await api.functional.communityPlatform.moderator.communities.flair_assignments.index(
      moderatorConnection,
      {
        communityId,
        body: {
          expired_at: null,
        } satisfies ICommunityPlatformCommunityFlairAssignment.IRequest,
      },
    );
  typia.assert(activeSearchResult);
  TestValidator.predicate(
    "active assignments search returns paginated result",
    activeSearchResult.pagination.records >= 0 &&
      activeSearchResult.pagination.limit > 0 &&
      activeSearchResult.pagination.pages >= 0,
  );
  // Test 2: Search with user_id filter
  const userId = typia.random<string & tags.Format<"uuid">>();
  const userFilterResult =
    await api.functional.communityPlatform.moderator.communities.flair_assignments.index(
      moderatorConnection,
      {
        communityId,
        body: {
          user_id: userId,
        } satisfies ICommunityPlatformCommunityFlairAssignment.IRequest,
      },
    );
  typia.assert(userFilterResult);
  // Test 3: Search with flair_id filter
  const flairId = typia.random<string & tags.Format<"uuid">>();
  const flairFilterResult =
    await api.functional.communityPlatform.moderator.communities.flair_assignments.index(
      moderatorConnection,
      {
        communityId,
        body: {
          flair_id: flairId,
        } satisfies ICommunityPlatformCommunityFlairAssignment.IRequest,
      },
    );
  typia.assert(flairFilterResult);
  // Test 4: Search with date range filter
  const dateRangeResult =
    await api.functional.communityPlatform.moderator.communities.flair_assignments.index(
      moderatorConnection,
      {
        communityId,
        body: {
          created_at_start: new Date(
            Date.now() - 7 * 24 * 60 * 60 * 1000,
          ).toISOString(),
          created_at_end: new Date().toISOString(),
        } satisfies ICommunityPlatformCommunityFlairAssignment.IRequest,
      },
    );
  typia.assert(dateRangeResult);
  // Test 5: Search with combined filters
  const combinedResult =
    await api.functional.communityPlatform.moderator.communities.flair_assignments.index(
      moderatorConnection,
      {
        communityId,
        body: {
          user_id: userId,
          expired_at: null,
          page: 1,
          limit: 10,
        } satisfies ICommunityPlatformCommunityFlairAssignment.IRequest,
      },
    );
  typia.assert(combinedResult);
  TestValidator.equals(
    "page number matches",
    combinedResult.pagination.current,
    1,
  );
  TestValidator.equals("limit matches", combinedResult.pagination.limit, 10);
  // Test 6: Validate assignment summary structure
  if (combinedResult.data.length > 0) {
    const assignment = combinedResult.data[0];
    TestValidator.predicate(
      "assignment has valid ID",
      assignment.id.length > 0,
    );
    TestValidator.predicate(
      "assignment has user",
      assignment.user.id.length > 0,
    );
    TestValidator.predicate(
      "assignment has flair",
      assignment.flair.id.length > 0,
    );
    TestValidator.predicate(
      "assignment has assigned_by user",
      assignment.assigned_by.id.length > 0,
    );
    TestValidator.predicate(
      "assignment has creation date",
      assignment.created_at.length > 0,
    );
  }
}
