import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdmin";
import type { IDiscussionBoardSection } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSection";
import type { IDiscussionBoardSuperAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSuperAdmin";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_super_admin_join } from "../../../authorize/authorize_super_admin_join";
import { authorize_super_admin_login } from "../../../authorize/authorize_super_admin_login";
import { authorize_super_admin_refresh } from "../../../authorize/authorize_super_admin_refresh";

export async function test_api_moderated_content_history_audit_integrity(
  connection: api.IConnection,
): Promise<void> {
  // Create super administrator session
  const superAdminConnection: api.IConnection = { host: connection.host };
  await authorize_super_admin_join(superAdminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IDiscussionBoardSuperAdmin.IJoin,
  });
  // Test 1: Attempt to delete with valid UUID format
  await TestValidator.error(
    "should reject deletion with valid UUID",
    async () => {
      await api.functional.discussionBoard.superAdmin.moderated_content_histories.erase(
        superAdminConnection,
        {
          historyId: typia.random<string & tags.Format<"uuid">>(),
        },
      );
    },
  );
  // Test 2: Multiple deletion attempts with different valid UUIDs to ensure no partial corruption
  const testIds = ArrayUtil.repeat(3, () =>
    typia.random<string & tags.Format<"uuid">>(),
  );
  for (const historyId of testIds) {
    await TestValidator.error(
      `should reject deletion attempt for valid UUID: ${historyId}`,
      async () => {
        await api.functional.discussionBoard.superAdmin.moderated_content_histories.erase(
          superAdminConnection,
          { historyId },
        );
      },
    );
  }
  // Test 3: Verify that repeated attempts with the same UUID also fail consistently
  const repeatedId = typia.random<string & tags.Format<"uuid">>();
  await TestValidator.error(
    "should reject first deletion attempt",
    async () => {
      await api.functional.discussionBoard.superAdmin.moderated_content_histories.erase(
        superAdminConnection,
        { historyId: repeatedId },
      );
    },
  );
  await TestValidator.error(
    "should reject second deletion attempt with same UUID",
    async () => {
      await api.functional.discussionBoard.superAdmin.moderated_content_histories.erase(
        superAdminConnection,
        { historyId: repeatedId },
      );
    },
  );
}
