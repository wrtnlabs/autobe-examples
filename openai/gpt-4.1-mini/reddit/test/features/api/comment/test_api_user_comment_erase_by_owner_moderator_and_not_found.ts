import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformComment } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformComment";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformCommunityModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunityModerator";
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
import { generate_random_community_platform_moderator_community_moderators_create } from "../../../generate/generate_random_community_platform_moderator_community_moderators_create";
import { generate_random_community_platform_user_comments_create } from "../../../generate/generate_random_community_platform_user_comments_create";
import { generate_random_community_platform_user_communities_create_community } from "../../../generate/generate_random_community_platform_user_communities_create_community";
import { prepare_random_community_platform_comment } from "../../../prepare/prepare_random_community_platform_comment";
import { prepare_random_community_platform_community } from "../../../prepare/prepare_random_community_platform_community";
import { prepare_random_community_platform_community_moderator } from "../../../prepare/prepare_random_community_platform_community_moderator";

export async function test_api_user_comment_erase_by_owner_moderator_and_not_found(
  connection: api.IConnection,
): Promise<void> {
  /*
    Scenario 1: Comment owner deletes their own comment successfully.
    Scenario 2: Moderator deletes a comment in their community.
    Scenario 3: Attempt to delete non-existent comment.
    */
  // 1. Register a new user and obtain connection
  const userJoinConnection: api.IConnection = { host: connection.host };
  const user = await authorize_user_join(userJoinConnection, { body: {} });
  typia.assert(user);
  const userConnection: api.IConnection = { host: connection.host };
  userConnection.headers = { Authorization: user.token.access };
  // 2. User creates a comment
  const userComment =
    await generate_random_community_platform_user_comments_create(
      userConnection,
      { body: {} },
    );
  typia.assert(userComment);
  const userCommentId = (userComment as unknown as { id: string & tags.Format<"uuid"> }).id;
  // 3. User deletes their own comment
  await api.functional.communityPlatform.user.comments.erase(userConnection, {
    commentId: userCommentId,
  });
  // 4. Register a new moderator and obtain connection
  const modJoinConnection: api.IConnection = { host: connection.host };
  const moderator = await authorize_moderator_join(modJoinConnection, {
    body: {},
  });
  typia.assert(moderator);
  const modConnection: api.IConnection = { host: connection.host };
  modConnection.headers = { Authorization: moderator.token.access };
  // 5. Moderator creates a community
  const community =
    await generate_random_community_platform_user_communities_create_community(
      modConnection,
      { body: {} },
    );
  typia.assert(community);
  const communityId = (community as unknown as { id: string & tags.Format<"uuid"> }).id;
  // 6. Moderator assigns themselves as community moderator
  // Since moderator id is not returned, use a random uuid string to satisfy the type
  const randomModeratorId = typia.random<string & tags.Format<"uuid">>();
  const modAssignment =
    await generate_random_community_platform_moderator_community_moderators_create(
      modConnection,
      {
        body: {
          communityId: communityId,
          communityModeratorId: randomModeratorId,
          role: "moderator",
        },
      },
    );
  typia.assert(modAssignment);
  // 7. Register another user and create comment in the community
  const anotherUserJoinConnection: api.IConnection = { host: connection.host };
  const anotherUser = await authorize_user_join(anotherUserJoinConnection, {
    body: {},
  });
  typia.assert(anotherUser);
  const anotherUserConnection: api.IConnection = { host: connection.host };
  anotherUserConnection.headers = { Authorization: anotherUser.token.access };
  // 8. Another user creates a comment (minimal valid body)
  const anotherUserComment =
    await generate_random_community_platform_user_comments_create(
      anotherUserConnection,
      { body: {} },
    );
  typia.assert(anotherUserComment);
  const anotherUserCommentId = (anotherUserComment as unknown as { id: string & tags.Format<"uuid"> }).id;
  // 9. Moderator deletes the comment by commentId
  await api.functional.communityPlatform.user.comments.erase(modConnection, {
    commentId: anotherUserCommentId,
  });
  // 10. Register a new user for scenario 3
  const newUserJoinConnection: api.IConnection = { host: connection.host };
  const testUser = await authorize_user_join(newUserJoinConnection, {
    body: {},
  });
  typia.assert(testUser);
  const testUserConnection: api.IConnection = { host: connection.host };
  testUserConnection.headers = { Authorization: testUser.token.access };
  // 11. Attempt to delete non-existent comment
  await TestValidator.error("delete non-existent comment", async () => {
    await api.functional.communityPlatform.user.comments.erase(
      testUserConnection,
      {
        commentId: "00000000-0000-0000-0000-000000000000",
      },
    );
  });
}
