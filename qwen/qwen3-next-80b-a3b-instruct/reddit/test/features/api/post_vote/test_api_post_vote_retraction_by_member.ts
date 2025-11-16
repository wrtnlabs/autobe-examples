import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformComment } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformComment";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import type { IMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IMember";

export async function test_api_post_vote_retraction_by_member(
  connection: api.IConnection,
) {
  // 1. Create new member account for authentication
  const email: string = typia.random<string & tags.Format<"email">>();
  const member: ICommunityPlatformMember.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: {
        email,
        password: "SecurePassword123!",
        href: "https://community-platform.com/join",
        referrer: "https://community-platform.com",
        ip: "192.168.1.100",
      } satisfies IMember.ICreate,
    });
  typia.assert(member);

  // 2. Create a community code and post code for the test
  const communityCode: string = typia.random<string>();
  const postCode: string = typia.random<string>();

  // 3. Create a comment on the post to establish the post existence
  const comment: ICommunityPlatformComment =
    await api.functional.communityPlatform.member.communities.posts.comments.create(
      connection,
      {
        communityCode,
        postCode,
        body: "This is a test comment" satisfies ICommunityPlatformComment.ICreate,
      },
    );
  typia.assert(comment);

  // 4. Retract a vote that never existed (as we cannot create votes, but the endpoint must handle this case)
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
