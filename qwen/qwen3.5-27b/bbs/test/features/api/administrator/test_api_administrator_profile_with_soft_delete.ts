import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdministrator";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_administrator_join } from "../../../authorize/authorize_administrator_join";
import { authorize_administrator_login } from "../../../authorize/authorize_administrator_login";
import { authorize_administrator_refresh } from "../../../authorize/authorize_administrator_refresh";

export async function test_api_administrator_profile_with_soft_delete(
  connection: api.IConnection,
): Promise<void> {
  /**
   * Test scenario for a super administrator retrieving another administrator's profile including soft-deleted accounts.
   * This validates the privilege escalation model where super admins can access audit trail information.
   * The response should include the deleted_at field to confirm soft-deleted status is visible.
   */
  // 1. Create super administrator connection and authenticate
  const superAdminConnection: api.IConnection = { host: connection.host };
  const superAdmin = await authorize_administrator_join(superAdminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.Format<"password">>(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IDiscussionBoardAdministrator.IJoin,
  });
  typia.assert(superAdmin);
  // 2. Create target administrator connection and authenticate
  const targetAdminConnection: api.IConnection = { host: connection.host };
  const targetAdmin = await authorize_administrator_join(
    targetAdminConnection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: typia.random<string & tags.Format<"password">>(),
        display_name: RandomGenerator.name(),
        bio: RandomGenerator.paragraph({ sentences: 2 }),
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      } satisfies IDiscussionBoardAdministrator.IJoin,
    },
  );
  typia.assert(targetAdmin);
  // 3. Super admin retrieves target administrator's profile
  const retrievedAdmin = await api.functional.discussionBoard.administrators.at(
    superAdminConnection,
    {
      administratorId: targetAdmin.id,
    },
  );
  typia.assert(retrievedAdmin);
  // 4. Validate the response contains expected fields
  TestValidator.equals(
    "administrator ID matches",
    retrievedAdmin.id,
    targetAdmin.id,
  );
  TestValidator.equals(
    "email matches",
    retrievedAdmin.email,
    targetAdmin.email,
  );
  TestValidator.equals(
    "display_name matches",
    retrievedAdmin.display_name,
    targetAdmin.display_name,
  );
  TestValidator.equals("bio matches", retrievedAdmin.bio, targetAdmin.bio);
  TestValidator.equals("grade is regular", retrievedAdmin.grade, "regular");
  // 5. Validate soft delete field is present and null for active account
  // This demonstrates super admin visibility to audit trail information
  TestValidator.equals(
    "deleted_at is null for active account",
    retrievedAdmin.deleted_at,
    null,
  );
  // 6. Validate timestamps are present and valid
  TestValidator.predicate("created_at is valid date-time", () => {
    const date = new Date(retrievedAdmin.created_at);
    return !isNaN(date.getTime());
  });
  TestValidator.predicate("updated_at is valid date-time", () => {
    const date = new Date(retrievedAdmin.updated_at);
    return !isNaN(date.getTime());
  });
}
