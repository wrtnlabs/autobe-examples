import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IRedditPlatformComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformComment";
import type { IRedditPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformCommunity";
import type { IRedditPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformMember";
import type { IRedditPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformPost";
import type { IRedditPlatformPostImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformPostImage";
import type { IRedditPlatformPostLink } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformPostLink";
import type { IRedditPlatformPostText } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformPostText";
import type { IRedditPlatformPostVote } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformPostVote";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection, HttpError } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_reddit_platform_member_communities_create } from "../../../generate/generate_random_reddit_platform_member_communities_create";
import { prepare_random_reddit_platform_community } from "../../../prepare/prepare_random_reddit_platform_community";

export async function test_api_community_delete_has_posts_rejected(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register and authenticate a new member
  const memberConnection: api.IConnection = { host: connection.host };
  const memberAuth = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "12345678",
      username:
        RandomGenerator.alphaNumeric(8) + "_" + RandomGenerator.alphaNumeric(3),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  typia.assert(memberAuth);
  // 2. Create a community as the authenticated member
  const communityConnection: api.IConnection = { host: connection.host };
  const community =
    await api.functional.redditPlatform.member.communities.create(
      communityConnection,
      {
        body: {
          name: "test-community-" + RandomGenerator.alphaNumeric(6),
          description: "Test community for deletion validation",
        } satisfies IRedditPlatformCommunity.ICreate,
      },
    );
  typia.assert(community);
  // 3. Create a post in the community to add content
  const postConnection: api.IConnection = { host: connection.host };
  const post = await api.functional.redditPlatform.member.posts.create(
    postConnection,
    {
      body: {
        community_id: community.id,
        title: "Test post title for community deletion validation",
        post_type: "text",
        text_content:
          "This is a test post content that should prevent community deletion",
      } satisfies IRedditPlatformPost.ICreate,
    },
  );
  typia.assert(post);
  // 4. Attempt to delete the community (should fail with 409 Conflict)
  const deleteConnection: api.IConnection = { host: connection.host };
  const deleteError = await TestValidator.error(
    "community deletion should return 409 conflict",
    async () => {
      await api.functional.redditPlatform.member.communities.erase(
        deleteConnection,
        {
          name: community.name,
        },
      );
    },
  ) as HttpError | undefined;
  // 5. Verify error response contains appropriate 409 status
  if (deleteError instanceof HttpError) {
    TestValidator.equals(
      "HTTP status should be 409 Conflict",
      deleteError.status,
      409,
    );
    // Validate error message indicates community has content
    const errorData = deleteError.toJSON();
    if (typeof errorData.message === "string") {
      TestValidator.predicate(
        "error message indicates community has content",
        errorData.message.includes("post") ||
          errorData.message.includes("content") ||
          errorData.message.includes("empty"),
      );
    }
  }
  // 6. Verify community still exists and is not deleted
  TestValidator.equals(
    "community should not be deleted after failed deletion attempt",
    community.deleted_at,
    null,
  );
  // 7. Verify post still exists and is not deleted
  TestValidator.equals(
    "post should not be deleted after failed community deletion",
    post.deleted_at,
    null,
  );
  // 8. Verify community name is still associated with existing community (not available for reuse)
  TestValidator.notEquals(
    "community name should not be available for reuse",
    community.name,
    "",
  );
}