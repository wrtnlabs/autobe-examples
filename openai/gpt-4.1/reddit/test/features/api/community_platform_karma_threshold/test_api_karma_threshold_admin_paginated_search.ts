import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdmin";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformKarmaThreshold } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformKarmaThreshold";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageICommunityPlatformKarmaThreshold } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformKarmaThreshold";

/**
 * Validates admin-only paginated and filtered search of karma threshold config.
 *
 * 1. Authenticates as a platform admin (with random test email).
 * 2. Creates a community to enable testing of community-scoped vs global
 *    thresholds.
 * 3. Calls the karmaThresholds index endpoint (PATCH) as admin with various
 *    filters:
 *
 *    - All (no filter),
 *    - Specific community ID (community filter),
 *    - Omit community to test global,
 *    - Threshold_type (random or ensured to not exist for zero-results check).
 * 4. Verifies each response's pagination fields are correct.
 * 5. Checks that each listed entry contains required threshold fields and correct
 *    scoping.
 * 6. Verifies only admins can access the endpoint: test as
 *    unauthenticated/non-admin/non-existent role, which must yield error.
 */
export async function test_api_karma_threshold_admin_paginated_search(
  connection: api.IConnection,
) {
  // 1. Admin registration & authentication
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const admin = await api.functional.auth.admin.join(connection, {
    body: {
      email: adminEmail,
      password: RandomGenerator.alphaNumeric(16),
      superuser: true,
    } satisfies ICommunityPlatformAdmin.ICreate,
  });
  typia.assert(admin);

  // 2. Create a community (as admin creates via member API in this test scope)
  const communityName = RandomGenerator.name(1)
    .replace(/\s/g, "")
    .toLowerCase();
  const communityCreateBody = {
    name: communityName,
    title: RandomGenerator.paragraph({ sentences: 2 }),
    description: RandomGenerator.content({ paragraphs: 1 }),
    slug: `${communityName}-${RandomGenerator.alphaNumeric(4)}`,
  } satisfies ICommunityPlatformCommunity.ICreate;
  const createdCommunity =
    await api.functional.communityPlatform.member.communities.create(
      connection,
      { body: communityCreateBody },
    );
  typia.assert(createdCommunity);

  // 3. Search with no filter (all thresholds, pagination check)
  const allThresholdsPage =
    await api.functional.communityPlatform.admin.karmaThresholds.index(
      connection,
      { body: {} satisfies ICommunityPlatformKarmaThreshold.IRequest },
    );
  typia.assert(allThresholdsPage);
  TestValidator.predicate(
    "pagination object present",
    allThresholdsPage.pagination &&
      typeof allThresholdsPage.pagination.current === "number",
  );

  // 4. Filter for just this community's thresholds
  const communityPage =
    await api.functional.communityPlatform.admin.karmaThresholds.index(
      connection,
      {
        body: {
          community_platform_community_id: createdCommunity.id,
        } satisfies ICommunityPlatformKarmaThreshold.IRequest,
      },
    );
  typia.assert(communityPage);
  for (const threshold of communityPage.data) {
    TestValidator.equals(
      "threshold community ID matches filter",
      threshold.community_platform_community_id,
      createdCommunity.id,
    );
  }

  // 5. Filter for global thresholds (no community ID)
  const globalPage =
    await api.functional.communityPlatform.admin.karmaThresholds.index(
      connection,
      {
        body: {
          community_platform_community_id: undefined,
        } satisfies ICommunityPlatformKarmaThreshold.IRequest,
      },
    );
  typia.assert(globalPage);
  for (const threshold of globalPage.data) {
    TestValidator.equals(
      "should be global threshold (community id null)",
      threshold.community_platform_community_id,
      null,
    );
  }

  // 6. Filter for non-matching threshold_type (should yield zero results)
  const noneFoundPage =
    await api.functional.communityPlatform.admin.karmaThresholds.index(
      connection,
      {
        body: {
          threshold_type: "non_existent_type_" + RandomGenerator.alphabets(8),
        } satisfies ICommunityPlatformKarmaThreshold.IRequest,
      },
    );
  typia.assert(noneFoundPage);
  TestValidator.equals(
    "no results for nonsense filter",
    noneFoundPage.data.length,
    0,
  );

  // 7. Negative: unauthenticated/non-admin should be denied
  const unauthConn: api.IConnection = { ...connection, headers: {} };
  await TestValidator.error(
    "non-admin/unauthenticated access denied",
    async () => {
      await api.functional.communityPlatform.admin.karmaThresholds.index(
        unauthConn,
        { body: {} satisfies ICommunityPlatformKarmaThreshold.IRequest },
      );
    },
  );
}
