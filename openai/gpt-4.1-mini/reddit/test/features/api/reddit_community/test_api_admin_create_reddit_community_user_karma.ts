import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IRedditCommunityAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityAdmin";
import type { IRedditCommunityAdminSettings } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityAdminSettings";
import type { IRedditCommunityUserKarma } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityUserKarma";

export async function test_api_admin_create_reddit_community_user_karma(
  connection: api.IConnection,
) {
  // 1. Register a new admin user using the /auth/admin/join endpoint
  const adminCreateBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
  } satisfies IRedditCommunityAdmin.ICreate;

  const adminUser: IRedditCommunityAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: adminCreateBody,
    });
  typia.assert(adminUser);

  // 2. Use the authenticated admin user context to create a reddit community user karma record
  //    The karma score will be a random integer (int32), according to IRedditCommunityUserKarma.ICreate
  const karmaCreateBody = {
    karma: typia.random<number & tags.Type<"int32">>(),
  } satisfies IRedditCommunityUserKarma.ICreate;

  // Call create karma endpoint
  const karmaRecord: IRedditCommunityUserKarma =
    await api.functional.redditCommunity.admin.redditCommunityUserKarma.create(
      connection,
      {
        body: karmaCreateBody,
      },
    );
  typia.assert(karmaRecord);

  // Validate that the karma value in the response equals the requested karma
  TestValidator.equals(
    "karma score matches request",
    karmaRecord.karma,
    karmaCreateBody.karma,
  );

  // Validate that the registered_user_id is a valid UUID string
  TestValidator.predicate(
    "registered_user_id follows UUID format",
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
      karmaRecord.registered_user_id,
    ),
  );

  // Validate other properties exist and are truthy
  TestValidator.predicate(
    "karma record has id",
    typeof karmaRecord.id === "string" && karmaRecord.id.length > 0,
  );
  TestValidator.predicate(
    "karma record has created_at date",
    typeof karmaRecord.created_at === "string" &&
      karmaRecord.created_at.length > 0,
  );
  TestValidator.predicate(
    "karma record has updated_at date",
    typeof karmaRecord.updated_at === "string" &&
      karmaRecord.updated_at.length > 0,
  );
}
