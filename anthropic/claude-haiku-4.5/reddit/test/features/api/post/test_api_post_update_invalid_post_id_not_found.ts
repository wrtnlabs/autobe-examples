import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import type { ICommunityPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPost";

export async function test_api_post_update_invalid_post_id_not_found(
  connection: api.IConnection,
) {
  // Authenticate as a member first
  const member: ICommunityPlatformMember.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        username: typia.random<
          string &
            tags.MinLength<3> &
            tags.MaxLength<50> &
            tags.Pattern<"^[a-zA-Z0-9_-]+$">
        >(),
        password: typia.random<string & tags.MinLength<8>>(),
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      } satisfies ICommunityPlatformMember.ICreate,
    });
  typia.assert(member);

  // Generate a non-existent post ID (valid UUID format but doesn't exist)
  const nonExistentPostId = typia.random<string & tags.Format<"uuid">>();

  // Attempt to update the non-existent post and expect a 404 error
  await TestValidator.error(
    "updating non-existent post should return 404 error",
    async () => {
      await api.functional.communityPlatform.member.posts.update(connection, {
        postId: nonExistentPostId,
        body: {
          title: RandomGenerator.paragraph({ sentences: 3 }),
          is_nsfw: false,
          has_spoiler: false,
          is_locked: false,
          is_pinned: false,
        } satisfies ICommunityPlatformPost.IUpdate,
      });
    },
  );
}
