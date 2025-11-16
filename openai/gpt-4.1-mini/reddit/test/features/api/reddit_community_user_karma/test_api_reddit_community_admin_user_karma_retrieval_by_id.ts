import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IRedditCommunityAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityAdmin";
import type { IRedditCommunityAdminSettings } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityAdminSettings";
import type { IRedditCommunityUserKarma } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityUserKarma";

export async function test_api_reddit_community_admin_user_karma_retrieval_by_id(
  connection: api.IConnection,
) {
  // 1. Admin user registration
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminPassword = RandomGenerator.alphaNumeric(12);
  const admin: IRedditCommunityAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: {
        email: adminEmail,
        password: adminPassword,
      } satisfies IRedditCommunityAdmin.ICreate,
    });
  typia.assert(admin);

  // 2. Create a karma record
  const karmaValue: number & tags.Type<"int32"> = typia.random<
    number & tags.Type<"int32">
  >();
  const karmaCreated: IRedditCommunityUserKarma =
    await api.functional.redditCommunity.admin.redditCommunityUserKarma.create(
      connection,
      {
        body: {
          karma: karmaValue,
        } satisfies IRedditCommunityUserKarma.ICreate,
      },
    );
  typia.assert(karmaCreated);

  // 3. Retrieve karma by ID
  const karmaRetrieved: IRedditCommunityUserKarma =
    await api.functional.redditCommunity.admin.redditCommunityUserKarma.at(
      connection,
      {
        id: karmaCreated.id,
      },
    );
  typia.assert(karmaRetrieved);

  // 4. Validate the retrieved karma matches the created one
  TestValidator.equals("karma id matches", karmaRetrieved.id, karmaCreated.id);
  TestValidator.equals(
    "karma registered_user_id matches",
    karmaRetrieved.registered_user_id,
    karmaCreated.registered_user_id,
  );
  TestValidator.equals(
    "karma score matches",
    karmaRetrieved.karma,
    karmaCreated.karma,
  );
  TestValidator.equals(
    "karma created_at matches",
    karmaRetrieved.created_at,
    karmaCreated.created_at,
  );
  TestValidator.equals(
    "karma updated_at matches",
    karmaRetrieved.updated_at,
    karmaCreated.updated_at,
  );
}
