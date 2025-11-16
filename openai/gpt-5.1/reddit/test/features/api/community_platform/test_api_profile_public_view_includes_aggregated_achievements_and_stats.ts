import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAdminUserJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdminUserJoin";
import type { ICommunityPlatformAdminUserLogin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdminUserLogin";
import type { ICommunityPlatformAdminuser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdminuser";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformMemberuser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMemberuser";
import type { ICommunityPlatformUserAchievement } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformUserAchievement";
import type { ICommunityPlatformUserProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformUserProfile";
import type { ICommunityPlatformUserProfilePublicView } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformUserProfilePublicView";

export async function test_api_profile_public_view_includes_aggregated_achievements_and_stats(
  connection: api.IConnection,
) {
  // 1. Register a new member user (memberUser.join) to get an authenticated member context.
  const memberUsernameRaw: string = RandomGenerator.name(1).replace(/\s+/g, "");
  const memberUsername: string =
    memberUsernameRaw.length < 3
      ? `${memberUsernameRaw}${"x".repeat(3 - memberUsernameRaw.length)}`
      : memberUsernameRaw.slice(0, 32);
  const memberEmail: string & tags.Format<"email"> = typia.random<
    string & tags.Format<"email">
  >();
  const memberPassword: string = RandomGenerator.alphaNumeric(12);
  const memberHref: string & tags.Format<"uri"> = typia.random<
    string & tags.Format<"uri">
  >();
  const memberReferrer: string & tags.Format<"uri"> = typia.random<
    string & tags.Format<"uri">
  >();

  const memberJoinBody = {
    username: memberUsername,
    email: memberEmail,
    password: memberPassword,
    ip: null,
    href: memberHref,
    referrer: memberReferrer,
  } satisfies ICommunityPlatformMemberuser.IJoin;

  const memberAuthorized: ICommunityPlatformMemberuser.IAuthorized =
    await api.functional.auth.memberUser.join(connection, {
      body: memberJoinBody,
    });
  typia.assert(memberAuthorized);

  // Derive profile handle from the member username as the only feasible mapping.
  const profileHandle: string = memberAuthorized.username;

  // 2. As the authenticated memberUser, create at least one community.
  const communityCreateBody = {
    slug: RandomGenerator.alphaNumeric(16),
    name: RandomGenerator.paragraph({ sentences: 2 }),
    description: RandomGenerator.paragraph({ sentences: 5 }),
    visibility: "public",
    status: "active",
    is_nsfw: false,
    is_quarantined: false,
    is_posting_restricted: false,
    allow_text_posts: true,
    allow_link_posts: true,
    allow_image_posts: true,
  } satisfies ICommunityPlatformCommunity.ICreate;

  const community: ICommunityPlatformCommunity =
    await api.functional.communityPlatform.memberUser.communities.create(
      connection,
      {
        body: communityCreateBody,
      },
    );
  typia.assert(community);

  // 3. Register a new adminUser (adminUser.join) to obtain an admin context.
  const adminUsernameRaw: string = RandomGenerator.name(1).replace(/\s+/g, "");
  const adminUsername: string =
    adminUsernameRaw.length < 3
      ? `${adminUsernameRaw}${"y".repeat(3 - adminUsernameRaw.length)}`
      : adminUsernameRaw.slice(0, 32);
  const adminEmail: string & tags.Format<"email"> = typia.random<
    string & tags.Format<"email">
  >();
  const adminPassword: string & tags.Format<"password"> = typia.random<
    string & tags.Format<"password">
  >();

  const adminJoinBody = {
    username: adminUsername,
    email: adminEmail,
    password: adminPassword,
  } satisfies ICommunityPlatformAdminUserJoin.IRequest;

  const adminAuthorized: ICommunityPlatformAdminuser.IAuthorized =
    await api.functional.auth.adminUser.join(connection, {
      body: adminJoinBody,
    });
  typia.assert(adminAuthorized);

  // 4. As adminUser, grant at least one achievement to the member profile identified by handle.
  const achievementBody = {
    code: RandomGenerator.alphaNumeric(8),
    category: "karma",
    title: RandomGenerator.paragraph({ sentences: 2 }),
    description: RandomGenerator.paragraph({ sentences: 4 }),
    icon_uri: null,
    status: "earned",
    earned_at: new Date().toISOString(),
  } satisfies ICommunityPlatformUserAchievement.ICreate;

  const achievement: ICommunityPlatformUserAchievement =
    await api.functional.communityPlatform.adminUser.profiles.achievements.create(
      connection,
      {
        handle: profileHandle,
        body: achievementBody,
      },
    );
  typia.assert(achievement);

  // 5. Perform the public profile view as a guest (unauthenticated connection).
  const guestConnection: api.IConnection = {
    ...connection,
    headers: {},
  };

  const publicView: ICommunityPlatformUserProfilePublicView =
    await api.functional.communityPlatform.profiles.publicView.at(
      guestConnection,
      {
        handle: profileHandle,
      },
    );
  typia.assert(publicView);

  // 6. Validate core public view properties and aggregated statistics.

  // Handle should match the path parameter (derived from member username).
  TestValidator.equals(
    "public profile handle matches requested handle",
    publicView.handle,
    profileHandle,
  );

  // displayName should be a non-empty string.
  TestValidator.predicate(
    "displayName is a non-empty string",
    publicView.displayName.length > 0,
  );

  // Karma values must be non-negative integers.
  TestValidator.predicate(
    "karmaTotal is non-negative",
    publicView.karmaTotal >= 0,
  );
  TestValidator.predicate(
    "postKarma is non-negative",
    publicView.postKarma >= 0,
  );
  TestValidator.predicate(
    "commentKarma is non-negative",
    publicView.commentKarma >= 0,
  );

  // Aggregated counts should reflect at least one achievement and one community membership.
  TestValidator.predicate(
    "achievementCount is at least 1",
    publicView.achievementCount >= 1,
  );
  TestValidator.predicate(
    "communityMembershipCount is at least 1",
    publicView.communityMembershipCount >= 1,
  );

  // createdAt is a date-time string; typia.assert already validated the format.
  TestValidator.predicate(
    "createdAt is a non-empty timestamp string",
    publicView.createdAt.length > 0,
  );

  // lastActiveAt, when present, must be a non-empty timestamp string.
  if (publicView.lastActiveAt !== undefined) {
    TestValidator.predicate(
      "lastActiveAt is a non-empty timestamp string when defined",
      publicView.lastActiveAt.length > 0,
    );
  }
}
