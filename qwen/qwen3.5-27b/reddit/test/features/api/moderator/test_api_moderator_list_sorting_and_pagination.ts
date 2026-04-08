import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIRedditCloneCommunityModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditCloneCommunityModerator";
import type { IRedditCloneCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneCommunity";
import type { IRedditCloneCommunityModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneCommunityModerator";
import type { IRedditCloneModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneModerator";
import type { IRedditCloneUserProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneUserProfile";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_moderator_join } from "../../../authorize/authorize_moderator_join";
import { authorize_moderator_login } from "../../../authorize/authorize_moderator_login";
import { authorize_moderator_refresh } from "../../../authorize/authorize_moderator_refresh";
import { generate_random_reddit_clone_moderator_communities_moderators_create } from "../../../generate/generate_random_reddit_clone_moderator_communities_moderators_create";
import { prepare_random_reddit_clone_community_moderator } from "../../../prepare/prepare_random_reddit_clone_community_moderator";

/**
 * Test sorting and pagination functionality for moderator listing endpoint.
 *
 * Validates the moderator list retrieval with various sorting options (created_at, updated_at) and pagination parameters. Ensures that moderators are correctly ordered by specified fields and that pagination metadata accurately reflects the total records and page count.
 *
 * Special attention is given to verifying that soft-deleted moderators are excluded from results and that pagination works correctly across multiple pages.
 *
 * 1. Authenticate as a moderator to gain access to moderator endpoints
 * 2. Generate a test community ID for moderator assignments
 * 3. Add four moderators to the community to enable pagination testing
 * 4. Test sorting by created_at in descending order (newest first)
 * 5. Test sorting by created_at in ascending order (oldest first)
 * 6. Test sorting by updated_at
 * 7. Test pagination with page=1 and limit=2
 * 8. Test pagination with page=2 and limit=2 to verify different results
 * 9. Validate pagination metadata shows correct current page, limit, total records, and total pages
 * 10. Verify that soft-deleted moderators are excluded from results
 */
export async function test_api_moderator_list_sorting_and_pagination(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as a moderator
  const moderatorConnection: api.IConnection = { host: connection.host };
  const moderatorAuth = await authorize_moderator_join(moderatorConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  typia.assert(moderatorAuth);
  // 2. Generate a test community ID
  const communityId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();
  // 3. Add four moderators to the community
  const moderators: IRedditCloneCommunityModerator[] = [];
  for (let i = 0; i < 4; i++) {
    const mod =
      await generate_random_reddit_clone_moderator_communities_moderators_create(
        moderatorConnection,
        {
          params: { communityId },
          body: {
            userProfileId: typia.random<string & tags.Format<"uuid">>(),
            role: i === 0 ? "owner" : "moderator",
          },
        },
      );
    typia.assert(mod);
    moderators.push(mod);
  }
  // 4. Test sorting by created_at in descending order (newest first)
  const descResult =
    await api.functional.redditClone.moderator.communities.moderators.index(
      moderatorConnection,
      {
        communityId,
        body: {
          sortBy: "created_at",
          sortOrder: "desc",
        },
      },
    );
  typia.assert(descResult);
  TestValidator.equals(
    "total records in desc sort",
    descResult.pagination.records,
    4,
  );
  if (descResult.data.length >= 2) {
    TestValidator.predicate(
      "created_at desc order correct",
      new Date(descResult.data[0].created_at) >=
        new Date(descResult.data[1].created_at),
    );
  }
  // 5. Test sorting by created_at in ascending order (oldest first)
  const ascResult =
    await api.functional.redditClone.moderator.communities.moderators.index(
      moderatorConnection,
      {
        communityId,
        body: {
          sortBy: "created_at",
          sortOrder: "asc",
        },
      },
    );
  typia.assert(ascResult);
  TestValidator.equals(
    "total records in asc sort",
    ascResult.pagination.records,
    4,
  );
  if (ascResult.data.length >= 2) {
    TestValidator.predicate(
      "created_at asc order correct",
      new Date(ascResult.data[0].created_at) <=
        new Date(ascResult.data[1].created_at),
    );
  }
  // 6. Test sorting by updated_at
  const updatedResult =
    await api.functional.redditClone.moderator.communities.moderators.index(
      moderatorConnection,
      {
        communityId,
        body: {
          sortBy: "updated_at",
          sortOrder: "desc",
        },
      },
    );
  typia.assert(updatedResult);
  TestValidator.equals(
    "total records in updated_at sort",
    updatedResult.pagination.records,
    4,
  );
  // 7. Test pagination with page=1 and limit=2
  const page1Result =
    await api.functional.redditClone.moderator.communities.moderators.index(
      moderatorConnection,
      {
        communityId,
        body: {
          page: 1,
          limit: 2,
        },
      },
    );
  typia.assert(page1Result);
  TestValidator.equals("page 1 current", page1Result.pagination.current, 1);
  TestValidator.equals("page 1 limit", page1Result.pagination.limit, 2);
  TestValidator.equals("page 1 records", page1Result.pagination.records, 4);
  TestValidator.equals("page 1 pages", page1Result.pagination.pages, 2);
  TestValidator.equals("page 1 data count", page1Result.data.length, 2);
  // 8. Test pagination with page=2 and limit=2
  const page2Result =
    await api.functional.redditClone.moderator.communities.moderators.index(
      moderatorConnection,
      {
        communityId,
        body: {
          page: 2,
          limit: 2,
        },
      },
    );
  typia.assert(page2Result);
  TestValidator.equals("page 2 current", page2Result.pagination.current, 2);
  TestValidator.equals("page 2 limit", page2Result.pagination.limit, 2);
  TestValidator.equals("page 2 records", page2Result.pagination.records, 4);
  TestValidator.equals("page 2 pages", page2Result.pagination.pages, 2);
  TestValidator.equals("page 2 data count", page2Result.data.length, 2);
  // 9. Verify page 1 and page 2 have different moderators
  const page1Ids = page1Result.data.map((m) => m.id);
  const page2Ids = page2Result.data.map((m) => m.id);
  TestValidator.predicate(
    "page 1 and page 2 have different moderators",
    page1Ids.every((id) => !page2Ids.includes(id)),
  );
  // 10. Verify all moderators have deleted_at = null (not soft-deleted)
  const allModerators =
    await api.functional.redditClone.moderator.communities.moderators.index(
      moderatorConnection,
      {
        communityId,
        body: {},
      },
    );
  typia.assert(allModerators);
  allModerators.data.forEach((mod) => {
    TestValidator.equals("moderator not soft-deleted", mod.deleted_at, null);
  });
}
