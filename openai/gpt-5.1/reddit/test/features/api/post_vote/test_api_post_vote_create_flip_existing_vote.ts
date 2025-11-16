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

export async function test_api_post_vote_create_flip_existing_vote(
  connection: api.IConnection,
) {
  // 1. Register member user who will create the post and cast votes
  const memberJoinBody = {
    username: RandomGenerator.name(1),
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
    ip: null,
    href: "https://member.example.com/join",
    referrer: "https://member.example.com/landing",
  } satisfies ICommunityPlatformMemberuser.IJoinRequest;

  const memberAuthorized: ICommunityPlatformMemberuser.IAuthorized =
    await api.functional.auth.memberUser.join(connection, {
      body: memberJoinBody,
    });
  typia.assert(memberAuthorized);

  // 2. Register platform admin for master-data setup
  const adminJoinBody = {
    username: RandomGenerator.name(1),
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
    displayName: RandomGenerator.name(2),
    ip: undefined,
    href: "https://admin.example.com/join",
    referrer: "https://admin.example.com/landing",
  } satisfies ICommunityPlatformPlatformadmin.IJoin;

  const adminAuthorized: ICommunityPlatformPlatformadmin.IAuthorized =
    await api.functional.auth.platformAdmin.join(connection, {
      body: adminJoinBody,
    });
  typia.assert(adminAuthorized);

  // 3. As platformAdmin, create a visibility level
  const visibilityCode = `public_${RandomGenerator.alphaNumeric(8)}`;
  const visibilityCreateBody = {
    code: visibilityCode,
    name: "Public Visibility",
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

  // 4. Switch to member user (login) and create community
  const memberLoginBody = {
    identifier: memberJoinBody.email,
    password: memberJoinBody.password,
    ip: null,
    href: "https://member.example.com/login",
    referrer: "https://member.example.com/login-ref",
  } satisfies ICommunityPlatformMemberuser.ILoginRequest;

  const memberLogin: ICommunityPlatformMemberuser.IAuthorized =
    await api.functional.auth.memberUser.login(connection, {
      body: memberLoginBody,
    });
  typia.assert(memberLogin);

  const communityIdentifier = `community_${RandomGenerator.alphaNumeric(8)}`;
  const communityCreateBody = {
    identifier: communityIdentifier,
    title: RandomGenerator.name(3),
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

  // 5. Switch to platformAdmin and create post type
  const adminLoginBody = {
    identifier: adminJoinBody.email,
    password: adminJoinBody.password,
    ip: null,
    href: "https://admin.example.com/login",
    referrer: "https://admin.example.com/login-ref",
  } satisfies ICommunityPlatformPlatformadmin.ILogin;

  const adminLogin: ICommunityPlatformPlatformadmin.IAuthorized =
    await api.functional.auth.platformAdmin.login(connection, {
      body: adminLoginBody,
    });
  typia.assert(adminLogin);

  const postTypeCode = `text_${RandomGenerator.alphaNumeric(6)}`;
  const postTypeCreateBody = {
    code: postTypeCode,
    name: "Text Post",
    description: RandomGenerator.paragraph({ sentences: 6 }),
  } satisfies ICommunityPlatformPostType.ICreate;

  const postType: ICommunityPlatformPostType =
    await api.functional.communityPlatform.platformAdmin.postTypes.create(
      connection,
      {
        body: postTypeCreateBody,
      },
    );
  typia.assert(postType);

  // 6. Switch back to member user and create a post in that community
  const memberLoginAgain: ICommunityPlatformMemberuser.IAuthorized =
    await api.functional.auth.memberUser.login(connection, {
      body: memberLoginBody,
    });
  typia.assert(memberLoginAgain);

  const postCreateBody = {
    community_id: community.id,
    post_type_id: postType.id,
    title: RandomGenerator.paragraph({ sentences: 4 }),
    body: RandomGenerator.content({ paragraphs: 2 }),
    url: null,
    image_uri: null,
  } satisfies ICommunityPlatformPost.ICreate;

  const post: ICommunityPlatformPost =
    await api.functional.communityPlatform.memberUser.posts.create(connection, {
      body: postCreateBody,
    });
  typia.assert(post);

  // 7. Member casts initial downvote (-1) on the post
  const firstVoteBody = {
    community_platform_post_id: post.id,
    vote_value: -1 as number &
      tags.Type<"int32"> &
      tags.Minimum<-1> &
      tags.Maximum<1>,
  } satisfies ICommunityPlatformPostVote.ICreate;

  const firstVote: ICommunityPlatformPostVote =
    await api.functional.communityPlatform.memberUser.postVotes.create(
      connection,
      {
        body: firstVoteBody,
      },
    );
  typia.assert(firstVote);

  // 8. Same member casts upvote (+1) on the same post, expecting update/upsert
  const secondVoteBody = {
    community_platform_post_id: post.id,
    vote_value: 1 as number &
      tags.Type<"int32"> &
      tags.Minimum<-1> &
      tags.Maximum<1>,
  } satisfies ICommunityPlatformPostVote.ICreate;

  const secondVote: ICommunityPlatformPostVote =
    await api.functional.communityPlatform.memberUser.postVotes.create(
      connection,
      {
        body: secondVoteBody,
      },
    );
  typia.assert(secondVote);

  // Core validation: same vote row, flipped value, updated timestamp
  TestValidator.equals(
    "community_platform_post_id should match post.id on both votes",
    firstVote.community_platform_post_id,
    post.id,
  );
  TestValidator.equals(
    "community_platform_post_id should be identical across votes",
    secondVote.community_platform_post_id,
    firstVote.community_platform_post_id,
  );

  TestValidator.equals(
    "member user id should be identical across votes",
    secondVote.community_platform_memberuser_id,
    firstVote.community_platform_memberuser_id,
  );

  TestValidator.equals(
    "vote id should be identical across first and second vote (upsert)",
    secondVote.id,
    firstVote.id,
  );

  TestValidator.equals(
    "first vote_value should be -1",
    firstVote.vote_value,
    -1 as number & tags.Type<"int32"> & tags.Minimum<-1> & tags.Maximum<1>,
  );

  TestValidator.equals(
    "second vote_value should be +1 after flip",
    secondVote.vote_value,
    1 as number & tags.Type<"int32"> & tags.Minimum<-1> & tags.Maximum<1>,
  );

  TestValidator.equals(
    "created_at should stay constant across vote updates",
    secondVote.created_at,
    firstVote.created_at,
  );

  TestValidator.predicate(
    "updated_at of second vote should be greater than first",
    new Date(secondVote.updated_at).getTime() >
      new Date(firstVote.updated_at).getTime(),
  );

  // 9-10. Optional: verify via admin GET that only one record exists with updated value
  const adminLoginAgain: ICommunityPlatformPlatformadmin.IAuthorized =
    await api.functional.auth.platformAdmin.login(connection, {
      body: adminLoginBody,
    });
  typia.assert(adminLoginAgain);

  const adminViewVote: ICommunityPlatformPostVote =
    await api.functional.communityPlatform.platformAdmin.postVotes.at(
      connection,
      {
        postVoteId: firstVote.id,
      },
    );
  typia.assert(adminViewVote);

  TestValidator.equals(
    "admin view vote id should equal original vote id",
    adminViewVote.id,
    firstVote.id,
  );

  TestValidator.equals(
    "admin view vote_value should reflect flipped +1",
    adminViewVote.vote_value,
    secondVote.vote_value,
  );

  TestValidator.equals(
    "admin view created_at should equal original created_at",
    adminViewVote.created_at,
    firstVote.created_at,
  );

  TestValidator.equals(
    "admin view updated_at should equal secondVote.updated_at",
    adminViewVote.updated_at,
    secondVote.updated_at,
  );
}
