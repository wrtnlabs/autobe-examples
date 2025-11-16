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

export async function test_api_post_vote_detail_authorization_enforced_for_non_admin(
  connection: api.IConnection,
) {
  // 1. Prepare actors: platform admin and member user.
  // Create distinct emails and usernames to avoid collisions.
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminUsername = RandomGenerator.alphabets(12);
  const memberEmail = typia.random<string & tags.Format<"email">>();
  const memberUsername = RandomGenerator.alphabets(12);

  const commonHref = "https://community.example.com/join" as string &
    tags.Format<"uri">;
  const commonReferrer = "https://community.example.com/" as string &
    tags.Format<"uri">;

  // 1-1. Platform admin join (also authenticates admin and sets Authorization header).
  const adminAuthorized: ICommunityPlatformPlatformadmin.IAuthorized =
    await api.functional.auth.platformAdmin.join(connection, {
      body: {
        username: adminUsername,
        email: adminEmail,
        password: "AdminPassword!123",
        displayName: RandomGenerator.name(),
        ip: undefined,
        href: commonHref,
        referrer: commonReferrer,
      } satisfies ICommunityPlatformPlatformadmin.IJoin,
    });
  typia.assert(adminAuthorized);

  // 2. As platform admin, create visibility level and post type.
  const visibilityLevelCreate = {
    code: `public-${RandomGenerator.alphaNumeric(6)}`,
    name: "Public Visibility",
    description: RandomGenerator.paragraph({ sentences: 3 }),
  } satisfies ICommunityPlatformCommunityVisibilityLevel.ICreate;

  const visibilityLevel: ICommunityPlatformCommunityVisibilityLevel =
    await api.functional.communityPlatform.platformAdmin.communityVisibilityLevels.create(
      connection,
      {
        body: visibilityLevelCreate,
      },
    );
  typia.assert(visibilityLevel);

  const postTypeCreate = {
    code: `text-${RandomGenerator.alphaNumeric(6)}`,
    name: "Text Post",
    description: RandomGenerator.paragraph({ sentences: 4 }),
  } satisfies ICommunityPlatformPostType.ICreate;

  const postType: ICommunityPlatformPostType =
    await api.functional.communityPlatform.platformAdmin.postTypes.create(
      connection,
      {
        body: postTypeCreate,
      },
    );
  typia.assert(postType);

  // 3. Register and authenticate member user.
  const memberJoinAuthorized: ICommunityPlatformMemberuser.IAuthorized =
    await api.functional.auth.memberUser.join(connection, {
      body: {
        username: memberUsername,
        email: memberEmail,
        password: "MemberPassword!123",
        ip: undefined,
        href: commonHref,
        referrer: commonReferrer,
      } satisfies ICommunityPlatformMemberuser.IJoinRequest,
    });
  typia.assert(memberJoinAuthorized);

  // 4. As member user, create a community.
  const communityCreate = {
    identifier: `community-${RandomGenerator.alphaNumeric(8)}`,
    title: "Authorization Test Community",
    description: RandomGenerator.paragraph({ sentences: 5 }),
    visibilityLevelCode: visibilityLevel.code,
    isNsfw: false,
    primaryTagIds: undefined,
  } satisfies ICommunityPlatformCommunity.ICreate;

  const community: ICommunityPlatformCommunity =
    await api.functional.communityPlatform.memberUser.communities.create(
      connection,
      {
        body: communityCreate,
      },
    );
  typia.assert(community);

  // 5. As member user, create a post under the community.
  const postCreate = {
    community_id: community.id,
    post_type_id: postType.id,
    title: "Authorization boundary check post",
    body: RandomGenerator.paragraph({ sentences: 6 }),
    url: undefined,
    image_uri: undefined,
  } satisfies ICommunityPlatformPost.ICreate;

  const post: ICommunityPlatformPost =
    await api.functional.communityPlatform.memberUser.posts.create(connection, {
      body: postCreate,
    });
  typia.assert(post);

  // 6. As member user, create a vote on the post.
  const voteCreate = {
    community_platform_post_id: post.id,
    vote_value: 1 as number &
      tags.Type<"int32"> &
      tags.Minimum<-1> &
      tags.Maximum<1>,
  } satisfies ICommunityPlatformPostVote.ICreate;

  const memberVote: ICommunityPlatformPostVote =
    await api.functional.communityPlatform.memberUser.postVotes.create(
      connection,
      {
        body: voteCreate,
      },
    );
  typia.assert(memberVote);

  const postVoteId = memberVote.id;

  // 7. Attempt to GET vote detail as member user (non-admin) – expect authorization error.
  await TestValidator.error(
    "member user cannot access admin post vote detail",
    async () => {
      await api.functional.communityPlatform.platformAdmin.postVotes.at(
        connection,
        {
          postVoteId,
        },
      );
    },
  );

  // 8. Attempt to GET vote detail as unauthenticated caller – expect authorization error.
  const unauthenticatedConnection: api.IConnection = {
    ...connection,
    headers: {},
  };

  await TestValidator.error(
    "unauthenticated caller cannot access admin post vote detail",
    async () => {
      await api.functional.communityPlatform.platformAdmin.postVotes.at(
        unauthenticatedConnection,
        {
          postVoteId,
        },
      );
    },
  );

  // 9. Switch back to platform admin and successfully fetch vote detail.
  const adminLoginAuthorized: ICommunityPlatformPlatformadmin.IAuthorized =
    await api.functional.auth.platformAdmin.login(connection, {
      body: {
        identifier: adminEmail,
        password: "AdminPassword!123",
        ip: undefined,
        href: commonHref,
        referrer: commonReferrer,
      } satisfies ICommunityPlatformPlatformadmin.ILogin,
    });
  typia.assert(adminLoginAuthorized);

  const adminVoteView: ICommunityPlatformPostVote =
    await api.functional.communityPlatform.platformAdmin.postVotes.at(
      connection,
      {
        postVoteId,
      },
    );
  typia.assert(adminVoteView);

  // 10. Validate that the admin view corresponds to the original vote and remains unchanged.
  TestValidator.equals(
    "admin view vote id matches original vote id",
    adminVoteView.id,
    memberVote.id,
  );

  TestValidator.equals(
    "admin view vote value matches original vote value",
    adminVoteView.vote_value,
    memberVote.vote_value,
  );

  TestValidator.equals(
    "admin view post id matches original vote post id",
    adminVoteView.community_platform_post_id,
    memberVote.community_platform_post_id,
  );
}
