import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import type { ICommunityPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPost";
import type { IMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IMember";

/**
 * Validate the creation of a link post by an authenticated member.
 *
 * This test verifies the complete workflow of a member creating a link post
 * within a community. First, a new member account is registered with valid
 * credentials and connection metadata. Then, the member authenticates their
 * session and submits a new link post with a valid URL. The system must create
 * a new post record linked to the member's identity, assign a unique postCode,
 * and return the full post object as a string representing the URL. The URL
 * must be validated as a well-formed web address.
 *
 * Step-by-step process:
 *
 * 1. Register a new member account with email, password, href, referrer, and IP
 *    address
 * 2. Authenticate the member to establish a session
 * 3. Create a new link post with a valid URL in the specified community
 * 4. Validate the post creation response is a non-empty string
 */
export async function test_api_post_creation_link_content(
  connection: api.IConnection,
) {
  // Step 1: Register a new member account
  const memberEmail: string = typia.random<string & tags.Format<"email">>();
  const memberPassword: string = "MySecurePassword123!";
  const href: string = typia.random<string & tags.Format<"uri">>();
  const referrer: string = typia.random<string & tags.Format<"uri">>();
  const ip: string = typia.random<string & tags.Format<"ipv4">>();

  const member: ICommunityPlatformMember.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: {
        email: memberEmail,
        password: memberPassword,
        href,
        referrer,
        ip,
      } satisfies IMember.ICreate,
    });
  typia.assert(member);

  // Step 2: Create a new link post in a community
  const communityCode: string = "example-community-code";
  const linkUrl: string = "https://example.com/article";

  const createdPost: ICommunityPlatformPost =
    await api.functional.communityPlatform.member.communities.posts.create(
      connection,
      {
        communityCode,
        body: linkUrl, // Pass URL string directly - ICommunityPlatformPost.ICreate is type string
      },
    );
  typia.assert(createdPost);

  // Step 3: Validate that post creation succeeded
  TestValidator.predicate(
    "created post is a non-empty string",
    createdPost.length > 0,
  );
}
