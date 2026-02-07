import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdmin";
import type { IDiscussionBoardAdministratorPromotionApproval } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdministratorPromotionApproval";
import type { IDiscussionBoardSuperAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSuperAdmin";
import type { IDiscussionBoardUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardUser";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";
import { authorize_super_admin_join } from "../../../authorize/authorize_super_admin_join";
import { authorize_super_admin_login } from "../../../authorize/authorize_super_admin_login";
import { authorize_super_admin_refresh } from "../../../authorize/authorize_super_admin_refresh";

export async function test_api_superadmin_administrator_deletion_successful(
  connection: api.IConnection,
): Promise<void> {
  // Create a regular administrator
  const adminConnection: api.IConnection = { host: connection.host };
  const admin = await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    },
  });
  typia.assert(admin);
  // Authenticate as super administrator
  const superAdminConnection: api.IConnection = { host: connection.host };
  const superAdmin = await authorize_super_admin_join(superAdminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      privilege_level: "super_admin",
    },
  });
  typia.assert(superAdmin);
  // Delete the administrator assignment
  const deletedAdmin =
    await api.functional.discussionBoard.superAdmin.administrators.erase(
      superAdminConnection,
      {
        administratorId: typia.random<string & tags.Format<"uuid">>(),
      },
    );
  typia.assert(deletedAdmin);
  // Validate response structure
  TestValidator.predicate(
    "response has id field",
    typeof deletedAdmin.id === "string",
  );
  TestValidator.predicate(
    "response has grade field",
    typeof deletedAdmin.grade === "string",
  );
  TestValidator.predicate(
    "response has is_active field",
    typeof deletedAdmin.is_active === "boolean",
  );
  TestValidator.predicate(
    "response has promoted_at field",
    typeof deletedAdmin.promoted_at === "string",
  );
  TestValidator.predicate(
    "response has created_at field",
    typeof deletedAdmin.created_at === "string",
  );
  TestValidator.predicate(
    "response has updated_at field",
    typeof deletedAdmin.updated_at === "string",
  );
  TestValidator.predicate(
    "response has user field",
    typeof deletedAdmin.user === "object",
  );
  TestValidator.predicate(
    "response has admin field",
    deletedAdmin.admin === null || typeof deletedAdmin.admin === "object",
  );
  TestValidator.predicate(
    "response has super_admin field",
    deletedAdmin.super_admin === null ||
      typeof deletedAdmin.super_admin === "object",
  );
}
