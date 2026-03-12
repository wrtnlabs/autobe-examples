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

/**
 * Test administrator profile retrieval for a regular administrator.
 *
 * This test verifies that an authenticated regular administrator can successfully
 * retrieve their own profile information including all fields: id, email,
 * display_name, bio, grade, created_at, updated_at, and deleted_at.
 * The response should return the complete administrator entity with the correct
 * grade level ('regular').
 */
export async function test_api_administrator_profile_retrieval(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register and authenticate as a regular administrator
  const adminConnection: api.IConnection = { host: connection.host };
  const registered = await authorize_administrator_join(adminConnection, {
    body: {
      display_name: RandomGenerator.name(),
      bio: RandomGenerator.paragraph({ sentences: 3 }),
    },
  });
  typia.assert(registered);
  // 2. Retrieve the administrator's own profile
  const profile = await api.functional.discussionBoard.administrators.at(
    adminConnection,
    {
      administratorId: registered.id,
    },
  );
  typia.assert(profile);
  // 3. Validate business logic
  TestValidator.equals(
    "email matches registration",
    profile.email,
    registered.email,
  );
  TestValidator.equals("grade is regular", profile.grade, "regular");
  TestValidator.equals(
    "display_name matches",
    profile.display_name,
    registered.display_name,
  );
  TestValidator.equals("bio matches", profile.bio, registered.bio);
  TestValidator.predicate("created_at is valid", profile.created_at !== null);
  TestValidator.predicate("updated_at is valid", profile.updated_at !== null);
  TestValidator.equals("account is active", profile.deleted_at, null);
}
