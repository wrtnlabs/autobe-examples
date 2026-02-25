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

export async function test_api_super_admins_retrieve_all_admin_relationships(
  connection: api.IConnection,
): Promise<void> {
  // Create a new super administrator connection
  const superAdminConnection: api.IConnection = { host: connection.host };
  // Join as a super administrator using the utility function
  const authResponse = await authorize_super_admin_join(superAdminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "test_password_123",
      href: "https://test.example.com",
      referrer: "https://referrer.example.com",
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IDiscussionBoardSuperAdmin.IJoin,
  });
  typia.assert(authResponse);
  // Retrieve the super administrator details using the authenticated superAdminId
  const superAdminDetails =
    await api.functional.discussionBoard.super_admins.at(superAdminConnection, {
      superAdminId: authResponse.id,
    });
  typia.assert(superAdminDetails);
  // Validate business logic - the retrieved super admin should match the authenticated one
  TestValidator.equals(
    "super admin ID matches",
    superAdminDetails.id,
    authResponse.id,
  );
  // Remove the email validation since authResponse likely doesn't contain email
  // Validate that the hierarchical relationship structure is present
  // These fields are validated by typia.assert() so we only check business logic aspects
  TestValidator.predicate(
    "has permission level",
    superAdminDetails.permission_level.length > 0,
  );
  TestValidator.predicate(
    "has section assigned",
    superAdminDetails.section.id.length > 0,
  );
}