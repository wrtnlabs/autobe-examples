import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardSuperAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSuperAdministrator";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import { authorize_super_administrator_join } from "../../../authorize/authorize_super_administrator_join";

export async function test_api_super_administrator_update_various_scenarios(
  connection: api.IConnection,
): Promise<void> {
  // Scenario 1: Successfully update display_name of an existing super administrator
  const superAdminConnection: api.IConnection = { host: connection.host };
  const superAdminAuth = await authorize_super_administrator_join(
    superAdminConnection,
    {
      body: typia.random<IDiscussionBoardSuperAdministrator.IJoin>(),
    },
  );
  superAdminConnection.headers = { Authorization: superAdminAuth.token.access };
  const validUUID1 = typia.random<string & tags.Format<"uuid">>();
  const updateBody1 = {
    display_name: RandomGenerator.name(),
  };
  const updatedAdmin1 =
    await api.functional.discussionBoard.superAdministrator.superAdministrators.update(
      superAdminConnection,
      {
        id: validUUID1,
        body: updateBody1,
      },
    );
  const assertedAdmin1 = typia.assert<unknown>(updatedAdmin1);
  TestValidator.equals(
    "display_name updated",
    (assertedAdmin1 as any).display_name,
    updateBody1.display_name,
  );

  // Scenario 2: Successfully update with at least one property in update-body (example no change no-op)
  const updateBody2 = {
    bio: null as null | string,
  };
  const updatedAdmin2 =
    await api.functional.discussionBoard.superAdministrator.superAdministrators.update(
      superAdminConnection,
      {
        id: validUUID1,
        body: updateBody2,
      },
    );
  typia.assert<unknown>(updatedAdmin2);

  // Scenario 3: Attempt to update a non-existent ID
  const nonExistentUUID = typia.random<string & tags.Format<"uuid">>();
  await TestValidator.error(
    "update non-existent super administrator",
    async () => {
      await api.functional.discussionBoard.superAdministrator.superAdministrators.update(
        superAdminConnection,
        {
          id: nonExistentUUID,
          body: {
            display_name: RandomGenerator.name(),
          },
        },
      );
    },
  );
}
