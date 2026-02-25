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

export async function test_api_administrator_retrieve_regular_admin_details(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as super administrator
  const superAdminConnection: api.IConnection = { host: connection.host };
  const superAdmin = await authorize_super_admin_join(superAdminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: "https://test.com/registration",
      referrer: "https://test.com",
      ip: "192.168.1.1",
    } satisfies IDiscussionBoardSuperAdmin.IJoin,
  });
  typia.assert(superAdmin);
  // 2. Create a regular administrator assignment
  const regularAdmin =
    await generate_random_discussion_board_super_admin_administrators_create(
      superAdminConnection,
      {
        body: {
          permission_level: "regular",
          admin_id: typia.random<string & tags.Format<"uuid">>(),
          super_admin_id: null,
        } satisfies IDiscussionBoardSuperAdmin.ICreate,
      },
    );
  typia.assert(regularAdmin);
  // 3. Retrieve the administrator details
  const retrievedAdmin =
    await api.functional.discussionBoard.superAdmin.administrators.at(
      superAdminConnection,
      {
        administratorId: regularAdmin.id,
      },
    );
  typia.assert(retrievedAdmin);
  // 4. Validate the retrieved administrator matches the created one
  TestValidator.equals("admin IDs match", retrievedAdmin.id, regularAdmin.id);
  TestValidator.equals(
    "permission levels match",
    retrievedAdmin.permission_level,
    regularAdmin.permission_level,
  );
  TestValidator.equals(
    "assignment dates match",
    retrievedAdmin.assignment_date,
    regularAdmin.assignment_date,
  );
}
