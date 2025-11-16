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

export async function test_api_user_feed_preferences_update_validation_of_sort_mode_and_flags(
  connection: api.IConnection,
) {
  // 1. Prepare actors: platform admin (to seed visibility level) and member user (who owns preferences).
  //    However, user feed preferences do not actually depend on communities or visibility levels at
  //    the API level, and the SDK for update() does not require any community-specific data.
  //    To keep the scenario implementable and focused, this test will only ensure that the
  //    authenticated member user exists and that a feed preference record is created for them.

  // 1-1. Register a new member user (join) and let SDK attach Authorization header.
  const memberJoin: ICommunityPlatformMemberuser.IAuthorized =
    await api.functional.auth.memberUser.join(connection, {
      body: {
        username: RandomGenerator.name(1),
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(12),
        ip: null,
        href: "https://example.com/signup",
        referrer: "https://example.com/landing",
      } satisfies ICommunityPlatformMemberuser.IJoinRequest,
    });
  typia.assert(memberJoin);

  // 1-2. Extract the memberUserId for later memberUser-scoped operations.
  const memberUserId: string & tags.Format<"uuid"> = memberJoin.id;

  // 2. Create an initial feed preference record for this member user using the
  //    memberUser-scoped endpoint so that ownership is clear and deterministic.
  const initialCreateBody = {
    default_post_sort_mode: "hot",
    show_sensitive_content: false,
    include_recommended_feeds: true,
  } satisfies ICommunityPlatformUserFeedPreferences.ICreate;

  const createdPref: ICommunityPlatformUserFeedPreferences =
    await api.functional.communityPlatform.memberUser.memberUsers.feedPreferences.create(
      connection,
      {
        memberUserId,
        body: initialCreateBody,
      },
    );
  typia.assert(createdPref);

  // Sanity check initial state matches creation payload.
  TestValidator.equals(
    "initial default_post_sort_mode should be hot",
    createdPref.default_post_sort_mode,
    initialCreateBody.default_post_sort_mode,
  );
  TestValidator.equals(
    "initial show_sensitive_content should be false",
    createdPref.show_sensitive_content,
    initialCreateBody.show_sensitive_content,
  );
  TestValidator.equals(
    "initial include_recommended_feeds should be true",
    createdPref.include_recommended_feeds,
    initialCreateBody.include_recommended_feeds,
  );

  const preferenceId: string & tags.Format<"uuid"> = createdPref.id;

  // 3. First update: change only default_post_sort_mode and confirm that boolean
  //    flags remain unchanged. This exercises partial update semantics where omitted
  //    properties are preserved.
  const firstUpdateBody = {
    default_post_sort_mode: "new",
  } satisfies ICommunityPlatformUserFeedPreferences.IUpdate;

  const afterFirstUpdate: ICommunityPlatformUserFeedPreferences =
    await api.functional.communityPlatform.memberUser.userFeedPreferences.update(
      connection,
      {
        preferenceId,
        body: firstUpdateBody,
      },
    );
  typia.assert(afterFirstUpdate);

  TestValidator.equals(
    "after first update, default_post_sort_mode should be updated to new",
    afterFirstUpdate.default_post_sort_mode,
    firstUpdateBody.default_post_sort_mode,
  );
  TestValidator.equals(
    "after first update, show_sensitive_content should remain false",
    afterFirstUpdate.show_sensitive_content,
    createdPref.show_sensitive_content,
  );
  TestValidator.equals(
    "after first update, include_recommended_feeds should remain true",
    afterFirstUpdate.include_recommended_feeds,
    createdPref.include_recommended_feeds,
  );

  // 4. Second update: change only boolean flags while leaving default_post_sort_mode
  //    unchanged, again relying on partial update semantics.
  const secondUpdateBody = {
    show_sensitive_content: true,
    include_recommended_feeds: false,
  } satisfies ICommunityPlatformUserFeedPreferences.IUpdate;

  const afterSecondUpdate: ICommunityPlatformUserFeedPreferences =
    await api.functional.communityPlatform.memberUser.userFeedPreferences.update(
      connection,
      {
        preferenceId,
        body: secondUpdateBody,
      },
    );
  typia.assert(afterSecondUpdate);

  TestValidator.equals(
    "after second update, default_post_sort_mode should remain from first update (new)",
    afterSecondUpdate.default_post_sort_mode,
    afterFirstUpdate.default_post_sort_mode,
  );
  TestValidator.equals(
    "after second update, show_sensitive_content should be updated to true",
    afterSecondUpdate.show_sensitive_content,
    secondUpdateBody.show_sensitive_content,
  );
  TestValidator.equals(
    "after second update, include_recommended_feeds should be updated to false",
    afterSecondUpdate.include_recommended_feeds,
    secondUpdateBody.include_recommended_feeds,
  );

  // 5. Third update: demonstrate that another valid change of sort mode still
  //    composes correctly with the previously updated boolean flags.
  const thirdUpdateBody = {
    default_post_sort_mode: "top",
  } satisfies ICommunityPlatformUserFeedPreferences.IUpdate;

  const afterThirdUpdate: ICommunityPlatformUserFeedPreferences =
    await api.functional.communityPlatform.memberUser.userFeedPreferences.update(
      connection,
      {
        preferenceId,
        body: thirdUpdateBody,
      },
    );
  typia.assert(afterThirdUpdate);

  TestValidator.equals(
    "after third update, default_post_sort_mode should be updated to top",
    afterThirdUpdate.default_post_sort_mode,
    thirdUpdateBody.default_post_sort_mode,
  );
  TestValidator.equals(
    "after third update, show_sensitive_content should stay true",
    afterThirdUpdate.show_sensitive_content,
    afterSecondUpdate.show_sensitive_content,
  );
  TestValidator.equals(
    "after third update, include_recommended_feeds should stay false",
    afterThirdUpdate.include_recommended_feeds,
    afterSecondUpdate.include_recommended_feeds,
  );

  // 6. The original scenario requested an invalid default_post_sort_mode update to
  //    provoke a validation error. However, the SDK surface for update() is
  //    strongly typed and always returns a success DTO type
  //    (ICommunityPlatformUserFeedPreferences) rather than an error wrapper. In
  //    addition, type-level safety rules prohibit constructing deliberately invalid
  //    payloads using `as any` or mismatched field types. Therefore, this test
  //    intentionally omits the invalid-mode error case and focuses exclusively on
  //    verifying partial update semantics and value preservation across multiple
  //    valid updates.
}
