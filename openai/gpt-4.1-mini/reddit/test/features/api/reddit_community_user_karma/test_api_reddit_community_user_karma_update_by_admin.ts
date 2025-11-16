import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IRedditCommunityAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityAdmin";
import type { IRedditCommunityAdminSettings } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityAdminSettings";
import type { IRedditCommunityUserKarma } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityUserKarma";

export async function test_api_reddit_community_user_karma_update_by_admin(
  connection: api.IConnection,
) {
  // 1. Admin user joins / registers account
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const admin: IRedditCommunityAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: {
        email: adminEmail,
        password: "securePassword123",
      } satisfies IRedditCommunityAdmin.ICreate,
    });
  typia.assert(admin);

  // 2. Create a new redditCommunityUserKarma record
  // Since the schema requires only karma key in ICreate
  const karmaCreateBody = {
    karma: typia.random<number & tags.Type<"int32">>(),
  } satisfies IRedditCommunityUserKarma.ICreate;

  const karmaRecord: IRedditCommunityUserKarma =
    await api.functional.redditCommunity.admin.redditCommunityUserKarma.create(
      connection,
      { body: karmaCreateBody },
    );
  typia.assert(karmaRecord);

  // 3. Admin updates the karma score
  const updatedKarma = karmaRecord.karma + 10;

  const karmaUpdateBody = {
    karma: updatedKarma,
  } satisfies IRedditCommunityUserKarma.IUpdate;

  const updatedKarmaRecord: IRedditCommunityUserKarma =
    await api.functional.redditCommunity.admin.redditCommunityUserKarma.update(
      connection,
      {
        id: karmaRecord.id,
        body: karmaUpdateBody,
      },
    );
  typia.assert(updatedKarmaRecord);

  // 4. Validate the updates
  TestValidator.equals(
    "updated karma score matches",
    updatedKarmaRecord.karma,
    updatedKarma,
  );

  TestValidator.equals(
    "karma record ID unchanged",
    updatedKarmaRecord.id,
    karmaRecord.id,
  );

  TestValidator.predicate(
    "updatedAt timestamp is updated",
    new Date(updatedKarmaRecord.updated_at).getTime() >=
      new Date(karmaRecord.updated_at).getTime(),
  );

  TestValidator.equals(
    "createdAt timestamp is unchanged",
    updatedKarmaRecord.created_at,
    karmaRecord.created_at,
  );
}
