import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IRedditCommunityCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunity";
import type { IRedditCommunityCommunityModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunityModerator";
import type { IRedditCommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityMember";
import type { IRedditCommunityPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityPost";
import type { IRedditCommunityUserProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityUserProfile";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_community_moderator_join } from "../../../authorize/authorize_community_moderator_join";
import { authorize_community_moderator_login } from "../../../authorize/authorize_community_moderator_login";
import { authorize_community_moderator_refresh } from "../../../authorize/authorize_community_moderator_refresh";
import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_reddit_community_member_posts_create } from "../../../generate/generate_random_reddit_community_member_posts_create";
import { prepare_random_reddit_community_post } from "../../../prepare/prepare_random_reddit_community_post";

export async function test_api_post_deletion_by_non_moderator_rejected(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create a regular member
  const memberConnection: api.IConnection = { host: connection.host };
  const memberCredentials = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(16),
  } satisfies IRedditCommunityMember.IJoin;
  await authorize_member_join(memberConnection, { body: memberCredentials });
  // 2. Log in as regular member
  const memberLogin = {
    email: memberCredentials.email,
    password: memberCredentials.password,
  } satisfies IRedditCommunityMember.ILogin;
  const memberLoggedIn = await authorize_member_login(memberConnection, {
    body: memberLogin,
  });
  // 3. Create a post as the regular member
  const communityName = RandomGenerator.alphabets(8);
  const post = await generate_random_reddit_community_member_posts_create(
    memberConnection,
    {
      body: {
        title: RandomGenerator.paragraph({ sentences: 1 }),
        textContent: RandomGenerator.content({ paragraphs: 1 }),
        communityName,
      },
    },
  );
  typia.assert(post);
  // 4. Attempt to delete the post as the regular member using the communityModerator delete endpoint (should fail)
  // The regular member created the post but is not a moderator, so they cannot use the moderator endpoint
  // Even though they are the post author, trying to use the /communityModerator/posts/{postId} endpoint
  // should fail with 403 Forbidden
  try {
    await api.functional.redditCommunity.communityModerator.posts.erase(
      memberConnection,
      {
        postId: post.id,
      },
    );
  } catch (error) {
    // This should throw a 403 Forbidden error because the regular member is not a moderator
    TestValidator.httpError(
      "non-moderator cannot use communityModerator delete endpoint",
      403,
      () => {
        throw error;
      },
    );
    return;
  }
  // If we reach here, the delete succeeded, which is wrong
  TestValidator.error("delete should fail with 403 Forbidden", () => {
    throw new Error("Expected 403 Forbidden but deletion succeeded");
  });
}
