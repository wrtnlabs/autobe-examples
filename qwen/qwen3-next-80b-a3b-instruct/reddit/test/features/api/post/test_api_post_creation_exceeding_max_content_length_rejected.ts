import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import type { ICommunityPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPost";
import type { IMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IMember";

export async function test_api_post_creation_exceeding_max_content_length_rejected(
  connection: api.IConnection,
) {
  // 1. Create authenticated member account
  const email: string = typia.random<string & tags.Format<"email">>();
  const member: ICommunityPlatformMember.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: {
        email,
        password: "SecurePass123!",
        href: "https://community-platform.com/join",
        referrer: "https://community-platform.com",
        ip: "192.168.1.100",
      } satisfies IMember.ICreate,
    });
  typia.assert(member);

  // 2. Create post content with exactly 10,001 characters (exceeding the 10,000 limit)
  const communityCode: string =
    "test-community-" +
    typia.random<string & tags.Format<"uuid">>().substring(0, 8);
  const excessiveContent: string = "x".repeat(10001);

  // Validate the content length exactly
  if (excessiveContent.length !== 10001) {
    throw new Error(
      `Content length is ${excessiveContent.length}, expected 10001`,
    );
  }

  // 3. Attempt to create post with excessive content (expect 400 Bad Request)
  await TestValidator.error(
    "post creation with content exceeding 10,000 characters should be rejected",
    async () => {
      await api.functional.communityPlatform.member.communities.posts.create(
        connection,
        {
          communityCode,
          body: excessiveContent satisfies ICommunityPlatformPost.ICreate,
        },
      );
    },
  );
}
