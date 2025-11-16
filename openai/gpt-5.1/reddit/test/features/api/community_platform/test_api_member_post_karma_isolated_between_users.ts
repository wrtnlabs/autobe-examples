import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAccountStatus } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAccountStatus";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformCommunityVisibilityLevel } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunityVisibilityLevel";
import type { ICommunityPlatformMemberuser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMemberuser";
import type { ICommunityPlatformPlatformadmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPlatformadmin";
import type { ICommunityPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPost";
import type { ICommunityPlatformPostState } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPostState";
import type { ICommunityPlatformPostType } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPostType";
import type { ICommunityPlatformPostVote } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPostVote";
import type { ICommunityPlatformUserPostKarmas } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformUserPostKarmas";

export async function test_api_member_post_karma_isolated_between_users(
  connection: api.IConnection,
) {
  // 1. Join two distinct member users A and B
  const memberAEmail: string & tags.Format<"email"> = typia.random<
    string & tags.Format<"email">
  >();
  const memberBEmail: string & tags.Format<"email"> = typia.random<
    string & tags.Format<"email">
  >();

  const memberAUsername: string = RandomGenerator.alphabets(12);
  const memberBUsername: string = RandomGenerator.alphabets(12);

  const memberAPassword = "PasswordA!123";
  const memberBPassword = "PasswordB!123";

  const memberAJoin = await api.functional.auth.memberUser.join(connection, {
    body: {
      username: memberAUsername,
      email: memberAEmail,
      password: memberAPassword,
      ip: null,
      href: "https://client.example.com/joinA",
      referrer: "https://client.example.com/landing",
    } satisfies ICommunityPlatformMemberuser.IJoinRequest,
  });
  typia.assert<ICommunityPlatformMemberuser.IAuthorized>(memberAJoin);

  const memberAId = memberAJoin.id;

  const memberBJoin = await api.functional.auth.memberUser.join(connection, {
    body: {
      username: memberBUsername,
      email: memberBEmail,
      password: memberBPassword,
      ip: null,
      href: "https://client.example.com/joinB",
      referrer: "https://client.example.com/landing",
    } satisfies ICommunityPlatformMemberuser.IJoinRequest,
  });
  typia.assert<ICommunityPlatformMemberuser.IAuthorized>(memberBJoin);
  const memberBId = memberBJoin.id;

  // 2. Join as platform admin
  const adminEmail: string & tags.Format<"email"> = typia.random<
    string & tags.Format<"email">
  >();
  const adminPassword = "AdminPass!123";

  const adminJoin = await api.functional.auth.platformAdmin.join(connection, {
    body: {
      username: RandomGenerator.alphabets(10),
      email: adminEmail,
      password: adminPassword,
      displayName: RandomGenerator.name(),
      ip: "203.0.113.10",
      href: "https://admin.example.com/join",
      referrer: "https://admin.example.com/landing",
    } satisfies ICommunityPlatformPlatformadmin.IJoin,
  });
  typia.assert<ICommunityPlatformPlatformadmin.IAuthorized>(adminJoin);

  // 3. As platform admin, create a post type definition
  const postTypeCode = `karma_test_${RandomGenerator.alphabets(8)}`;
  const postTypeCreate =
    await api.functional.communityPlatform.platformAdmin.postTypes.create(
      connection,
      {
        body: {
          code: postTypeCode,
          name: "Karma Test Text Post",
          description:
            "Post type used for validating per-user post karma isolation in tests.",
        } satisfies ICommunityPlatformPostType.ICreate,
      },
    );
  typia.assert<ICommunityPlatformPostType>(postTypeCreate);
  const postTypeId = postTypeCreate.id;

  // 4. Switch authentication context to memberUserA via login
  const memberALogin = await api.functional.auth.memberUser.login(connection, {
    body: {
      identifier: memberAEmail,
      password: memberAPassword,
      ip: null,
      href: "https://client.example.com/loginA",
      referrer: "https://client.example.com/landing",
    } satisfies ICommunityPlatformMemberuser.ILoginRequest,
  });
  typia.assert<ICommunityPlatformMemberuser.IAuthorized>(memberALogin);

  // 5. As memberUserA, create a community
  const communityIdentifier = `karma-community-${RandomGenerator.alphabets(8)}`;
  const communityCreate =
    await api.functional.communityPlatform.memberUser.communities.create(
      connection,
      {
        body: {
          identifier: communityIdentifier,
          title: "Karma Isolation Test Community",
          description:
            "Community created solely for verifying that post karma is isolated between different authors.",
          visibilityLevelCode: "public",
          isNsfw: false,
          primaryTagIds: [],
        } satisfies ICommunityPlatformCommunity.ICreate,
      },
    );
  typia.assert<ICommunityPlatformCommunity>(communityCreate);
  const communityId = communityCreate.id;

  // 6. As memberUserA, create one post in the community
  const postACreate =
    await api.functional.communityPlatform.memberUser.posts.create(connection, {
      body: {
        community_id: communityId,
        post_type_id: postTypeId,
        title: "Member A Post for Karma Isolation",
        body: RandomGenerator.paragraph({ sentences: 5 }),
        url: null,
        image_uri: null,
      } satisfies ICommunityPlatformPost.ICreate,
    });
  typia.assert<ICommunityPlatformPost>(postACreate);
  const postAId = postACreate.id;

  // 7. Switch authentication to memberUserB via login
  const memberBLogin = await api.functional.auth.memberUser.login(connection, {
    body: {
      identifier: memberBEmail,
      password: memberBPassword,
      ip: null,
      href: "https://client.example.com/loginB",
      referrer: "https://client.example.com/landing",
    } satisfies ICommunityPlatformMemberuser.ILoginRequest,
  });
  typia.assert<ICommunityPlatformMemberuser.IAuthorized>(memberBLogin);

  // 8. As memberUserB, create another post in the same community
  const postBCreate =
    await api.functional.communityPlatform.memberUser.posts.create(connection, {
      body: {
        community_id: communityId,
        post_type_id: postTypeId,
        title: "Member B Post for Karma Isolation",
        body: RandomGenerator.paragraph({ sentences: 5 }),
        url: null,
        image_uri: null,
      } satisfies ICommunityPlatformPost.ICreate,
    });
  typia.assert<ICommunityPlatformPost>(postBCreate);
  const postBId = postBCreate.id;

  // 9a. As memberUserA, upvote A's own post (switch auth back to A)
  const memberALoginForVoting = await api.functional.auth.memberUser.login(
    connection,
    {
      body: {
        identifier: memberAEmail,
        password: memberAPassword,
        ip: null,
        href: "https://client.example.com/loginA2",
        referrer: "https://client.example.com/landing",
      } satisfies ICommunityPlatformMemberuser.ILoginRequest,
    },
  );
  typia.assert<ICommunityPlatformMemberuser.IAuthorized>(memberALoginForVoting);

  const voteOnAByA =
    await api.functional.communityPlatform.memberUser.postVotes.create(
      connection,
      {
        body: {
          community_platform_post_id: postAId,
          vote_value: 1,
        } satisfies ICommunityPlatformPostVote.ICreate,
      },
    );
  typia.assert<ICommunityPlatformPostVote>(voteOnAByA);
  void postBId; // ensure postBId is referenced to avoid unused variable concerns

  // 9b. Do NOT cast any votes on B's post so that B's karma should remain zero

  // 10. Query post karma aggregates for both users
  const karmaA =
    await api.functional.communityPlatform.memberUsers.postKarmas.at(
      connection,
      {
        memberUserId: memberAId,
      },
    );
  typia.assert<ICommunityPlatformUserPostKarmas>(karmaA);

  const karmaB =
    await api.functional.communityPlatform.memberUsers.postKarmas.at(
      connection,
      {
        memberUserId: memberBId,
      },
    );
  typia.assert<ICommunityPlatformUserPostKarmas>(karmaB);

  // 11. Assertions: isolation and identity
  TestValidator.equals(
    "karmaA member_user_id should match memberA id",
    karmaA.member_user_id,
    memberAId,
  );
  TestValidator.equals(
    "karmaB member_user_id should match memberB id",
    karmaB.member_user_id,
    memberBId,
  );

  TestValidator.predicate(
    "member A post_karma should be non-negative",
    karmaA.post_karma >= 0,
  );
  TestValidator.predicate(
    "member B post_karma should be non-negative",
    karmaB.post_karma >= 0,
  );

  // We expect that A's karma is strictly greater than B's because only A's post was upvoted.
  TestValidator.predicate(
    "member A post_karma should be greater than member B post_karma when only A's post has an upvote",
    karmaA.post_karma > karmaB.post_karma,
  );
}
