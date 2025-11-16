import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAccountStatus } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAccountStatus";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformCommunitySubscription } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunitySubscription";
import type { ICommunityPlatformCommunityVisibilityLevel } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunityVisibilityLevel";
import type { ICommunityPlatformMemberuser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMemberuser";
import type { ICommunityPlatformPlatformadmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPlatformadmin";
import type { ICommunityPlatformUserFeedPreferences } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformUserFeedPreferences";

export async function test_api_member_feed_preferences_pagination_and_defaults(
  connection: api.IConnection,
) {
  /**
   * Validate retrieval of a member user's feed preferences with and without
   * pagination parameters.
   *
   * Business flow:
   *
   * 1. Create a platform admin and login as that admin to create a visibility
   *    level used for communities.
   * 2. Create a member user (join) and rely on join to authenticate that user for
   *    subsequent memberUser-scoped operations.
   * 3. As the member, create a community using the admin-defined visibility level
   *    and then subscribe to that community to give the feed preferences
   *    meaningful context.
   * 4. Create or update the member's feed preferences through POST
   *    /communityPlatform/memberUser/memberUsers/{memberUserId}/feedPreferences
   *    using a concrete ICommunityPlatformUserFeedPreferences.ICreate payload.
   * 5. Call PATCH /communityPlatform/memberUser/userFeedPreferences with an empty
   *    IRequest body (no page/limit) and ensure that the returned
   *    ICommunityPlatformUserFeedPreferences matches the last saved
   *    configuration.
   * 6. Call PATCH /communityPlatform/memberUser/userFeedPreferences again with
   *    explicit page and limit values in IRequest and verify that:
   *
   *    - The call succeeds without validation errors,
   *    - The returned object is structurally valid, and
   *    - Core preference fields remain identical to the first call, proving that
   *         pagination parameters do not change the underlying single-record
   *         result.
   */

  // 1. Platform admin join and login to be able to create visibility levels
  const platformAdminJoinHref: string & tags.Format<"uri"> = typia.random<
    string & tags.Format<"uri">
  >();
  const platformAdminJoinReferrer: string & tags.Format<"uri"> = typia.random<
    string & tags.Format<"uri">
  >();

  const platformAdminJoinBody = {
    username: RandomGenerator.name(1),
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
    displayName: RandomGenerator.name(),
    ip: "127.0.0.1",
    href: platformAdminJoinHref,
    referrer: platformAdminJoinReferrer,
  } satisfies ICommunityPlatformPlatformadmin.IJoin;

  const platformAdmin: ICommunityPlatformPlatformadmin.IAuthorized =
    await api.functional.auth.platformAdmin.join(connection, {
      body: platformAdminJoinBody,
    });
  typia.assert(platformAdmin);

  // 2. Create a visibility level as platform admin
  const visibilityCreateBody = {
    code: `code-${RandomGenerator.alphaNumeric(6)}`,
    name: `Visibility ${RandomGenerator.name(1)}`,
    description: RandomGenerator.paragraph({ sentences: 3 }),
  } satisfies ICommunityPlatformCommunityVisibilityLevel.ICreate;

  const visibilityLevel: ICommunityPlatformCommunityVisibilityLevel =
    await api.functional.communityPlatform.platformAdmin.communityVisibilityLevels.create(
      connection,
      {
        body: visibilityCreateBody,
      },
    );
  typia.assert(visibilityLevel);

  // 3. Member user join (auto-authenticates memberUser actor)
  const memberJoinHref: string & tags.Format<"uri"> = typia.random<
    string & tags.Format<"uri">
  >();
  const memberJoinReferrer: string & tags.Format<"uri"> = typia.random<
    string & tags.Format<"uri">
  >();

  const memberJoinBody = {
    username: RandomGenerator.name(1),
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
    ip: "127.0.0.1",
    href: memberJoinHref,
    referrer: memberJoinReferrer,
  } satisfies ICommunityPlatformMemberuser.IJoinRequest;

  const memberAuthorized: ICommunityPlatformMemberuser.IAuthorized =
    await api.functional.auth.memberUser.join(connection, {
      body: memberJoinBody,
    });
  typia.assert(memberAuthorized);

  // 4. As the member user, create a community using the visibility level code
  const communityCreateBody = {
    identifier: `community-${RandomGenerator.alphaNumeric(8)}`,
    title: `Community ${RandomGenerator.name(1)}`,
    description: RandomGenerator.paragraph({ sentences: 4 }),
    visibilityLevelCode: visibilityLevel.code,
    isNsfw: false,
    primaryTagIds: [],
  } satisfies ICommunityPlatformCommunity.ICreate;

  const community: ICommunityPlatformCommunity =
    await api.functional.communityPlatform.memberUser.communities.create(
      connection,
      {
        body: communityCreateBody,
      },
    );
  typia.assert(community);

  // 5. Subscribe the member to the created community
  const subscriptionCreateBody = {
    community_id: community.id,
    status: "active",
  } satisfies ICommunityPlatformCommunitySubscription.ICreate;

  const subscription: ICommunityPlatformCommunitySubscription =
    await api.functional.communityPlatform.memberUser.subscriptions.create(
      connection,
      {
        body: subscriptionCreateBody,
      },
    );
  typia.assert(subscription);
  TestValidator.equals(
    "subscription community id should match created community id",
    subscription.community_id,
    community.id,
  );

  // 6. Establish explicit feed preferences for the member user
  const feedPreferencesCreateBody = {
    default_post_sort_mode: RandomGenerator.pick([
      "hot",
      "new",
      "top",
      "controversial",
    ] as const),
    show_sensitive_content: true,
    include_recommended_feeds: true,
  } satisfies ICommunityPlatformUserFeedPreferences.ICreate;

  const createdPreferences: ICommunityPlatformUserFeedPreferences =
    await api.functional.communityPlatform.memberUser.memberUsers.feedPreferences.create(
      connection,
      {
        memberUserId: memberAuthorized.id,
        body: feedPreferencesCreateBody,
      },
    );
  typia.assert(createdPreferences);

  // Sanity check: created preferences match the creation payload
  TestValidator.equals(
    "created default_post_sort_mode should match input",
    createdPreferences.default_post_sort_mode,
    feedPreferencesCreateBody.default_post_sort_mode,
  );
  TestValidator.equals(
    "created show_sensitive_content should match input",
    createdPreferences.show_sensitive_content,
    feedPreferencesCreateBody.show_sensitive_content,
  );
  TestValidator.equals(
    "created include_recommended_feeds should match input",
    createdPreferences.include_recommended_feeds,
    feedPreferencesCreateBody.include_recommended_feeds,
  );

  // 7. Call PATCH /userFeedPreferences without pagination parameters
  const defaultRequestBody = {
    // page and limit omitted to test default behavior
  } satisfies ICommunityPlatformUserFeedPreferences.IRequest;

  const defaultPreferences: ICommunityPlatformUserFeedPreferences =
    await api.functional.communityPlatform.memberUser.userFeedPreferences.index(
      connection,
      {
        body: defaultRequestBody,
      },
    );
  typia.assert(defaultPreferences);

  // Verify that default retrieval reflects the saved configuration
  TestValidator.equals(
    "default call: default_post_sort_mode remains consistent",
    defaultPreferences.default_post_sort_mode,
    createdPreferences.default_post_sort_mode,
  );
  TestValidator.equals(
    "default call: show_sensitive_content remains consistent",
    defaultPreferences.show_sensitive_content,
    createdPreferences.show_sensitive_content,
  );
  TestValidator.equals(
    "default call: include_recommended_feeds remains consistent",
    defaultPreferences.include_recommended_feeds,
    createdPreferences.include_recommended_feeds,
  );

  // 8. Call PATCH /userFeedPreferences with explicit pagination parameters
  const pagedRequestBody = {
    page: 1 as number & tags.Type<"int32">,
    limit: 10 as number & tags.Type<"int32">,
  } satisfies ICommunityPlatformUserFeedPreferences.IRequest;

  const pagedPreferences: ICommunityPlatformUserFeedPreferences =
    await api.functional.communityPlatform.memberUser.userFeedPreferences.index(
      connection,
      {
        body: pagedRequestBody,
      },
    );
  typia.assert(pagedPreferences);

  // Validate that pagination arguments do not affect preference semantics
  TestValidator.equals(
    "paged call: default_post_sort_mode remains consistent",
    pagedPreferences.default_post_sort_mode,
    createdPreferences.default_post_sort_mode,
  );
  TestValidator.equals(
    "paged call: show_sensitive_content remains consistent",
    pagedPreferences.show_sensitive_content,
    createdPreferences.show_sensitive_content,
  );
  TestValidator.equals(
    "paged call: include_recommended_feeds remains consistent",
    pagedPreferences.include_recommended_feeds,
    createdPreferences.include_recommended_feeds,
  );

  // Cross-validate default vs paged calls for complete equality
  TestValidator.equals(
    "default vs paged preferences should be identical",
    defaultPreferences,
    pagedPreferences,
  );
}
