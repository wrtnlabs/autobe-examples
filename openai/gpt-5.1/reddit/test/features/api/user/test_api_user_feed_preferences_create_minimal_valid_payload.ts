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

/**
 * Validate creation of minimal user feed preferences via the generic memberUser
 * endpoint.
 *
 * Business context:
 *
 * - The platform allows member users to control how their feeds are built via
 *   per-user preferences stored in community_platform_user_feed_preferences.
 * - There are two relevant write surfaces:
 *
 *   1. A memberUser-scoped endpoint under
 *        /memberUsers/{memberUserId}/feedPreferences
 *   2. A generic memberUser-level endpoint
 *        /communityPlatform/memberUser/userFeedPreferences
 * - This test ensures that, after setting up realistic surrounding state
 *   (visibility level, community, subscriptions, and memberUser-scoped
 *   preferences), an authenticated member user can still create/update their
 *   preferences through the generic endpoint using a minimal valid payload.
 *
 * Scenario steps:
 *
 * 1. Platform admin registration and visibility level setup
 *
 *    - Call POST /auth/platformAdmin/join with
 *         ICommunityPlatformPlatformadmin.IJoin.
 *    - Use the resulting platformAdmin authentication (token is auto-applied to
 *         connection.headers) to call POST
 *         /communityPlatform/platformAdmin/communityVisibilityLevels with
 *         ICommunityPlatformCommunityVisibilityLevel.ICreate.
 *    - Capture the created visibility level's `code` field for use when creating a
 *         community.
 * 2. Member user registration and authentication
 *
 *    - Call POST /auth/memberUser/join with
 *         ICommunityPlatformMemberuser.IJoinRequest.
 *    - The join response ICommunityPlatformMemberuser.IAuthorized includes the
 *         member user's UUID id and applies the memberUser access token to
 *         connection.headers, so subsequent communityPlatform/memberUser calls
 *         execute as this user.
 * 3. Community and subscription setup for the member user
 *
 *    - As the authenticated memberUser, call POST
 *         /communityPlatform/memberUser/communities with
 *         ICommunityPlatformCommunity.ICreate, using the visibility level code
 *         from step 1. Capture the community id from the response.
 *    - Still as memberUser, create a generic subscription via POST
 *         /communityPlatform/memberUser/subscriptions with
 *         ICommunityPlatformCommunitySubscription.ICreate, setting
 *         `community_id` to the created community's id and `status` to a valid
 *         value such as "active".
 *    - Also create an explicit memberUser-scoped subscription via POST
 *         /communityPlatform/memberUser/memberUsers/{memberUserId}/subscriptions
 *         with ICommunityPlatformCommunitySubscription.ICreate, using the same
 *         community id and status, and the memberUser id from the join
 *         response.
 * 4. Baseline memberUser-scoped feed preferences
 *
 *    - As memberUser, call POST
 *         /communityPlatform/memberUser/memberUsers/{memberUserId}/feedPreferences
 *         with ICommunityPlatformUserFeedPreferences.ICreate, choosing
 *         legitimate values for:
 *
 *         - Default_post_sort_mode
 *         - Show_sensitive_content
 *         - Include_recommended_feeds This ensures the per-member preference record
 *                   exists or is upserted and that any one-to-one constraints
 *                   with the member user are satisfied.
 * 5. Target operation: generic user feed preferences creation
 *
 *    - As memberUser, call POST /communityPlatform/memberUser/userFeedPreferences
 *         with a minimal but valid
 *         ICommunityPlatformUserFeedPreferences.ICreate payload that specifies
 *         only:
 *
 *         - Default_post_sort_mode (e.g., "hot")
 *         - Show_sensitive_content (boolean)
 *         - Include_recommended_feeds (boolean)
 *    - Capture the returned ICommunityPlatformUserFeedPreferences record.
 * 6. Assertions
 *
 *    - Typia.assert() on every non-void response object to guarantee schema
 *         correctness.
 *    - Use TestValidator.equals to validate that the preference fields in the final
 *         response match the minimal request body:
 *
 *         - Default_post_sort_mode
 *         - Show_sensitive_content
 *         - Include_recommended_feeds
 *    - Assert that response.memberUser.id equals the member user id from the join
 *         step.
 *    - Rely on typia.assert() to validate that id is a UUID and that
 *         created_at/updated_at are well-formed date-time strings, without
 *         adding redundant checks.
 */
export async function test_api_user_feed_preferences_create_minimal_valid_payload(
  connection: api.IConnection,
) {
  // 1. Platform admin joins to gain access to visibility level creation.
  const platformAdminJoinBody = {
    username: RandomGenerator.alphabets(12),
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(16),
    displayName: RandomGenerator.name(),
    ip: RandomGenerator.mobile(),
    href: "https://admin.example.com/signup",
    referrer: "https://admin.example.com/landing",
  } satisfies ICommunityPlatformPlatformadmin.IJoin;

  const platformAdmin: ICommunityPlatformPlatformadmin.IAuthorized =
    await api.functional.auth.platformAdmin.join(connection, {
      body: platformAdminJoinBody,
    });
  typia.assert(platformAdmin);

  // 2. Platform admin creates a visibility level master record.
  const visibilityCode = `public-${RandomGenerator.alphabets(6)}`;
  const visibilityCreateBody = {
    code: visibilityCode,
    name: "Public",
    description: RandomGenerator.paragraph({ sentences: 4 }),
  } satisfies ICommunityPlatformCommunityVisibilityLevel.ICreate;

  const visibilityLevel: ICommunityPlatformCommunityVisibilityLevel =
    await api.functional.communityPlatform.platformAdmin.communityVisibilityLevels.create(
      connection,
      {
        body: visibilityCreateBody,
      },
    );
  typia.assert(visibilityLevel);
  TestValidator.equals(
    "visibility level code should match request",
    visibilityLevel.code,
    visibilityCreateBody.code,
  );

  // 3. Member user joins (becomes authenticated memberUser actor).
  const memberJoinBody = {
    username: RandomGenerator.alphabets(10),
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
    ip: null,
    href: "https://app.example.com/join",
    referrer: "https://app.example.com/home",
  } satisfies ICommunityPlatformMemberuser.IJoinRequest;

  const memberAuthorized: ICommunityPlatformMemberuser.IAuthorized =
    await api.functional.auth.memberUser.join(connection, {
      body: memberJoinBody,
    });
  typia.assert(memberAuthorized);

  const memberUserId = memberAuthorized.id;

  // 4. As the authenticated memberUser, create a community that uses
  //    the visibility level from step 2.
  const communityCreateBody = {
    identifier: `community-${RandomGenerator.alphabets(8)}`,
    title: RandomGenerator.paragraph({ sentences: 3 }),
    description: RandomGenerator.paragraph({ sentences: 6 }),
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

  // 5. Generic subscription to that community.
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
    "generic subscription community id",
    subscription.community_id,
    community.id,
  );
  TestValidator.equals(
    "generic subscription member user id",
    subscription.member_user_id,
    memberUserId,
  );

  // 6. MemberUser-scoped subscription using the explicit memberUsers/{id} endpoint.
  const scopedSubscriptionBody = {
    community_id: community.id,
    status: "active",
  } satisfies ICommunityPlatformCommunitySubscription.ICreate;

  const scopedSubscription: ICommunityPlatformCommunitySubscription =
    await api.functional.communityPlatform.memberUser.memberUsers.subscriptions.create(
      connection,
      {
        memberUserId,
        body: scopedSubscriptionBody,
      },
    );
  typia.assert(scopedSubscription);
  TestValidator.equals(
    "scoped subscription community id",
    scopedSubscription.community_id,
    community.id,
  );
  TestValidator.equals(
    "scoped subscription member user id",
    scopedSubscription.member_user_id,
    memberUserId,
  );

  // 7. Create or upsert memberUser-scoped feed preferences baseline.
  const baselinePreferencesBody = {
    default_post_sort_mode: "hot",
    show_sensitive_content: false,
    include_recommended_feeds: true,
  } satisfies ICommunityPlatformUserFeedPreferences.ICreate;

  const baselinePreferences: ICommunityPlatformUserFeedPreferences =
    await api.functional.communityPlatform.memberUser.memberUsers.feedPreferences.create(
      connection,
      {
        memberUserId,
        body: baselinePreferencesBody,
      },
    );
  typia.assert(baselinePreferences);
  TestValidator.equals(
    "baseline default_post_sort_mode",
    baselinePreferences.default_post_sort_mode,
    baselinePreferencesBody.default_post_sort_mode,
  );

  // 8. Target: call generic userFeedPreferences.create with minimal payload.
  const minimalPreferencesBody = {
    default_post_sort_mode: "hot",
    show_sensitive_content: true,
    include_recommended_feeds: false,
  } satisfies ICommunityPlatformUserFeedPreferences.ICreate;

  const createdPreferences: ICommunityPlatformUserFeedPreferences =
    await api.functional.communityPlatform.memberUser.userFeedPreferences.create(
      connection,
      {
        body: minimalPreferencesBody,
      },
    );
  typia.assert(createdPreferences);

  // 9. Assertions about owner linkage and field persistence.
  TestValidator.equals(
    "created preferences belong to the joined member user",
    createdPreferences.memberUser.id,
    memberUserId,
  );

  TestValidator.equals(
    "default_post_sort_mode matches minimal payload",
    createdPreferences.default_post_sort_mode,
    minimalPreferencesBody.default_post_sort_mode,
  );
  TestValidator.equals(
    "show_sensitive_content matches minimal payload",
    createdPreferences.show_sensitive_content,
    minimalPreferencesBody.show_sensitive_content,
  );
  TestValidator.equals(
    "include_recommended_feeds matches minimal payload",
    createdPreferences.include_recommended_feeds,
    minimalPreferencesBody.include_recommended_feeds,
  );

  // created_at and updated_at are validated structurally by typia.assert
  // based on their date-time format tags, so no extra checks are needed.
}
