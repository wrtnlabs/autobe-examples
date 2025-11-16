import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEconomicDiscussionModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicDiscussionModerator";

export async function test_api_moderator_promotion_level_update(
  connection: api.IConnection,
) {
  // Step 1: Create a new moderator account with initial permissions
  const createModeratorBody = {
    username: `moderator_${RandomGenerator.alphabets(8)}`,
    email: typia.random<string & tags.Format<"email">>(),
    password_hash: RandomGenerator.alphaNumeric(32),
    email_verified: true,
    two_factor_enabled: false,
    moderation_level: "junior",
  } satisfies IEconomicDiscussionModerator.ICreate;

  const newModerator = await api.functional.auth.moderator.join(connection, {
    body: createModeratorBody,
  });
  typia.assert(newModerator);

  TestValidator.equals(
    "new moderator created with junior level",
    newModerator.moderation_level,
    "junior",
  );

  // Step 2: Update the moderator's level to a higher authorization tier
  const updateBody = {
    moderation_level: "senior",
    two_factor_enabled: true,
  } satisfies IEconomicDiscussionModerator.IUpdate;

  const updatedModerator =
    await api.functional.economicDiscussion.moderator.moderators.update(
      connection,
      {
        moderatorId: newModerator.id,
        body: updateBody,
      },
    );
  typia.assert(updatedModerator);

  // Step 3: Verify the promotion update was successful
  TestValidator.equals(
    "moderator promoted to senior level",
    updatedModerator.moderation_level,
    "senior",
  );
  TestValidator.equals(
    "two-factor authentication enabled",
    updatedModerator.two_factor_enabled,
    true,
  );
  TestValidator.equals(
    "moderator id preserved after update",
    updatedModerator.id,
    newModerator.id,
  );
  TestValidator.equals(
    "username preserved after update",
    updatedModerator.username,
    newModerator.username,
  );

  // Step 4: Test additional permission changes
  const secondUpdateBody = {
    moderation_level: "admin",
    username: `senior_${updatedModerator.username}`,
  } satisfies IEconomicDiscussionModerator.IUpdate;

  const finalModerator =
    await api.functional.economicDiscussion.moderator.moderators.update(
      connection,
      {
        moderatorId: updatedModerator.id,
        body: secondUpdateBody,
      },
    );
  typia.assert(finalModerator);

  TestValidator.equals(
    "moderator promoted to admin level",
    finalModerator.moderation_level,
    "admin",
  );
  TestValidator.equals(
    "username updated correctly",
    finalModerator.username,
    `senior_${updatedModerator.username}`,
  );
  TestValidator.equals(
    "email preserved through updates",
    finalModerator.email,
    newModerator.email,
  );
}
