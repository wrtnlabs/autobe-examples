import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IRedditCommunityPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityPlatformAdmin";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_platform_admin_join } from "../../../authorize/authorize_platform_admin_join";
import { authorize_platform_admin_login } from "../../../authorize/authorize_platform_admin_login";
import { authorize_platform_admin_refresh } from "../../../authorize/authorize_platform_admin_refresh";

export async function test_api_platform_admin_profile_retrieval_by_other_admin(
  connection: api.IConnection,
): Promise<void> {
  // Create first platform admin
  const admin1Connection: api.IConnection = { host: connection.host };
  const admin1 = await authorize_platform_admin_join(admin1Connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      username: RandomGenerator.name(1),
    },
  });
  typia.assert(admin1);
  // Create second platform admin
  const admin2Connection: api.IConnection = { host: connection.host };
  const admin2 = await authorize_platform_admin_join(admin2Connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      username: RandomGenerator.name(1),
    },
  });
  typia.assert(admin2);
  // First admin retrieves second admin's profile
  const retrievedAdmin2 =
    await api.functional.redditCommunity.platformAdmin.platform_admins.at(
      admin1Connection,
      {
        platformAdminId: admin2.id,
      },
    );
  typia.assert(retrievedAdmin2);
  // Validate returned profile matches expected structure and data
  TestValidator.equals("returned ID matches", retrievedAdmin2.id, admin2.id);
  TestValidator.equals(
    "returned username matches",
    retrievedAdmin2.username,
    admin2.username,
  );
  TestValidator.equals(
    "returned karma_score matches",
    retrievedAdmin2.karma_score,
    admin2.karma_score,
  );
  TestValidator.equals(
    "returned created_at matches",
    retrievedAdmin2.created_at,
    admin2.created_at,
  );
  TestValidator.equals(
    "returned updated_at matches",
    retrievedAdmin2.updated_at,
    admin2.updated_at,
  );
  // Verify email is not exposed in response (private field)
  TestValidator.predicate(
    "email is not present",
    () => !("email" in retrievedAdmin2),
  );
  // Ensure no null/undefined for required fields
  TestValidator.notEquals("id is not null", retrievedAdmin2.id, null);
  TestValidator.notEquals(
    "username is not null",
    retrievedAdmin2.username,
    null,
  );
  TestValidator.notEquals(
    "karma_score is not null",
    retrievedAdmin2.karma_score,
    null,
  );
  TestValidator.notEquals(
    "created_at is not null",
    retrievedAdmin2.created_at,
    null,
  );
  TestValidator.notEquals(
    "updated_at is not null",
    retrievedAdmin2.updated_at,
    null,
  );
}
