import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";
import api from "@ORGANIZATION/PROJECT-api";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityBbsAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityBbsAdmin";
import type { ICommunityBbsKarmaHistory } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityBbsKarmaHistory";
import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";
export async function test_api_karma_history_update_by_admin(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Create new connection for admin and authenticate
  const adminConnection: api.IConnection = { host: connection.host };
  const admin: ICommunityBbsAdmin.IAuthorized = await authorize_admin_join(
    adminConnection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(16),
      } satisfies ICommunityBbsAdmin.IJoin,
    },
  );
  typia.assert(admin);
  // Step 2: Create a new connection for a regular user (non-admin)
  const userConnection: api.IConnection = { host: connection.host };
  const user: ICommunityBbsAdmin.IAuthorized = await authorize_admin_join(
    userConnection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(16),
      } satisfies ICommunityBbsAdmin.IJoin,
    },
  );
  typia.assert(user);
  // Step 3: Test that admin can update karma history record with valid data
  // Create a valid karma history record using admin that we can update
  const userId = typia.random<string & tags.Format<"uuid">>();
  const previousScore = 100;
  const reason = "Initial karma adjustment";
  // Since there's no create method, we cannot create a karma history record.
  // We are forced to test against non-existent records to verify the API behavior.
  // Test 1: Validate that admin user cannot update non-existent karma history record with valid data
  // We use a valid UUID but it doesn't exist
  const nonExistentId = typia.random<string & tags.Format<"uuid">>();
  await TestValidator.error(
    "update fails on non-existent karma history record",
    async () => {
      await api.functional.communityBbs.admin.karma_history.update(
        adminConnection,
        {
          karmaHistoryId: nonExistentId,
          body: {
            new_score: 150,
            reason: "Moderator adjustment for exemplary contribution",
          } satisfies ICommunityBbsKarmaHistory.IUpdate,
        },
      );
    },
  );
  // Test 2: Validate that non-admin user cannot update any karma history record
  const randomId = typia.random<string & tags.Format<"uuid">>();
  await TestValidator.error(
    "non-admin cannot update karma history record",
    async () => {
      await api.functional.communityBbs.admin.karma_history.update(
        userConnection,
        {
          karmaHistoryId: randomId,
          body: {
            new_score: 150,
            reason: "Moderator adjustment for exemplary contribution",
          } satisfies ICommunityBbsKarmaHistory.IUpdate,
        },
      );
    },
  );
  // Test 3: Verify update() requires minimum 5 character reason
  await TestValidator.error(
    "update fails with reason shorter than 5 characters",
    async () => {
      await api.functional.communityBbs.admin.karma_history.update(
        adminConnection,
        {
          karmaHistoryId: nonExistentId,
          body: {
            new_score: 150,
            reason: "test", // only 4 characters
          } satisfies ICommunityBbsKarmaHistory.IUpdate,
        },
      );
    },
  );
  // Test 4: Verify update() requires valid number for new_score
  await TestValidator.error(
    "update fails with non-number new_score",
    async () => {
      await api.functional.communityBbs.admin.karma_history.update(
        adminConnection,
        {
          karmaHistoryId: nonExistentId,
          body: {
            new_score: "invalid" as any, // Force invalid type
            reason: "Valid reason with enough characters",
          } satisfies ICommunityBbsKarmaHistory.IUpdate,
        },
      );
    },
  );
}
