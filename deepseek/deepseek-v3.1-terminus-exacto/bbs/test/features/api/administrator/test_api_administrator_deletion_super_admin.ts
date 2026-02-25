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

export async function test_api_administrator_deletion_super_admin(
  connection: api.IConnection,
): Promise<void> {
  // Create first super administrator
  const superAdminConnection1: api.IConnection = { host: connection.host };
  const superAdmin1 = await authorize_super_admin_join(superAdminConnection1, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IDiscussionBoardSuperAdmin.IJoin,
  });
  typia.assert(superAdmin1);
  // Create second super administrator
  const superAdminConnection2: api.IConnection = { host: connection.host };
  const superAdmin2 = await authorize_super_admin_join(superAdminConnection2, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IDiscussionBoardSuperAdmin.IJoin,
  });
  typia.assert(superAdmin2);
  // Delete the second super administrator using the first super administrator
  await api.functional.discussionBoard.superAdmin.administrators.erase(
    superAdminConnection1,
    {
      administratorId: superAdmin2.id,
    },
  );
  // Validate that deleted super admin cannot access privileged endpoints
  await TestValidator.error(
    "deleted administrator cannot perform privileged operations",
    async () => {
      await api.functional.discussionBoard.superAdmin.administrators.erase(
        superAdminConnection2,
        {
          administratorId: superAdmin1.id,
        },
      );
    },
  );
  // Attempt to delete the last remaining super administrator (should fail due to business validation)
  await TestValidator.error(
    "cannot delete last remaining super administrator",
    async () => {
      await api.functional.discussionBoard.superAdmin.administrators.erase(
        superAdminConnection1,
        {
          administratorId: superAdmin1.id,
        },
      );
    },
  );
}
