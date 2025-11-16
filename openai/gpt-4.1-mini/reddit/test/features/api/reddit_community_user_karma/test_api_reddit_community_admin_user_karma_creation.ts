import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IRedditCommunityAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityAdmin";
import type { IRedditCommunityAdminSettings } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityAdminSettings";
import type { IRedditCommunityUserKarma } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityUserKarma";

export async function test_api_reddit_community_admin_user_karma_creation(
  connection: api.IConnection,
) {
  // 1. Authenticate as an admin user by joining
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminPassword = "1234";
  const adminAuthorized: IRedditCommunityAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: {
        email: adminEmail,
        password: adminPassword,
      } satisfies IRedditCommunityAdmin.ICreate,
    });
  typia.assert(adminAuthorized);

  // 2. Create a redditCommunityUserKarma record with a valid karma
  const karmaValue = typia.random<number & tags.Type<"int32">>();
  const karmaRecord: IRedditCommunityUserKarma =
    await api.functional.redditCommunity.admin.redditCommunityUserKarma.create(
      connection,
      {
        body: {
          karma: karmaValue,
        } satisfies IRedditCommunityUserKarma.ICreate,
      },
    );
  typia.assert(karmaRecord);

  // 3. Validate the created karma record content
  TestValidator.predicate(
    "karma id is uuid",
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/.test(
      karmaRecord.id,
    ),
  );
  TestValidator.predicate(
    "karma is a 32bit integer",
    Number.isInteger(karmaRecord.karma) &&
      karmaRecord.karma >= -2147483648 &&
      karmaRecord.karma <= 2147483647,
  );
  TestValidator.predicate(
    "karma created_at is date-time format",
    !Number.isNaN(Date.parse(karmaRecord.created_at)),
  );
  TestValidator.predicate(
    "karma updated_at is date-time format",
    !Number.isNaN(Date.parse(karmaRecord.updated_at)),
  );
}
