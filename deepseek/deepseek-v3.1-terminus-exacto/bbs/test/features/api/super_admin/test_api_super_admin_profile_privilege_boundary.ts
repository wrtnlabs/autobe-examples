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

export async function test_api_super_admin_profile_privilege_boundary(
  connection: api.IConnection,
): Promise<void> {
  // Create super admin account with specific password
  const superAdminConnection: api.IConnection = { host: connection.host };
  const password = RandomGenerator.alphaNumeric(16);
  const joinResponse = await authorize_super_admin_join(superAdminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: password,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IDiscussionBoardSuperAdmin.IJoin,
  });
  typia.assert(joinResponse);
  // Login with the same password used during join
  const loginResponse = await authorize_super_admin_login(
    superAdminConnection,
    {
      body: {
        email: joinResponse.email,
        password: password,
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
        ip: typia.random<string & tags.Format<"ipv4">>(),
      } satisfies IDiscussionBoardSuperAdmin.ILogin,
    },
  );
  typia.assert(loginResponse);
  // Test valid privilege level updates with realistic values
  const validPrivilegeLevels = [
    "full_access",
    "read_only",
    "moderate",
  ] as const;
  for (const privilegeLevel of validPrivilegeLevels) {
    const updateResponse =
      await api.functional.discussionBoard.superAdmin.super_admins.profile.update(
        superAdminConnection,
        {
          body: {
            permission_level: privilegeLevel,
          } satisfies IDiscussionBoardSuperAdmin.IUpdate,
        },
      );
    typia.assert(updateResponse);
    TestValidator.equals(
      "privilege level updated",
      updateResponse.permission_level,
      privilegeLevel,
    );
  }
  // Test boundary values for permission_level field
  // Test very long string (potential server validation)
  await TestValidator.error("very long privilege level", async () => {
    await api.functional.discussionBoard.superAdmin.super_admins.profile.update(
      superAdminConnection,
      {
        body: {
          permission_level: RandomGenerator.alphaNumeric(1000),
        } satisfies IDiscussionBoardSuperAdmin.IUpdate,
      },
    );
  });
  // Test special characters in privilege level
  await TestValidator.error(
    "special characters in privilege level",
    async () => {
      await api.functional.discussionBoard.superAdmin.super_admins.profile.update(
        superAdminConnection,
        {
          body: {
            permission_level: "admin<script>alert('xss')</script>",
          } satisfies IDiscussionBoardSuperAdmin.IUpdate,
        },
      );
    },
  );
  // Test SQL injection attempt
  await TestValidator.error("SQL injection attempt", async () => {
    await api.functional.discussionBoard.superAdmin.super_admins.profile.update(
      superAdminConnection,
      {
        body: {
          permission_level: "admin'; DROP TABLE users; --",
        } satisfies IDiscussionBoardSuperAdmin.IUpdate,
      },
    );
  });
  // Final validation: ensure privilege level can be set back to a valid value
  const finalUpdate =
    await api.functional.discussionBoard.superAdmin.super_admins.profile.update(
      superAdminConnection,
      {
        body: {
          permission_level: "full_access",
        } satisfies IDiscussionBoardSuperAdmin.IUpdate,
      },
    );
  typia.assert(finalUpdate);
  TestValidator.equals(
    "final privilege level persists",
    finalUpdate.permission_level,
    "full_access",
  );
}
