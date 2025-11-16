import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import type { ICommunityPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPost";
import type { IMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IMember";

export async function test_api_post_deletion_on_nonexistent_post(
  connection: api.IConnection,
) {
  // Authenticate as member to establish context for deletion attempt
  const member: ICommunityPlatformMember.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: "SecurePass123!",
        href: "https://community-platform.com/join",
        referrer: "https://community-platform.com/",
        ip: "192.168.1.100",
      } satisfies IMember.ICreate,
    });
  typia.assert(member);

  // Attempt to delete a non-existent post using fake post code
  // This should return a 404 Not Found error, verifying the system doesn't expose internal structure
  await TestValidator.error(
    "deletion of non-existent post should fail with 404",
    async () => {
      await api.functional.communityPlatform.member.communities.posts.erase(
        connection,
        {
          communityCode: "valid-community-code", // Valid community code
          postCode: "non-existent-post-code", // Non-existent post code
        },
      );
    },
  );
}
