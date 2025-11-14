import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPoliticalForumModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IPoliticalForumModerator";

export async function test_api_moderator_registration(
  connection: api.IConnection,
) {
  // Generate valid moderator registration data
  const moderatorEmail: string = typia.random<string & tags.Format<"email">>();
  const moderatorPassword: string = RandomGenerator.alphaNumeric(12);

  // Create new moderator account
  const registeredModerator: IPoliticalForumModerator.IAuthorized =
    await api.functional.auth.moderator.join(connection, {
      body: {
        email: moderatorEmail,
        password: moderatorPassword,
      } satisfies IPoliticalForumModerator.ICreate,
    });
  typia.assert(registeredModerator);

  // Validate moderator identity claims
  TestValidator.equals(
    "moderator email matches",
    registeredModerator.email,
    moderatorEmail,
  );

  // Attempt duplicate email registration - must fail with 409 Conflict
  await TestValidator.error(
    "duplicate email registration should fail",
    async () => {
      await api.functional.auth.moderator.join(connection, {
        body: {
          email: moderatorEmail,
          password: RandomGenerator.alphaNumeric(12),
        } satisfies IPoliticalForumModerator.ICreate,
      });
    },
  );
}
