import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformComment } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformComment";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import type { ICommunityPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPost";
import type { IMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IMember";

export async function test_api_comment_creation_empty_content(
  connection: api.IConnection,
) {
  // Step 1: Authenticate as a member to establish authorization context
  const memberEmail: string = typia.random<string & tags.Format<"email">>();
  const joinResponse: ICommunityPlatformMember.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: {
        email: memberEmail,
        password: "SecurePass123!",
        href: "https://community-platform.com/join",
        referrer: "https://community-platform.com/home",
        ip: "192.168.1.100",
      } satisfies IMember.ICreate,
    });
  typia.assert(joinResponse);

  // Step 2: Create a post in a community to comment on
  const communityCode: string = "community-123";
  const postContent: string = RandomGenerator.paragraph({ sentences: 2 }); // Non-empty content as required by business context
  const postResponse: ICommunityPlatformPost =
    await api.functional.communityPlatform.member.communities.posts.create(
      connection,
      {
        communityCode: communityCode,
        body: postContent satisfies ICommunityPlatformPost.ICreate,
      },
    );
  typia.assert(postResponse);

  // Step 3: Extract postCode from the created post (ICommunityPlatformPost is string type)
  const postCode: string = postResponse;

  // Step 4: Attempt to create a comment with empty content (0 characters)
  // This should fail with a 400 error as per business rules (empty content violates ICommunityPlatformComment.ICreate schema)
  await TestValidator.error(
    "creating comment with empty content should fail with 400 error",
    async () => {
      await api.functional.communityPlatform.member.communities.posts.comments.create(
        connection,
        {
          communityCode: communityCode,
          postCode: postCode,
          body: "" satisfies ICommunityPlatformComment.ICreate,
        },
      );
    },
  );
}
