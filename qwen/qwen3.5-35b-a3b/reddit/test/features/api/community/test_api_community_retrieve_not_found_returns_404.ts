import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IRedditCommunityCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunity";
import type { IRedditCommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityMember";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

/**
 * Test retrieving a community with a non-existent UUID returns 404 Not Found error.
 *
 * Validates that the community retrieval endpoint properly handles requests for non-existent communities by returning a 404 Not Found error. The test creates a valid member account to authenticate with the member-only endpoint, then attempts to retrieve a community with a UUID that is guaranteed to not exist in the database.
 *
 * Special attention is given to generating a valid UUID format (using typia.random with uuid tag format) to ensure the request is syntactically correct, while relying on the backend to validate the UUID's existence. The test validates the HTTP 404 status code using TestValidator.httpError, which properly handles HttpError exceptions.
 *
 * 1. Create a new member account using POST /redditCommunity/auth/member/join
 * 2. Generate a valid UUID format using typia.random with uuid tag
 * 3. Send GET request to /redditCommunity/member/communities/{communityId} with non-existent UUID
 * 4. Validate that the response returns HTTP 404 Not Found error
 * 5. Verify no community entity is returned (error response structure)
 */
export async function test_api_community_retrieve_not_found_returns_404(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create member account
  const memberConnection: api.IConnection = { host: connection.host };
  const member = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      username: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IRedditCommunityMember.IJoin,
  });
  typia.assert(member);
  // 2. Generate non-existent UUID
  const nonExistentCommunityId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();
  // 3. Attempt to retrieve non-existent community
  await TestValidator.httpError(
    "should return 404 for non-existent community",
    404,
    async () => {
      await api.functional.redditCommunity.member.communities.at(
        memberConnection,
        {
          communityId: nonExistentCommunityId,
        },
      );
    },
  );
}
