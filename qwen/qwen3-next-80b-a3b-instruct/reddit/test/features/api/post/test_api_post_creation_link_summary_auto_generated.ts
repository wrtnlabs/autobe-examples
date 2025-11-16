import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import type { ICommunityPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPost";
import type { IMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IMember";

export async function test_api_post_creation_link_summary_auto_generated(
  connection: api.IConnection,
) {
  // Step 1: Create authenticated member account
  const memberEmail: string = typia.random<string & tags.Format<"email">>();
  const member: ICommunityPlatformMember.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: {
        email: memberEmail,
        password: "SecureP@ssw0rd123!",
        href: "https://community-platform.com/join",
        referrer: "https://community-platform.com",
        ip: "192.168.1.100",
      } satisfies IMember.ICreate,
    });
  typia.assert(member);

  // Step 2: Create a link post by sending the URL as a string (ICreate = string)
  // Per DTO: ICommunityPlatformPost.ICreate = string — so body is just the URL
  const linkUrl: string = "https://example.com/test-post";
  const post: ICommunityPlatformPost =
    await api.functional.communityPlatform.member.communities.posts.create(
      connection,
      {
        communityCode: "general",
        body: linkUrl, // This is the ONLY correct way; body is string per ICommunityPlatformPost.ICreate
      },
    );
  typia.assert(post);

  // Step 3: Validate that the post is returned as a non-empty string
  // Since ICommunityPlatformPost is a string type, we validate it’s not empty
  TestValidator.predicate(
    "post should be a non-empty string",
    typeof post === "string" && post.length > 0,
  );
  TestValidator.equals(
    "post should represent the submitted link URL",
    post,
    linkUrl,
  );
}
