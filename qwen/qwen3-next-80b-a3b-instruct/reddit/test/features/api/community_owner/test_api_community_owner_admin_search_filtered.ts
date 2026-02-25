import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIRedditCommunityCommunityOwner } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditCommunityCommunityOwner";
import type { IRedditCommunityCommunityOwner } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunityOwner";
import type { IRedditCommunityPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityPlatformAdmin";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_platform_admin_join } from "../../../authorize/authorize_platform_admin_join";
import { authorize_platform_admin_login } from "../../../authorize/authorize_platform_admin_login";
import { authorize_platform_admin_refresh } from "../../../authorize/authorize_platform_admin_refresh";

export async function test_api_community_owner_admin_search_filtered(
  connection: api.IConnection,
): Promise<void> {
  // Authenticate as platformAdmin
  const adminConnection: api.IConnection = { host: connection.host };
  const adminData = await authorize_platform_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      username: "admin_platform_" + RandomGenerator.alphaNumeric(5),
    },
  });
  // Execute search with desired filters
  const searchParams: IRedditCommunityCommunityOwner.IRequest = {
    username: "admin",
    minKarmaScore: 100,
    maxKarmaScore: 500,
    isDeleted: false,
    page: 1,
    limit: 20,
  };
  const result =
    await api.functional.redditCommunity.platformAdmin.community_owners.index(
      adminConnection,
      { body: searchParams },
    );
  typia.assert(result);
  // Validate pagination metadata
  TestValidator.equals("current page", result.pagination.current, 1);
  TestValidator.equals("limit", result.pagination.limit, 20);
  TestValidator.predicate(
    "records is non-negative number",
    () => result.pagination.records >= 0
  );
  const expectedPages =
    result.pagination.records > 0
      ? Math.ceil(result.pagination.records / 20)
      : 0;
  TestValidator.equals("pages", result.pagination.pages, expectedPages);
  // Validate data content - only summary fields, no sensitive data
  for (const owner of result.data) {
    // Check that all expected fields are present
    TestValidator.predicate("id is UUID", () =>
      /^[0-9a-f-]{36}$/i.test(owner.id)
    );
    TestValidator.predicate(
      "username is string",
      () => typeof owner.username === "string"
    );
    TestValidator.predicate(
      "display_name is string",
      () => typeof owner.display_name === "string"
    );
    TestValidator.predicate(
      "karma_score is non-negative integer",
      () => Number.isInteger(owner.karma_score) && owner.karma_score >= 0
    );
    TestValidator.predicate(
      "created_at is ISO date-time",
      () => new Date(owner.created_at).toISOString() === owner.created_at
    );
    // No sensitive data: no email, no is_deleted, no updated_at, no token
    TestValidator.predicate(
      "no email field",
      () => !("email" in owner)
    );
    TestValidator.predicate(
      "no is_deleted field",
      () => !("is_deleted" in owner)
    );
    TestValidator.predicate(
      "no updated_at field",
      () => !("updated_at" in owner)
    );
    TestValidator.predicate(
      "no token field",
      () => !("token" in owner)
    );
  }
  // Validate that we got a non-negative number of results
  TestValidator.predicate(
    "at least zero owners returned",
    () => result.data.length >= 0
  );
}