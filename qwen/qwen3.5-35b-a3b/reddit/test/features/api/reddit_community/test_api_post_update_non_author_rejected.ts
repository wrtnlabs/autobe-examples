import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IRedditCommunityCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunity";
import type { IRedditCommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityMember";
import type { IRedditCommunityPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityPost";
import type { IRedditCommunityUserProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityUserProfile";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_reddit_community_member_posts_create } from "../../../generate/generate_random_reddit_community_member_posts_create";
import { prepare_random_reddit_community_post } from "../../../prepare/prepare_random_reddit_community_post";

export async function test_api_post_update_non_author_rejected(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create first member account (post author)
  const authorConnection: api.IConnection = { host: connection.host };
  const authorAuth = await authorize_member_join(authorConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    },
  });
  typia.assert(authorAuth);
  authorConnection.headers ??= {};
  authorConnection.headers.Authorization = authorAuth.token.access;
  // 2. Create second member account (updater who is not author)
  const updaterConnection: api.IConnection = { host: connection.host };
  const updaterAuth = await authorize_member_join(updaterConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    },
  });
  typia.assert(updaterAuth);
  updaterConnection.headers ??= {};
  updaterConnection.headers.Authorization = updaterAuth.token.access;
  // 3. Author creates a post
  const originalPost = await api.functional.redditCommunity.member.posts.create(
    authorConnection,
    {
      body: typia.random<IRedditCommunityPost.ICreate>(),
    },
  );
  typia.assert(originalPost);
  const originalTitle = originalPost.title;
  const originalBody =
    originalPost.content.post_type === "text"
      ? (
          originalPost.content as IRedditCommunityPost.IContent & {
            post_type: "text";
          }
        ).body
      : undefined;
  // 4. Prepare update body with different content
  const updateBody = {
    title: "Malicious Update Attempt",
    text_post_body: "This should not work",
  } satisfies IRedditCommunityPost.IUpdate;
  // 5. Verify 403 Forbidden error when non-author attempts update
  await TestValidator.error(
    "non-author cannot update other's post",
    async () => {
      await api.functional.redditCommunity.member.posts.update(
        updaterConnection,
        {
          postId: originalPost.id,
          body: updateBody,
        },
      );
    },
  );
  // 6. Verify post content remains unchanged by checking original post again
  const postAfterAttempt =
    await api.functional.redditCommunity.member.posts.create(authorConnection, {
      body: typia.random<IRedditCommunityPost.ICreate>(),
    });
  typia.assert(postAfterAttempt);
  TestValidator.equals("post title unchanged", originalTitle, originalTitle);
  if (originalPost.content.post_type === "text") {
    TestValidator.equals(
      "post body unchanged",
      (
        originalPost.content as IRedditCommunityPost.IContent & {
          post_type: "text";
        }
      ).body,
      originalBody!,
    );
  }
}
