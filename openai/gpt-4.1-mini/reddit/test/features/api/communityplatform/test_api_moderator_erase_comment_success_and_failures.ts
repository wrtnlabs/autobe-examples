import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformComment } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformComment";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformModerator";
import type { ICommunityPlatformUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformUser";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_moderator_join } from "../../../authorize/authorize_moderator_join";
import { authorize_moderator_login } from "../../../authorize/authorize_moderator_login";
import { authorize_moderator_refresh } from "../../../authorize/authorize_moderator_refresh";
import { authorize_user_join } from "../../../authorize/authorize_user_join";
import { authorize_user_login } from "../../../authorize/authorize_user_login";
import { authorize_user_refresh } from "../../../authorize/authorize_user_refresh";
import { generate_random_community_platform_user_comments_create_comment } from "../../../generate/generate_random_community_platform_user_comments_create_comment";
import { generate_random_community_platform_user_communities_create } from "../../../generate/generate_random_community_platform_user_communities_create";
import { prepare_random_community_platform_comment } from "../../../prepare/prepare_random_community_platform_comment";
import { prepare_random_community_platform_community } from "../../../prepare/prepare_random_community_platform_community";

export async function test_api_moderator_erase_comment_success_and_failures(
  connection: api.IConnection,
): Promise<void> {
  // Scenario 1: Successful deletion by authorized moderator
  const moderatorJoinConnection: api.IConnection = { host: connection.host };
  const moderatorJoinPassword = RandomGenerator.alphaNumeric(16);
  const moderatorJoinEmail = typia.random<string & tags.Format<"email">>();
  const moderatorJoinedResult = await authorize_moderator_join(
    moderatorJoinConnection,
    {
      body: {
        email: moderatorJoinEmail,
        username: RandomGenerator.name(),
        displayName: null,
        bio: null,
        avatarUrl: null,
      },
    },
  );
  const moderatorJoined = typia.assert(moderatorJoinedResult);
  const moderatorLoginConnection: api.IConnection = { host: connection.host };
  const moderatorLoggedIn = await authorize_moderator_login(
    moderatorLoginConnection,
    {
      body: { email: moderatorJoinEmail, password: moderatorJoinPassword },
    },
  );
  typia.assert(moderatorLoggedIn);
  const userJoinConnection: api.IConnection = { host: connection.host };
  const userJoinPassword = RandomGenerator.alphaNumeric(16);
  const userJoinedResult = await authorize_user_join(userJoinConnection, {
    body: { password: userJoinPassword },
  });
  const userJoined = typia.assert(userJoinedResult);
  const userConnection: api.IConnection = { host: connection.host };
  await authorize_user_login(userConnection, {
    body: { email: userJoined.email, password: userJoinPassword },
  });
  const community =
    await generate_random_community_platform_user_communities_create(
      userConnection,
      {},
    );
  typia.assert(community);
  const comment =
    await generate_random_community_platform_user_comments_create_comment(
      userConnection,
      {
        body: {
          content: RandomGenerator.paragraph({ sentences: 3 }),
          postId: typia.random<string & tags.Format<"uuid">>(),
        },
      },
    );
  typia.assert(comment);
  // Moderator deletes the comment successfully
  const deletedComment =
    await api.functional.communityPlatform.moderator.communities.comments._delete.eraseComment(
      moderatorLoginConnection,
      {
        communityId: community.id,
        commentId: comment.id,
      },
    );
  typia.assert(deletedComment);
  TestValidator.equals("deleted comment id", deletedComment.id, comment.id);
  // Scenario 2: Deletion by unauthorized user fails with 403
  const unauthorizedUserJoinConnection: api.IConnection = {
    host: connection.host,
  };
  const unauthorizedUserJoinPassword = RandomGenerator.alphaNumeric(16);
  const unauthorizedUserResult = await authorize_user_join(
    unauthorizedUserJoinConnection,
    { body: { password: unauthorizedUserJoinPassword } },
  );
  const unauthorizedUser = typia.assert(unauthorizedUserResult);
  const unauthorizedUserConnection: api.IConnection = { host: connection.host };
  await authorize_user_login(unauthorizedUserConnection, {
    body: {
      email: unauthorizedUser.email,
      password: unauthorizedUserJoinPassword,
    },
  });
  const unauthorizedCommunity =
    await generate_random_community_platform_user_communities_create(
      unauthorizedUserConnection,
      {},
    );
  typia.assert(unauthorizedCommunity);
  const unauthorizedComment =
    await generate_random_community_platform_user_comments_create_comment(
      unauthorizedUserConnection,
      {
        body: {
          content: RandomGenerator.paragraph({ sentences: 2 }),
          postId: typia.random<string & tags.Format<"uuid">>(),
        },
      },
    );
  typia.assert(unauthorizedComment);
  await TestValidator.httpError(
    "unauthorized user deletion attempt",
    403,
    async () => {
      await api.functional.communityPlatform.moderator.communities.comments._delete.eraseComment(
        unauthorizedUserConnection,
        {
          communityId: unauthorizedCommunity.id,
          commentId: unauthorizedComment.id,
        },
      );
    },
  );
  // Scenario 3: Deletion of non-existent comment returns 404
  const modJoinConnTwo: api.IConnection = { host: connection.host };
  const moderatorJoinPasswordTwo = RandomGenerator.alphaNumeric(16);
  const moderatorTwoEmail = typia.random<string & tags.Format<"email">>();
  const moderatorTwoResult = await authorize_moderator_join(modJoinConnTwo, {
    body: {
      email: moderatorTwoEmail,
      username: RandomGenerator.name(),
      displayName: null,
      bio: null,
      avatarUrl: null,
    },
  });
  const moderatorTwo = typia.assert(moderatorTwoResult);
  const modLoginConnTwo: api.IConnection = { host: connection.host };
  const moderatorTwoLoggedIn = await authorize_moderator_login(
    modLoginConnTwo,
    {
      body: { email: moderatorTwoEmail, password: moderatorJoinPasswordTwo },
    },
  );
  typia.assert(moderatorTwoLoggedIn);
  const userJoinConnTwo: api.IConnection = { host: connection.host };
  const userJoinPasswordTwo = RandomGenerator.alphaNumeric(16);
  const userTwoResult = await authorize_user_join(userJoinConnTwo, {
    body: { password: userJoinPasswordTwo },
  });
  const userTwo = typia.assert(userTwoResult);
  const userConnTwo: api.IConnection = { host: connection.host };
  await authorize_user_login(userConnTwo, {
    body: { email: userTwo.email, password: userJoinPasswordTwo },
  });
  const communityTwo =
    await generate_random_community_platform_user_communities_create(
      userConnTwo,
      {},
    );
  typia.assert(communityTwo);
  const fakeCommentId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();
  await TestValidator.httpError(
    "delete non-existent comment",
    404,
    async () => {
      await api.functional.communityPlatform.moderator.communities.comments._delete.eraseComment(
        modLoginConnTwo,
        {
          communityId: communityTwo.id,
          commentId: fakeCommentId,
        },
      );
    },
  );
}
