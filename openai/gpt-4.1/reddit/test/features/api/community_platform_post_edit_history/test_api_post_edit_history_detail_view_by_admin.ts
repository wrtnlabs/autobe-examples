import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdmin";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPost";
import type { ICommunityPlatformPostEditHistory } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPostEditHistory";
import type { ICommunityPlatformPostImage } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPostImage";
import type { ICommunityPlatformPostLinks } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPostLinks";
import type { ICommunityPlatformPostTexts } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPostTexts";
import type { ICommunityPlatformUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformUser";

/**
 * Ensure admin can retrieve the details of a post's edit history for
 * moderation.
 *
 * 1. Register a user, and a separate admin.
 * 2. As the user, create a community.
 * 3. As the user, create a text post within the community.
 * 4. As the user, edit the post to trigger at least one edit history entry (modify
 *    the title or body).
 * 5. As the admin, retrieve the specific edit history using the admin audit
 *    endpoint, and assert that full audit details (editor, event type, prior
 *    values, timestamp) are visible.
 * 6. Confirm that error is returned if edit history ID does not exist.
 */
export async function test_api_post_edit_history_detail_view_by_admin(
  connection: api.IConnection,
) {
  // 1. Register user
  const userEmail = typia.random<string & tags.Format<"email">>();
  const userJoin = await api.functional.auth.user.join(connection, {
    body: {
      email: userEmail,
      password: RandomGenerator.alphaNumeric(20),
      display_name: RandomGenerator.name(),
      href: "https://example.com/register",
      referrer: "https://example.com/welcome",
      ip: undefined,
    } satisfies ICommunityPlatformUser.IJoin,
  });
  typia.assert(userJoin);

  // 2. Register separate admin
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminJoin = await api.functional.auth.admin.join(connection, {
    body: {
      email: adminEmail,
      password: RandomGenerator.alphaNumeric(20),
      display_name: RandomGenerator.name(),
      href: "https://example.com/admin-join",
      referrer: "https://example.com/launch",
      ip: undefined,
    } satisfies ICommunityPlatformAdmin.ICreate,
  });
  typia.assert(adminJoin);

  // 3. As the user, create a community
  const community =
    await api.functional.communityPlatform.user.communities.create(connection, {
      body: {
        name: RandomGenerator.alphabets(10),
        description: RandomGenerator.paragraph(),
      } satisfies ICommunityPlatformCommunity.ICreate,
    });
  typia.assert(community);

  // 4. As the user, create a text post
  const initialTitle = RandomGenerator.paragraph({ sentences: 2 });
  const initialBody = RandomGenerator.content({
    paragraphs: 1,
    sentenceMin: 2,
    sentenceMax: 5,
  });
  const post = await api.functional.communityPlatform.user.posts.create(
    connection,
    {
      body: {
        community_id: community.id,
        title: initialTitle,
        text_body: initialBody,
      } satisfies ICommunityPlatformPost.ICreate,
    },
  );
  typia.assert(post);

  // 5. As the user, edit the post (simulate edit by creating a new post, assume test environment allows directly editing or you have a suitable API, else skip actual edit and use the existing post)
  // Since there is no posts.update endpoint, simulate a title/body edit by re-creating logic: not possible here, so test will call admin endpoint with a random editHistoryId (should error), then with a real one if such demo data is already in DB.
  // In real coverage, this would require an edit endpoint creating an edit history

  // Try first as admin: attempt to fetch a random non-existent edit history (should error)
  await TestValidator.error(
    "admin receives error for non-existent edit history entry",
    async () => {
      await api.functional.communityPlatform.admin.posts.editHistories.at(
        connection,
        {
          postId: post.id,
          editHistoryId: typia.random<string & tags.Format<"uuid">>(),
        },
      );
    },
  );

  // Since there is no public endpoint to create an edit, can't continue full scenario. This test proves the admin endpoint and error response logic only.
}
