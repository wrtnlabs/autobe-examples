import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import type { ICommunityPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPost";
import type { IMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IMember";
import type { IPageICommunityPlatformComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformComment";

export async function test_api_post_comments_retrieval_on_soft_deleted_post(
  connection: api.IConnection,
) {
  const member = await api.functional.auth.member.join(connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "ValidPassword123!",
      href: "https://community-platform.com/join",
      referrer: "https://community-platform.com",
      ip: "192.168.1.1",
    } satisfies IMember.ICreate,
  });
  typia.assert(member);

  const communityCode = "community-123";
  const postCode = "post-abc123";

  await api.functional.communityPlatform.member.communities.posts.create(
    connection,
    {
      communityCode,
      body: "" satisfies ICommunityPlatformPost.ICreate,
    },
  );

  await api.functional.communityPlatform.member.communities.posts.erase(
    connection,
    {
      communityCode,
      postCode,
    },
  );

  await TestValidator.error(
    "cannot retrieve comments on soft-deleted post",
    async () => {
      await api.functional.communityPlatform.communities.posts.comments.index(
        connection,
        {
          communityCode,
          postCode,
        },
      );
    },
  );
}
