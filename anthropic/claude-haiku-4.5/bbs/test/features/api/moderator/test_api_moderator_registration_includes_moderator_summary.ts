import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardModerator";

export async function test_api_moderator_registration_includes_moderator_summary(
  connection: api.IConnection,
) {
  // Generate test data for moderator registration
  const email = typia.random<string & tags.Format<"email">>();
  const username = typia.random<
    string &
      tags.MinLength<3> &
      tags.MaxLength<30> &
      tags.Pattern<"^[a-zA-Z0-9_-]+$">
  >();
  const password = typia.random<string & tags.MinLength<8>>();
  const display_name = typia.random<
    string & tags.MinLength<1> & tags.MaxLength<100>
  >();

  // Register a new moderator
  const registered: IDiscussionBoardModerator.IAuthorized =
    await api.functional.auth.moderator.join(connection, {
      body: {
        email,
        username,
        password,
        display_name,
      } satisfies IDiscussionBoardModerator.ICreate,
    });

  // Validate the complete response structure and all type constraints
  typia.assert(registered);

  // Verify moderator summary is included
  const summary: IDiscussionBoardModerator.ISummary = registered.moderator;
  typia.assert(summary);

  // Verify account_status is 'active' for new registrations
  TestValidator.equals(
    "new moderator account_status should be active",
    summary.account_status,
    "active",
  );

  // Verify summary id matches registered id
  TestValidator.equals(
    "moderator summary id matches main moderator id",
    summary.id,
    registered.id,
  );

  // Verify display_name is preserved
  TestValidator.equals(
    "display_name in summary matches input",
    summary.display_name,
    display_name,
  );
}
