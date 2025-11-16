import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import type { ICommunityPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPost";
import type { IMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IMember";

export async function test_api_post_creation_by_guest_rejected(
  connection: api.IConnection,
) {
  // Step 1: Generate valid member registration data
  const memberData = {
    email: typia.random<string & tags.Format<"email">>(),
    password: "SecurePass123!", // Meets 12+ chars, uppercase, lowercase, number, special char requirements
    href: "https://community-platform.com/join",
    referrer: "https://community-platform.com",
    ip: "192.168.1.100",
  } satisfies IMember.ICreate;

  // Step 2: Create a member account via join authentication (required prerequisite)
  const createdMember: ICommunityPlatformMember.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: memberData,
    });
  typia.assert(createdMember);

  // Step 3: Create a unique community code for the test
  const communityCode = "test-community-" + RandomGenerator.alphaNumeric(8);

  // Step 4: Create post data (ICommunityPlatformPost.ICreate) with valid content
  // Note: ICommunityPlatformPost.ICreate is defined as string in the provided DTO
  const postData =
    "This is a test post content created by a member user." satisfies ICommunityPlatformPost.ICreate;

  // Step 5: First test: authenticate as guest (no token) and attempt post creation
  // Create a fresh connection without authentication token
  const unauthConnection: api.IConnection = {
    ...connection,
    headers: {},
  };

  // The system must reject this request as the user is unauthenticated
  await TestValidator.error(
    "guest post creation should be rejected with 401 Unauthorized",
    async () => {
      await api.functional.communityPlatform.member.communities.posts.create(
        unauthConnection,
        {
          communityCode: communityCode,
          body: postData,
        },
      );
    },
  );

  // Step 6: Verify that authenticated member can successfully create a post
  // Note: This step validates that the issue is specifically guest access restriction
  // and not a problem with the API endpoint itself
  const authenticatedPost: ICommunityPlatformPost =
    await api.functional.communityPlatform.member.communities.posts.create(
      connection,
      {
        communityCode: communityCode,
        body: postData,
      },
    );
  typia.assert(authenticatedPost);
}
