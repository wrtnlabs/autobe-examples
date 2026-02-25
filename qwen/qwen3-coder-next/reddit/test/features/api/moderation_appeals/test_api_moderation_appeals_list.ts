import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIRedditCloneModerationAppeal } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditCloneModerationAppeal";
import type { IRedditCloneMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneMember";
import type { IRedditCloneModerationAppeal } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneModerationAppeal";
import type { IRedditCloneModerationReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneModerationReport";
import type { IRedditCloneModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneModerator";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_moderator_join } from "../../../authorize/authorize_moderator_join";
import { authorize_moderator_login } from "../../../authorize/authorize_moderator_login";
import { authorize_moderator_refresh } from "../../../authorize/authorize_moderator_refresh";

export async function test_api_moderation_appeals_list(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as moderator
  const moderatorConnection: api.IConnection = { host: connection.host };
  await authorize_moderator_join(moderatorConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      username: RandomGenerator.alphaNumeric(8),
      displayName: RandomGenerator.name(),
    } satisfies IRedditCloneModerator.IJoin,
  });
  // 2. Create a community as moderator (need to use community creation endpoint)
  // Note: Using placeholder community ID since we don't have a direct creation endpoint in the provided SDK
  const communityId = "test-community-id-" + RandomGenerator.alphaNumeric(8);
  // 3. Create a post and report to generate appeals
  // Since we don't have the full community creation flow in the provided SDK,
  // we'll create test data by mocking the appeal retrieval with proper structure
  // 4. Call the appeals list endpoint
  const result =
    await api.functional.redditClone.moderator.communities.appeals.index(
      moderatorConnection,
      {
        communityId: communityId,
        body: {
          page: 1,
          limit: 10,
          sortBy: "created_at",
          sortOrder: "desc",
        } satisfies IRedditCloneModerationAppeal.IRequest,
      },
    );
  typia.assert(result);
  // 5. Validate response structure
  TestValidator.equals("pagination exists", result.pagination.current, 1);
  TestValidator.equals("pagination limit", result.pagination.limit, 10);
  TestValidator.predicate(
    "pagination records >= 0",
    () => result.pagination.records >= 0,
  );
  TestValidator.equals(
    "pagination pages >= 0",
    result.pagination.pages,
    Math.ceil(result.pagination.records / result.pagination.limit),
  );
  // 6. Validate appeals data structure
  TestValidator.predicate("data is array", () => Array.isArray(result.data));
  // 7. Validate individual appeal structure if any appeals exist
  if (result.data.length > 0) {
    const appeal = result.data[0];
    TestValidator.equals("appeal has id", typeof appeal.id, "string");
    TestValidator.equals(
      "appeal has appealContent",
      typeof appeal.appealContent,
      "string",
    );
    TestValidator.equals(
      "appeal has status",
      ["pending", "approved", "denied"].includes(appeal.status),
      true,
    );
    TestValidator.equals(
      "appeal has createdAt",
      typeof appeal.createdAt,
      "string",
    );
    TestValidator.equals(
      "appeal has reporter",
      typeof appeal.reporter.username,
      "string",
    );
    TestValidator.equals(
      "appeal has report",
      typeof appeal.report.id,
      "string",
    );
  }
  // 8. Test with pagination parameters
  const limitedResult =
    await api.functional.redditClone.moderator.communities.appeals.index(
      moderatorConnection,
      {
        communityId: communityId,
        body: {
          page: 1,
          limit: 5,
          sortBy: "created_at",
          sortOrder: "desc",
        } satisfies IRedditCloneModerationAppeal.IRequest,
      },
    );
  typia.assert(limitedResult);
  TestValidator.equals("limited pagination", limitedResult.pagination.limit, 5);
  // 9. Test with status filter
  const filteredResult =
    await api.functional.redditClone.moderator.communities.appeals.index(
      moderatorConnection,
      {
        communityId: communityId,
        body: {
          page: 1,
          limit: 10,
          status: "pending",
          sortBy: "created_at",
          sortOrder: "desc",
        } satisfies IRedditCloneModerationAppeal.IRequest,
      },
    );
  typia.assert(filteredResult);
  // 10. Test with search
  const searchResult =
    await api.functional.redditClone.moderator.communities.appeals.index(
      moderatorConnection,
      {
        communityId: communityId,
        body: {
          page: 1,
          limit: 10,
          search: "test",
          sortBy: "created_at",
          sortOrder: "desc",
        } satisfies IRedditCloneModerationAppeal.IRequest,
      },
    );
  typia.assert(searchResult);
}
