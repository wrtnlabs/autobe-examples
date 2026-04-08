import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IRedditLikeCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeCommunity";
import type { IRedditLikeMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeMember";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

/**
 * Test retrieving non-existent community returns 404 error.
 *
 * Validates error handling for community retrieval when the requested community does not exist. This test ensures proper HTTP 404 status code and error response when attempting to access a community that has no corresponding record in the database.
 *
 * The test follows these steps:
 * 1. Authenticate as a member using the join endpoint
 * 2. Attempt to retrieve a community with a valid UUID format that doesn't exist (expect 404)
 *
 * Note: Invalid UUID format testing is not performed as the SDK enforces UUID validation at compile time through typia type guards. Only runtime business logic errors (resource not found) are tested in E2E tests.
 *
 * This validates the API's error handling for non-existent community resources.
 */
export async function test_api_community_retrieve_nonexistent_returns_404(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as member
  const memberConnection: api.IConnection = { host: connection.host };
  const member = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      username: RandomGenerator.name(1),
      href: typia.random<string & tags.Format<"uri">>(),
    } satisfies IRedditLikeMember.IJoin,
  });
  typia.assert(member);
  // 2. Test non-existent community with valid UUID (should return 404)
  const nonExistentId: string & tags.Format<"uuid"> =
    "00000000-0000-0000-0000-000000000000" as string & tags.Format<"uuid">;
  await TestValidator.httpError(
    "non-existent community returns 404",
    404,
    async () => {
      await api.functional.redditLike.member.communities.at(memberConnection, {
        communityId: nonExistentId,
      });
    },
  );
}
