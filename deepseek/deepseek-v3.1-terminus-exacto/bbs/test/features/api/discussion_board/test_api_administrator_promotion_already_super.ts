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
import { generate_random_discussion_board_super_admin_administrators_create } from "../../../generate/generate_random_discussion_board_super_admin_administrators_create";
import { prepare_random_discussion_board_super_admin } from "../../../prepare/prepare_random_discussion_board_super_admin";

export async function test_api_administrator_promotion_already_super(
  connection: api.IConnection,
): Promise<void> {
  // Create and authenticate super admin
  const superAdminJoinConnection: api.IConnection = { host: connection.host };
  const authorizedSuperAdmin = await authorize_super_admin_join(
    superAdminJoinConnection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(16),
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
        ip: typia.random<string & tags.Format<"ipv4">>(),
      } satisfies IDiscussionBoardSuperAdmin.IJoin,
    },
  );
  typia.assert(authorizedSuperAdmin);
  // Create authenticated super admin connection
  const authenticatedSuperAdminConnection: api.IConnection = {
    host: connection.host,
    headers: { Authorization: authorizedSuperAdmin.token.access },
  };
  // Create first regular administrator
  const admin1 =
    await generate_random_discussion_board_super_admin_administrators_create(
      authenticatedSuperAdminConnection,
      {
        body: {
          permission_level: "regular",
          admin_id: typia.random<string & tags.Format<"uuid">>(),
          super_admin_id: null,
        } satisfies IDiscussionBoardSuperAdmin.ICreate,
      },
    );
  typia.assert(admin1);
  // Create second regular administrator
  const admin2 =
    await generate_random_discussion_board_super_admin_administrators_create(
      authenticatedSuperAdminConnection,
      {
        body: {
          permission_level: "regular",
          admin_id: typia.random<string & tags.Format<"uuid">>(),
          super_admin_id: null,
        } satisfies IDiscussionBoardSuperAdmin.ICreate,
      },
    );
  typia.assert(admin2);
  // Promote first administrator to super status
  const promotedAdmin =
    await api.functional.discussionBoard.superAdmin.administrators.promote(
      authenticatedSuperAdminConnection,
      {
        administratorId: admin1.id,
        body: {
          confirmed: true,
          reason: "Test promotion to super admin",
        } satisfies IDiscussionBoardSuperAdmin.IPromote,
      },
    );
  typia.assert(promotedAdmin);
  // Validate promotion was successful
  TestValidator.equals(
    "permission level updated",
    promotedAdmin.permission_level,
    "super",
  );
  // Attempt to promote second administrator who is already super
  await TestValidator.error("promote already super administrator", async () => {
    await api.functional.discussionBoard.superAdmin.administrators.promote(
      authenticatedSuperAdminConnection,
      {
        administratorId: promotedAdmin.id, // Use the already promoted admin
        body: {
          confirmed: true,
          reason: "Attempt to promote already super admin",
        } satisfies IDiscussionBoardSuperAdmin.IPromote,
      },
    );
  });
}
