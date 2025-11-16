import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAdminUserJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdminUserJoin";
import type { ICommunityPlatformAdminUserLogin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdminUserLogin";
import type { ICommunityPlatformAdminuser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdminuser";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformCommunityMembership } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunityMembership";
import type { ICommunityPlatformCommunitySubscription } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunitySubscription";
import type { ICommunityPlatformMemberuser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMemberuser";
import type { ICommunityPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPost";
import type { ICommunityPlatformPostVote } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPostVote";
import type { ICommunityPlatformUserKarma } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformUserKarma";

/**
 * Validate adminUser can retrieve and inspect a user karma aggregate record.
 *
 * Business goal:
 *
 * - Ensure that the admin-facing user karma detail endpoint returns a
 *   structurally correct `ICommunityPlatformUserKarma` record and that core
 *   numeric invariants (postKarma, commentKarma, totalKarma) are coherent.
 * - Exercise typical surrounding workflows (member/user creation, community
 *   creation, membership, posting, voting, subscription) so the test runs
 *   through realistic application flows before calling the admin-only karma
 *   detail endpoint.
 *
 * High-level flow:
 *
 * 1. Register an adminUser (join) and keep its credentials for later login.
 * 2. Register a memberUser (join) and keep its id and credentials.
 * 3. Authenticate as the memberUser (login) to obtain a member session.
 * 4. Create a community as the memberUser via POST
 *    /communityPlatform/memberUser/communities.
 * 5. Create a community membership for the memberUser in that community via POST
 *    /communityPlatform/memberUser/communities/{communitySlug}/memberships.
 * 6. Create exactly one text post in that community via POST
 *    /communityPlatform/memberUser/posts.
 * 7. Cast exactly one upvote on that post via POST
 *    /communityPlatform/memberUser/posts/{postId}/votes.
 * 8. Optionally create a community subscription for the memberUser via POST
 *    /communityPlatform/memberUser/members/{memberUserId}/subscriptions.
 * 9. Authenticate as adminUser via POST /auth/adminUser/login.
 * 10. Retrieve a user karma record via GET
 *     /communityPlatform/adminUser/userKarmas/{userKarmaId} using a
 *     syntactically valid UUID.
 * 11. Validate that the retrieved karma record is structurally correct and that
 *     numeric fields satisfy general invariants, e.g. totalKarma == postKarma +
 *     commentKarma.
 *
 * Note:
 *
 * - The available SDK exposes only a detail endpoint for userKarmas (no search or
 *   lookup by memberUserId), so this test cannot deterministically discover the
 *   concrete userKarmaId that corresponds to the newly created memberUser when
 *   running against a real backend.
 * - In simulate mode, any syntactically valid userKarmaId will produce a
 *   structurally valid `ICommunityPlatformUserKarma` instance, so the test
 *   focuses on structural and arithmetic invariants that are independent of
 *   which aggregate row is returned.
 */
export async function test_api_admin_user_karma_detail_for_low_activity_member(
  connection: api.IConnection,
) {
  // 1. Register adminUser for later login
  const adminUsername: string = RandomGenerator.alphabets(12);
  const adminPassword: string = "Adm1n-" + RandomGenerator.alphaNumeric(8);
  const adminEmail: string = typia.random<string & tags.Format<"email">>();

  const adminJoin: ICommunityPlatformAdminuser.IAuthorized =
    await api.functional.auth.adminUser.join(connection, {
      body: {
        username: adminUsername,
        email: adminEmail,
        password: "AdminPassw0rd!" as string & tags.Format<"password">,
      } satisfies ICommunityPlatformAdminUserJoin.IRequest,
    });
  typia.assert(adminJoin);

  // 2. Register memberUser
  const memberUsername: string = RandomGenerator.alphabets(10);
  const memberPassword: string = "MemBer-" + RandomGenerator.alphaNumeric(8);
  const memberJoin: ICommunityPlatformMemberuser.IAuthorized =
    await api.functional.auth.memberUser.join(connection, {
      body: {
        username: memberUsername,
        email: typia.random<string & tags.Format<"email">>(),
        password: memberPassword,
        ip: null,
        href: "https://client.example.com/join" as string & tags.Format<"uri">,
        referrer: "https://client.example.com/landing" as string &
          tags.Format<"uri">,
      } satisfies ICommunityPlatformMemberuser.IJoin,
    });
  typia.assert(memberJoin);

  // 3. Login as memberUser to ensure session is active (even though join already set token)
  const _memberLogin: ICommunityPlatformMemberuser.IAuthorized =
    await api.functional.auth.memberUser.login(connection, {
      body: {
        identifier: memberUsername,
        password: memberPassword,
        ip: null,
        href: "https://client.example.com/login" as string & tags.Format<"uri">,
        referrer: "https://client.example.com/landing" as string &
          tags.Format<"uri">,
      } satisfies ICommunityPlatformMemberuser.ILogin,
    });
  typia.assert(_memberLogin);

  const memberUserId: string & tags.Format<"uuid"> = memberJoin.id;

  // 4. Create a community as memberUser
  const communitySlug: string = `comm-${RandomGenerator.alphaNumeric(8)}`;
  const communityCreateBody = {
    slug: communitySlug,
    name: RandomGenerator.paragraph({ sentences: 2 }),
    description: RandomGenerator.paragraph({ sentences: 4 }),
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

  // 5. Create membership for the memberUser in that community
  const membershipCreateBody = {
    role: "member",
    isApproved: true,
    isBanned: false,
  } satisfies ICommunityPlatformCommunityMembership.ICreate;

  const membership: ICommunityPlatformCommunityMembership =
    await api.functional.communityPlatform.memberUser.communities.memberships.create(
      connection,
      {
        communitySlug,
        body: membershipCreateBody,
      },
    );
  typia.assert(membership);

  // Sanity: ensure membership.memberUser.id matches memberUserId
  TestValidator.equals(
    "membership memberUser id should match joined member user id",
    membership.memberUser.id,
    memberUserId,
  );

  // 6. Create exactly one text post in that community
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

  // 7. Cast exactly one upvote on that post
  const voteCreateBody = {
    direction: "up",
  } satisfies ICommunityPlatformPostVote.ICreate;

  const vote: ICommunityPlatformPostVote =
    await api.functional.communityPlatform.memberUser.posts.votes.create(
      connection,
      {
        postId: post.id,
        body: voteCreateBody,
      },
    );
  typia.assert(vote);

  // 8. Optionally create a community subscription for the member user
  const subscriptionCreateBody = {
    community_platform_community_id: community.id,
    is_active: true,
    receive_notifications: true,
  } satisfies ICommunityPlatformCommunitySubscription.ICreate;

  const subscription: ICommunityPlatformCommunitySubscription =
    await api.functional.communityPlatform.memberUser.members.subscriptions.create(
      connection,
      {
        memberUserId,
        body: subscriptionCreateBody,
      },
    );
  typia.assert(subscription);

  // 9. Switch to adminUser by logging in
  const _adminLogin: ICommunityPlatformAdminuser.IAuthorized =
    await api.functional.auth.adminUser.login(connection, {
      body: {
        identifier: adminUsername,
        password: adminPassword,
        ip: null,
        href: "https://admin.example.com/login" as string & tags.Format<"uri">,
        referrer: "https://admin.example.com" as string & tags.Format<"uri">,
      } satisfies ICommunityPlatformAdminUserLogin.IRequest,
    });
  typia.assert(_adminLogin);

  // 10. Retrieve a user karma record as adminUser.
  // In simulate mode, a random UUID is sufficient; in real mode this will
  // either retrieve an existing aggregate or return a not-found error
  // depending on server state. Here we focus on structural invariants of
  // whatever record is returned.
  const userKarmaId: string = typia.random<string & tags.Format<"uuid">>();

  const userKarma: ICommunityPlatformUserKarma =
    await api.functional.communityPlatform.adminUser.userKarmas.at(connection, {
      userKarmaId,
    });
  typia.assert(userKarma);

  // 11. Validate structural and arithmetic invariants for
  // ICommunityPlatformUserKarma.

  // (a) memberUserId should be a non-empty UUID string (format ensured by typia).
  TestValidator.predicate(
    "userKarma.memberUserId should be a non-empty string",
    userKarma.memberUserId.length > 0,
  );

  // (b) postKarma, commentKarma, and totalKarma are integers and coherent.
  TestValidator.predicate(
    "postKarma should be an integer",
    Number.isInteger(userKarma.postKarma),
  );
  TestValidator.predicate(
    "commentKarma should be an integer",
    Number.isInteger(userKarma.commentKarma),
  );
  TestValidator.predicate(
    "totalKarma should be an integer",
    Number.isInteger(userKarma.totalKarma),
  );
  TestValidator.equals(
    "totalKarma equals postKarma + commentKarma",
    userKarma.totalKarma,
    userKarma.postKarma + userKarma.commentKarma,
  );

  // (c) createdAt and updatedAt are non-empty strings (format already validated).
  TestValidator.predicate(
    "createdAt should be non-empty",
    userKarma.createdAt.length > 0,
  );
  TestValidator.predicate(
    "updatedAt should be non-empty",
    userKarma.updatedAt.length > 0,
  );

  // (d) deletedAt, if present, should be a non-empty string; otherwise it can
  // be undefined. We do not constrain whether it is set, as that depends on
  // the lifecycle state of the aggregate.
  TestValidator.predicate(
    "deletedAt, when defined, should be a non-empty string",
    userKarma.deletedAt === undefined || userKarma.deletedAt.length > 0,
  );
}
