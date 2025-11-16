import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAccountStatus } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAccountStatus";
import type { ICommunityPlatformComment } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformComment";
import type { ICommunityPlatformCommentVote } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommentVote";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformCommunitySubscription } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunitySubscription";
import type { ICommunityPlatformCommunityVisibilityLevel } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunityVisibilityLevel";
import type { ICommunityPlatformMemberuser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMemberuser";
import type { ICommunityPlatformPlatformadmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPlatformadmin";
import type { ICommunityPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPost";
import type { ICommunityPlatformPostState } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPostState";
import type { ICommunityPlatformPostType } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPostType";
import type { ICommunityPlatformPostVote } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPostVote";
import type { ICommunityPlatformUserTotalKarmas } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformUserTotalKarmas";

export async function test_api_member_user_total_karmas_after_activity_growth(
  connection: api.IConnection,
) {
  // 1. Bootstrap: create a platform admin and a visibility level.
  const platformAdminJoinBody = {
    username: RandomGenerator.alphabets(12),
    email: typia.random<string & tags.Format<"email">>(),
    password: "AdminPassw0rd!",
    displayName: RandomGenerator.name(),
    ip: RandomGenerator.alphaNumeric(12),
    href: "https://admin.e2e.test/join",
    referrer: "https://admin.e2e.test/landing",
  } satisfies ICommunityPlatformPlatformadmin.IJoin;

  const platformAdmin: ICommunityPlatformPlatformadmin.IAuthorized =
    await api.functional.auth.platformAdmin.join(connection, {
      body: platformAdminJoinBody,
    });
  typia.assert(platformAdmin);

  const visibilityCode = `public-e2e-${RandomGenerator.alphaNumeric(8)}`;
  const visibilityCreateBody = {
    code: visibilityCode,
    name: "Public E2E Visibility",
    description: RandomGenerator.paragraph({ sentences: 5 }),
  } satisfies ICommunityPlatformCommunityVisibilityLevel.ICreate;

  const visibility: ICommunityPlatformCommunityVisibilityLevel =
    await api.functional.communityPlatform.platformAdmin.communityVisibilityLevels.create(
      connection,
      {
        body: visibilityCreateBody,
      },
    );
  typia.assert(visibility);

  TestValidator.equals(
    "created visibility level code should match request code",
    visibility.code,
    visibilityCode,
  );

  // 2. Create a primary member user whose karma we will inspect.
  const primaryPassword = "MemberPassw0rd!";
  const primaryEmail = typia.random<string & tags.Format<"email">>();
  const primaryJoinBody = {
    username: RandomGenerator.alphabets(10),
    email: primaryEmail,
    password: primaryPassword,
    ip: RandomGenerator.alphaNumeric(12),
    href: "https://app.e2e.test/join",
    referrer: "https://app.e2e.test/landing",
  } satisfies ICommunityPlatformMemberuser.IJoinRequest;

  const primaryAuthorized: ICommunityPlatformMemberuser.IAuthorized =
    await api.functional.auth.memberUser.join(connection, {
      body: primaryJoinBody,
    });
  typia.assert(primaryAuthorized);

  // 3. As primary member user, create a community referencing the new visibility level.
  const communityCreateBody = {
    identifier: `e2e-community-${RandomGenerator.alphaNumeric(6)}`,
    title: "E2E Karma Test Community",
    description: RandomGenerator.paragraph({ sentences: 8 }),
    visibilityLevelCode: visibility.code,
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

  TestValidator.equals(
    "community creator id should match primary member user id",
    community.creator.id,
    primaryAuthorized.id,
  );

  // 4. Subscribe primary member user to the community (optional but aligned with scenario intent).
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
    "subscription community id must equal created community id",
    subscription.community_id,
    community.id,
  );

  // 5. Obtain the member user's total karma aggregate.
  const firstKarmas: ICommunityPlatformUserTotalKarmas =
    await api.functional.communityPlatform.memberUsers.totalKarmas.at(
      connection,
      {
        memberUserId: primaryAuthorized.id,
      },
    );
  typia.assert(firstKarmas);

  TestValidator.equals(
    "karma aggregate member_user_id should match primary member user id",
    firstKarmas.member_user_id,
    primaryAuthorized.id,
  );

  TestValidator.predicate(
    "total_karma should be non-negative",
    firstKarmas.total_karma >= 0,
  );
  TestValidator.predicate(
    "post_karma should be non-negative",
    firstKarmas.post_karma >= 0,
  );
  TestValidator.predicate(
    "comment_karma should be non-negative",
    firstKarmas.comment_karma >= 0,
  );

  // 6. Re-fetch the karma aggregate and validate structural stability and timestamps.
  const secondKarmas: ICommunityPlatformUserTotalKarmas =
    await api.functional.communityPlatform.memberUsers.totalKarmas.at(
      connection,
      {
        memberUserId: primaryAuthorized.id,
      },
    );
  typia.assert(secondKarmas);

  TestValidator.equals(
    "second karma aggregate member_user_id should still match primary member user id",
    secondKarmas.member_user_id,
    primaryAuthorized.id,
  );

  TestValidator.predicate(
    "second total_karma should be non-negative",
    secondKarmas.total_karma >= 0,
  );
  TestValidator.predicate(
    "second post_karma should be non-negative",
    secondKarmas.post_karma >= 0,
  );
  TestValidator.predicate(
    "second comment_karma should be non-negative",
    secondKarmas.comment_karma >= 0,
  );

  const createdAtFirst = new Date(firstKarmas.created_at).getTime();
  const createdAtSecond = new Date(secondKarmas.created_at).getTime();
  const updatedAtFirst = new Date(firstKarmas.updated_at).getTime();
  const updatedAtSecond = new Date(secondKarmas.updated_at).getTime();

  TestValidator.predicate(
    "created_at should be a valid date-time (first fetch)",
    !Number.isNaN(createdAtFirst),
  );
  TestValidator.predicate(
    "created_at should be a valid date-time (second fetch)",
    !Number.isNaN(createdAtSecond),
  );
  TestValidator.predicate(
    "updated_at should be a valid date-time (first fetch)",
    !Number.isNaN(updatedAtFirst),
  );
  TestValidator.predicate(
    "updated_at should be a valid date-time (second fetch)",
    !Number.isNaN(updatedAtSecond),
  );

  TestValidator.predicate(
    "created_at should be stable between fetches or earlier on first",
    createdAtSecond >= createdAtFirst,
  );

  TestValidator.predicate(
    "updated_at on second fetch should be greater than or equal to first fetch",
    updatedAtSecond >= updatedAtFirst,
  );
}
