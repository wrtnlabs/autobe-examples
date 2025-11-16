import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformComment } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformComment";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import type { IMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IMember";

export async function test_api_comment_creation_post_not_found(
  connection: api.IConnection,
) {
  // Step 1: Authenticate as a member to establish context for comment creation
  const memberEmail: string = typia.random<string & tags.Format<"email">>();
  const member: ICommunityPlatformMember.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: {
        email: memberEmail,
        password: "SecurePassword123!",
        href: "https://community-platform.com/join",
        referrer: "https://community-platform.com",
        ip: "192.168.1.100",
      } satisfies IMember.ICreate,
    });
  typia.assert(member);

  // Step 2: Generate a non-existent post code (invalid UUID format not required, just non-existent)
  // Using a UUID that is valid format but doesn't exist in the system
  const nonExistentPostCode: string = typia.random<
    string & tags.Format<"uuid">
  >();

  // Step 3: Generate a valid comment content (following ICommunityPlatformComment.ICreate = string with 1-500 chars)
  const commentContent: string = RandomGenerator.paragraph({ sentences: 3 });

  // Step 4: Attempt to create a comment on a non-existent post - this should fail with 404
  // Note: We do not use 'as any' or type manipulation - we use correct types as per DTO
  // The system should return a 404 error because the postCode doesn't exist
  await TestValidator.error(
    "comment creation should fail with 404 when post does not exist",
    async () => {
      await api.functional.communityPlatform.member.communities.posts.comments.create(
        connection,
        {
          communityCode: "valid-community-code-123", // Valid community code, should exist
          postCode: nonExistentPostCode, // Non-existent post code
          body: commentContent satisfies ICommunityPlatformComment.ICreate,
        },
      );
    },
  );
}
