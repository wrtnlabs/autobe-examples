import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import type { ICommunityPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPost";
import type { IMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IMember";

export async function test_api_post_creation_text_content(
  connection: api.IConnection,
) {
  // 1. Create authenticated member account
  const memberEmail: string = typia.random<string & tags.Format<"email">>();
  const member: ICommunityPlatformMember.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: {
        email: memberEmail,
        password: "SecurePass123!",
        href: "https://community-platform.com/join",
        referrer: "https://community-platform.com",
        ip: "192.168.1.100",
      } satisfies IMember.ICreate,
    });
  typia.assert(member);

  // 2. Create text content post
  const communityCode: string = "community-123";
  const postContent: string = RandomGenerator.paragraph({
    sentences: 5,
    wordMin: 5,
    wordMax: 15,
  });

  // Validate content length is within 1-10000 characters
  TestValidator.predicate(
    "text content length within limits",
    postContent.length >= 1 && postContent.length <= 10000,
  );

  const createdPost: ICommunityPlatformPost =
    await api.functional.communityPlatform.member.communities.posts.create(
      connection,
      {
        communityCode: communityCode,
        body: postContent satisfies ICommunityPlatformPost.ICreate,
      },
    );
  typia.assert(createdPost);

  // 3. Validate post creation response
  TestValidator.predicate(
    "post has text content",
    typeof createdPost === "string",
  );
  TestValidator.predicate(
    "post has text content length > 0",
    createdPost.length > 0,
  );
}
