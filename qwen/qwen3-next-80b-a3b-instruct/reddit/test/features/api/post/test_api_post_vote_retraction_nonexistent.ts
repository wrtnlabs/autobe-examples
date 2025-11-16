import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformComment } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformComment";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import type { IMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IMember";

export async function test_api_post_vote_retraction_nonexistent(
  connection: api.IConnection,
) {
  // 1. Create a new member account for authentication
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

  // 2. Create a post in a community as a target for vote operations
  const communityCode: string = typia.random<string>();
  const postCode: string = typia.random<string>();
  const comment: ICommunityPlatformComment =
    await api.functional.communityPlatform.member.communities.posts.comments.create(
      connection,
      {
        communityCode,
        postCode,
        body: "This is a test post comment",
      },
    );
  typia.assert(comment);

  // 3. Attempt to retract a vote that does not exist
  // This should fail with a 404 Not Found error since no vote record exists
  await TestValidator.error(
    "retracting non-existent vote should fail",
    async () => {
      await api.functional.communityPlatform.member.communities.posts.votes.erase(
        connection,
        {
          communityCode,
          postCode,
        },
      );
    },
  );
}
