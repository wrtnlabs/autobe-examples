import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import type { ICommunityPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPost";
import type { IMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IMember";

export async function test_api_comment_delete_when_parent_post_deleted_rejected(
  connection: api.IConnection,
) {
  const member: IMember.ICreate = {
    email: typia.random<string & tags.Format<"email">>(),
    password: "StrongPassword123!",
    href: "https://community-platform.com/join",
    referrer: "https://community-platform.com",
    ip: "192.168.1.100",
  };

  const joined: ICommunityPlatformMember.IAuthorized =
    await api.functional.auth.member.join(connection, { body: member });
  typia.assert(joined);

  const communityCode = "community-123";
  const post: ICommunityPlatformPost =
    await api.functional.communityPlatform.member.communities.posts.create(
      connection,
      {
        communityCode,
        body: "This is a test post content." satisfies ICommunityPlatformPost.ICreate,
      },
    );
  typia.assert(post);

  // Extract post code from the response string
  const postCode = post;

  // Generate a random comment code (UUID)
  const commentCode = typia.random<string & tags.Format<"uuid">>();

  // Delete the parent post
  await api.functional.communityPlatform.member.communities.posts.erase(
    connection,
    {
      communityCode,
      postCode,
    },
  );

  // Attempt to delete the comment (should be rejected due to parent post deletion)
  await TestValidator.error(
    "cannot delete comment when parent post is deleted",
    async () => {
      await api.functional.communityPlatform.member.communities.posts.comments.erase(
        connection,
        {
          communityCode,
          postCode,
          commentCode,
        },
      );
    },
  );
}
