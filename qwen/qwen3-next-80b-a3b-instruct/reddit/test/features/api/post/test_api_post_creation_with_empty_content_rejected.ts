import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import type { ICommunityPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPost";
import type { IMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IMember";

export async function test_api_post_creation_with_empty_content_rejected(
  connection: api.IConnection,
) {
  // 1. Create an authenticated member account with randomized credentials
  const memberEmail: string = typia.random<string & tags.Format<"email">>();
  const member: ICommunityPlatformMember.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: {
        email: memberEmail,
        password: RandomGenerator.alphabets(16),
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
        ip: typia.random<string & tags.Format<"ipv4">>(),
      } satisfies IMember.ICreate,
    });
  typia.assert(member);

  // 2. Attempt to create a post with empty content (should be rejected)
  await TestValidator.error(
    "post with empty content should be rejected",
    async () => {
      await api.functional.communityPlatform.member.communities.posts.create(
        connection,
        {
          communityCode: typia.random<string>(),
          body: "" satisfies ICommunityPlatformPost.ICreate,
        },
      );
    },
  );
}
