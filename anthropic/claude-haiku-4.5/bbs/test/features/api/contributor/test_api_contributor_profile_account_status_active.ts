import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardContributor } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardContributor";
import type { IDiscussionBoardUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardUser";

export async function test_api_contributor_profile_account_status_active(
  connection: api.IConnection,
) {
  // Step 1: Register a new contributor account
  const email = typia.random<string & tags.Format<"email">>();
  const username = typia.random<
    string &
      tags.MinLength<3> &
      tags.MaxLength<50> &
      tags.Pattern<"^[a-zA-Z0-9_]+$">
  >();
  const password = "SecurePass123!";
  const href = typia.random<string & tags.Format<"uri">>();
  const referrer = typia.random<string & tags.Format<"uri">>();

  const registered: IDiscussionBoardContributor.IAuthorized =
    await api.functional.auth.contributor.join(connection, {
      body: {
        email,
        username,
        password,
        href,
        referrer,
      } satisfies IDiscussionBoardContributor.ICreate,
    });
  typia.assert(registered);

  // Step 2: Verify that the newly registered contributor has account_status set to 'active'
  TestValidator.equals(
    "newly registered contributor has active account status",
    registered.account_status,
    "active",
  );

  // Step 3: Retrieve the contributor's profile
  const profile: IDiscussionBoardUser =
    await api.functional.discussionBoard.contributor.profile.at(connection);
  typia.assert(profile);

  // Step 4: Verify that the retrieved profile also has accountStatus set to 'active'
  TestValidator.equals(
    "retrieved profile has active account status",
    profile.accountStatus,
    "active",
  );

  // Step 5: Verify that the profile ID matches the registered contributor ID
  TestValidator.equals(
    "profile id matches registered contributor id",
    profile.id,
    registered.id,
  );
}
