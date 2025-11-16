import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAdminUserJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdminUserJoin";
import type { ICommunityPlatformAdminUserLogin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdminUserLogin";
import type { ICommunityPlatformAdminuser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdminuser";
import type { ICommunityPlatformComment } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformComment";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformMemberuser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMemberuser";
import type { ICommunityPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPost";
import type { ICommunityPlatformUserAchievement } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformUserAchievement";
import type { ICommunityPlatformUserProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformUserProfile";

/**
 * Validate that an adminUser can update an existing user achievement after a
 * member has created meaningful activity (community, post, comment).
 *
 * Business flow covered by this test:
 *
 * 1. Register a memberUser account and obtain an authenticated context.
 * 2. Register an adminUser account and obtain an authenticated context.
 * 3. As the memberUser, create a community to represent the context of activity.
 * 4. As the same memberUser, create a post in that community.
 * 5. As the same memberUser, create a comment on that post to simulate engagement.
 * 6. Switch to the adminUser context using the login endpoint.
 * 7. As adminUser, grant an initial achievement for the member profile identified
 *    by its handle.
 * 8. As adminUser, update the achievement using the PUT
 *    /communityPlatform/adminUser/profiles/{handle}/achievements/{code}
 *    endpoint, modifying status/title/description/icon_uri/revoked_at.
 * 9. Assert that mutable fields were updated while immutable identifiers (code,
 *    owning profile) remain logically stable and updated_at advanced.
 */
export async function test_api_admin_achievement_update_after_activity(
  connection: api.IConnection,
) {
  // Helper to build href/referrer URIs for authentication flows
  const href: string = "https://example.com/app";
  const referrer: string = "https://example.com/landing";

  // ---------------------------------------------------------
  // 1. Register memberUser (join) -> ICommunityPlatformMemberuser.IAuthorized
  // ---------------------------------------------------------
  const memberUsername: string = RandomGenerator.name(1);
  const memberEmail: string = `${RandomGenerator.alphabets(8)}@member.test`;

  const memberJoinBody = {
    username: memberUsername,
    email: memberEmail as string & tags.Format<"email">,
    password: RandomGenerator.alphaNumeric(12),
    ip: null,
    href: href as string & tags.Format<"uri">,
    referrer: referrer as string & tags.Format<"uri">,
  } satisfies ICommunityPlatformMemberuser.IJoin;

  const memberAuthorized: ICommunityPlatformMemberuser.IAuthorized =
    await api.functional.auth.memberUser.join(connection, {
      body: memberJoinBody,
    });
  typia.assert(memberAuthorized);

  // Use the member's username as the profile handle for achievements.
  const profileHandle: string = memberAuthorized.username;

  // ---------------------------------------------------------
  // 2. Register adminUser (join) -> ICommunityPlatformAdminuser.IAuthorized
  // ---------------------------------------------------------
  const adminJoinBody = {
    username: RandomGenerator.name(1),
    email: `${RandomGenerator.alphabets(8)}@admin.test` as string &
      tags.Format<"email">,
    password: RandomGenerator.alphaNumeric(12) as string &
      tags.Format<"password">,
  } satisfies ICommunityPlatformAdminUserJoin.IRequest;

  const adminAuthorized: ICommunityPlatformAdminuser.IAuthorized =
    await api.functional.auth.adminUser.join(connection, {
      body: adminJoinBody,
    });
  typia.assert(adminAuthorized);

  // ---------------------------------------------------------
  // 3. As memberUser, create a community to contextualize activity
  // The member join has already populated member JWT into connection headers.
  // ---------------------------------------------------------
  const communityCreateBody = {
    slug: RandomGenerator.alphabets(10) as string &
      tags.MinLength<1> &
      tags.MaxLength<128>,
    name: RandomGenerator.paragraph({ sentences: 2 }) as string &
      tags.MinLength<1> &
      tags.MaxLength<255>,
    description: RandomGenerator.paragraph({ sentences: 5 }) as
      | (string & tags.MaxLength<4000>)
      | null
      | undefined,
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
      { body: communityCreateBody },
    );
  typia.assert(community);

  // ---------------------------------------------------------
  // 4. As the same memberUser, create a post in that community
  // ---------------------------------------------------------
  const postCreateBody = {
    communityId: community.id,
    communityCode: community.slug,
    title: RandomGenerator.paragraph({ sentences: 3 }),
    body: RandomGenerator.content({ paragraphs: 1 }),
    url: undefined,
    postType: "text",
  } satisfies ICommunityPlatformPost.ICreate;

  const post: ICommunityPlatformPost =
    await api.functional.communityPlatform.memberUser.posts.create(connection, {
      body: postCreateBody,
    });
  typia.assert(post);

  // ---------------------------------------------------------
  // 5. As the same memberUser, create a comment on that post
  // ---------------------------------------------------------
  const commentCreateBody = {
    content: RandomGenerator.paragraph({ sentences: 2 }) as string &
      tags.MinLength<1> &
      tags.MaxLength<10000>,
    parentCommentId: undefined,
  } satisfies ICommunityPlatformComment.ICreate;

  const comment: ICommunityPlatformComment =
    await api.functional.communityPlatform.memberUser.posts.comments.create(
      connection,
      {
        postId: post.id as string & tags.Format<"uuid">,
        body: commentCreateBody,
      },
    );
  typia.assert(comment);

  // ---------------------------------------------------------
  // 6. Switch to adminUser context via login (explicit actor switch)
  // ---------------------------------------------------------
  const adminLoginBody = {
    identifier: adminJoinBody.email,
    password: adminJoinBody.password,
    ip: null,
    href: href as string & tags.Format<"uri">,
    referrer: referrer as string & tags.Format<"uri">,
  } satisfies ICommunityPlatformAdminUserLogin.IRequest;

  const adminLoginAuthorized: ICommunityPlatformAdminuser.IAuthorized =
    await api.functional.auth.adminUser.login(connection, {
      body: adminLoginBody,
    });
  typia.assert(adminLoginAuthorized);

  // ---------------------------------------------------------
  // 7. As adminUser, create an initial achievement for the member profile
  // ---------------------------------------------------------
  const achievementCode: string = `karma-${RandomGenerator.alphaNumeric(6)}`;

  const achievementCreateBody = {
    code: achievementCode,
    category: "posting",
    title: "Initial Contributor",
    description: RandomGenerator.paragraph({ sentences: 3 }),
    icon_uri: "https://cdn.example.com/icons/karma.png" as string &
      tags.Format<"uri">,
    status: "earned",
    earned_at: new Date().toISOString() as string & tags.Format<"date-time">,
  } satisfies ICommunityPlatformUserAchievement.ICreate;

  const createdAchievement: ICommunityPlatformUserAchievement =
    await api.functional.communityPlatform.adminUser.profiles.achievements.create(
      connection,
      {
        handle: profileHandle,
        body: achievementCreateBody,
      },
    );
  typia.assert(createdAchievement);

  // Sanity checks on created achievement identity fields
  TestValidator.equals(
    "created achievement code should match input code",
    createdAchievement.code,
    achievementCode,
  );
  TestValidator.equals(
    "created achievement profile username should match member username",
    createdAchievement.profile.username,
    profileHandle,
  );

  const beforeUpdateUpdatedAt: string = createdAchievement.updated_at;

  // ---------------------------------------------------------
  // 8. As adminUser, update the achievement via PUT
  // ---------------------------------------------------------
  const updatedTitle = "Revoked Contributor";
  const updatedDescription = RandomGenerator.paragraph({ sentences: 4 });
  const updatedIconUri =
    "https://cdn.example.com/icons/karma_revoked.png" as string &
      tags.Format<"uri">;
  const revokedAt = new Date(Date.now() + 1000).toISOString() as string &
    tags.Format<"date-time">;

  const achievementUpdateBody = {
    status: "revoked",
    title: updatedTitle,
    description: updatedDescription,
    icon_uri: updatedIconUri,
    revoked_at: revokedAt,
  } satisfies ICommunityPlatformUserAchievement.IUpdate;

  const updatedAchievement: ICommunityPlatformUserAchievement =
    await api.functional.communityPlatform.adminUser.profiles.achievements.update(
      connection,
      {
        handle: profileHandle,
        code: achievementCode,
        body: achievementUpdateBody,
      },
    );
  typia.assert(updatedAchievement);

  // ---------------------------------------------------------
  // 9. Assertions: fields updated, identifiers stable, updated_at advanced
  // ---------------------------------------------------------
  TestValidator.equals(
    "achievement code remains immutable after update",
    updatedAchievement.code,
    createdAchievement.code,
  );

  TestValidator.equals(
    "achievement profile id remains the same after update",
    updatedAchievement.profile.id,
    createdAchievement.profile.id,
  );

  TestValidator.equals(
    "updated status should be 'revoked'",
    updatedAchievement.status,
    "revoked",
  );

  TestValidator.equals(
    "updated title should match the new title",
    updatedAchievement.title,
    updatedTitle,
  );

  TestValidator.equals(
    "updated description should match the new description",
    updatedAchievement.description ?? null,
    updatedDescription,
  );

  TestValidator.equals(
    "updated icon_uri should match the new icon URI",
    updatedAchievement.icon_uri ?? null,
    updatedIconUri,
  );

  TestValidator.equals(
    "revoked_at should be set as provided",
    updatedAchievement.revoked_at ?? null,
    revokedAt,
  );

  TestValidator.predicate(
    "updated_at should be later than or equal to previous updated_at",
    new Date(updatedAchievement.updated_at).getTime() >=
      new Date(beforeUpdateUpdatedAt).getTime(),
  );
}
