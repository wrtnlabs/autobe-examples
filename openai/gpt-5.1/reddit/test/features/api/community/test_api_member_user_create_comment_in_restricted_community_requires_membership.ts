import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAccountStatus } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAccountStatus";
import type { ICommunityPlatformComment } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformComment";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformCommunityVisibilityLevel } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunityVisibilityLevel";
import type { ICommunityPlatformMemberuser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMemberuser";
import type { ICommunityPlatformPlatformadmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPlatformadmin";
import type { ICommunityPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPost";
import type { ICommunityPlatformPostState } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPostState";
import type { ICommunityPlatformPostType } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPostType";

export async function test_api_member_user_create_comment_in_restricted_community_requires_membership(
  connection: api.IConnection,
) {
  // 1. Register and authenticate a platform admin (join already authenticates)
  const platformAdminEmail: string & tags.Format<"email"> = typia.random<
    string & tags.Format<"email">
  >();

  const platformAdminJoinBody = {
    username: RandomGenerator.alphabets(12),
    email: platformAdminEmail,
    password: RandomGenerator.alphaNumeric(16),
    displayName: RandomGenerator.name(),
    ip: undefined,
    href: "https://admin.console.example.com/auth/join",
    referrer: "https://admin.console.example.com/",
  } satisfies ICommunityPlatformPlatformadmin.IJoin;

  const platformAdmin: ICommunityPlatformPlatformadmin.IAuthorized =
    await api.functional.auth.platformAdmin.join(connection, {
      body: platformAdminJoinBody,
    });
  typia.assert<ICommunityPlatformPlatformadmin.IAuthorized>(platformAdmin);

  // 2. Create a restricted/private visibility level as platformAdmin
  const restrictedVisibilityCode = `restricted-${RandomGenerator.alphaNumeric(8)}`;

  const visibilityCreateBody = {
    code: restrictedVisibilityCode,
    name: "Restricted members-only",
    description:
      "Only approved or member users may see and interact with this community.",
  } satisfies ICommunityPlatformCommunityVisibilityLevel.ICreate;

  const visibilityLevel: ICommunityPlatformCommunityVisibilityLevel =
    await api.functional.communityPlatform.platformAdmin.communityVisibilityLevels.create(
      connection,
      {
        body: visibilityCreateBody,
      },
    );
  typia.assert<ICommunityPlatformCommunityVisibilityLevel>(visibilityLevel);

  TestValidator.equals(
    "visibility level code should match the requested code",
    visibilityLevel.code,
    restrictedVisibilityCode,
  );

  // 3. Register memberOwner and memberStranger via memberUser.join
  const memberOwnerEmail: string & tags.Format<"email"> = typia.random<
    string & tags.Format<"email">
  >();
  const memberStrangerEmail: string & tags.Format<"email"> = typia.random<
    string & tags.Format<"email">
  >();

  const memberOwnerPassword = RandomGenerator.alphaNumeric(12);
  const memberStrangerPassword = RandomGenerator.alphaNumeric(12);

  const memberOwnerJoinBody = {
    username: `owner_${RandomGenerator.alphabets(8)}`,
    email: memberOwnerEmail,
    password: memberOwnerPassword,
    ip: null,
    href: "https://community.example.com/auth/join",
    referrer: "https://community.example.com/landing",
  } satisfies ICommunityPlatformMemberuser.IJoinRequest;

  const memberOwner: ICommunityPlatformMemberuser.IAuthorized =
    await api.functional.auth.memberUser.join(connection, {
      body: memberOwnerJoinBody,
    });
  typia.assert<ICommunityPlatformMemberuser.IAuthorized>(memberOwner);

  const memberStrangerJoinBody = {
    username: `stranger_${RandomGenerator.alphabets(8)}`,
    email: memberStrangerEmail,
    password: memberStrangerPassword,
    ip: null,
    href: "https://community.example.com/auth/join",
    referrer: "https://community.example.com/landing",
  } satisfies ICommunityPlatformMemberuser.IJoinRequest;

  const memberStranger: ICommunityPlatformMemberuser.IAuthorized =
    await api.functional.auth.memberUser.join(connection, {
      body: memberStrangerJoinBody,
    });
  typia.assert<ICommunityPlatformMemberuser.IAuthorized>(memberStranger);

  // 4. Switch to memberOwner via login to ensure current actor
  const memberOwnerLoginBody = {
    identifier: memberOwnerEmail,
    password: memberOwnerPassword,
    ip: null,
    href: "https://community.example.com/auth/login",
    referrer: "https://community.example.com/",
  } satisfies ICommunityPlatformMemberuser.ILoginRequest;

  const memberOwnerAuthorizedAgain: ICommunityPlatformMemberuser.IAuthorized =
    await api.functional.auth.memberUser.login(connection, {
      body: memberOwnerLoginBody,
    });
  typia.assert<ICommunityPlatformMemberuser.IAuthorized>(
    memberOwnerAuthorizedAgain,
  );

  TestValidator.equals(
    "memberOwner login should return the same user id as join",
    memberOwnerAuthorizedAgain.id,
    memberOwner.id,
  );

  // 5. As memberOwner, create a restricted community
  const communityCreateBody = {
    identifier: `community_${RandomGenerator.alphabets(10)}`,
    title: "Restricted Community for Members",
    description: RandomGenerator.paragraph({ sentences: 6 }),
    visibilityLevelCode: restrictedVisibilityCode,
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
  typia.assert<ICommunityPlatformCommunity>(community);

  TestValidator.equals(
    "community visibility level code should be restricted code",
    community.visibilityLevel.code,
    restrictedVisibilityCode,
  );

  // 6. As memberOwner, create a post in that community
  const postCreateBody = {
    community_id: community.id,
    post_type_id: typia.random<string & tags.Format<"uuid">>(),
    title: RandomGenerator.paragraph({ sentences: 4 }),
    body: RandomGenerator.content({
      paragraphs: 1,
      sentenceMin: 3,
      sentenceMax: 6,
    }),
    url: null,
    image_uri: null,
  } satisfies ICommunityPlatformPost.ICreate;

  const post: ICommunityPlatformPost =
    await api.functional.communityPlatform.memberUser.posts.create(connection, {
      body: postCreateBody,
    });
  typia.assert<ICommunityPlatformPost>(post);

  TestValidator.equals(
    "post community id should match created community",
    post.community.id,
    community.id,
  );

  // 7. As memberOwner (community member), successfully create a comment
  const ownerCommentBody = {
    body: RandomGenerator.paragraph({ sentences: 5 }),
    parentCommentId: undefined,
    renderingMode: "markdown" as const,
  } satisfies ICommunityPlatformComment.ICreate;

  const ownerComment: ICommunityPlatformComment =
    await api.functional.communityPlatform.memberUser.posts.comments.create(
      connection,
      {
        postId: post.id,
        body: ownerCommentBody,
      },
    );
  typia.assert<ICommunityPlatformComment>(ownerComment);

  TestValidator.equals(
    "owner comment post summary id should match post.id",
    ownerComment.post.id,
    post.id,
  );

  TestValidator.equals(
    "owner comment author id should be memberOwner",
    ownerComment.author.id,
    memberOwner.id,
  );

  TestValidator.equals(
    "owner comment body should match requested body",
    ownerComment.body,
    ownerCommentBody.body,
  );

  // 8. Switch actor to memberStranger
  const memberStrangerLoginBody = {
    identifier: memberStrangerEmail,
    password: memberStrangerPassword,
    ip: null,
    href: "https://community.example.com/auth/login",
    referrer: "https://community.example.com/",
  } satisfies ICommunityPlatformMemberuser.ILoginRequest;

  const memberStrangerAuthorized: ICommunityPlatformMemberuser.IAuthorized =
    await api.functional.auth.memberUser.login(connection, {
      body: memberStrangerLoginBody,
    });
  typia.assert<ICommunityPlatformMemberuser.IAuthorized>(
    memberStrangerAuthorized,
  );

  TestValidator.equals(
    "memberStranger login should return the same user id as join",
    memberStrangerAuthorized.id,
    memberStranger.id,
  );

  // 9. As memberStranger (non-member), verify that commenting fails
  const strangerCommentBody = {
    body: RandomGenerator.paragraph({ sentences: 4 }),
    parentCommentId: undefined,
    renderingMode: "markdown" as const,
  } satisfies ICommunityPlatformComment.ICreate;

  await TestValidator.error(
    "non-member should not be allowed to comment in restricted community",
    async () => {
      await api.functional.communityPlatform.memberUser.posts.comments.create(
        connection,
        {
          postId: post.id,
          body: strangerCommentBody,
        },
      );
    },
  );
}
