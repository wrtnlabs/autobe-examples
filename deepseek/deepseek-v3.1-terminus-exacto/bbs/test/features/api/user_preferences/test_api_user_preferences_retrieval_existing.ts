import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardSection } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSection";
import type { IDiscussionBoardSectionPreference } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSectionPreference";
import type { IDiscussionBoardUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardUser";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIDiscussionBoardSectionPreference } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardSectionPreference";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_user_join } from "../../../authorize/authorize_user_join";
import { authorize_user_login } from "../../../authorize/authorize_user_login";
import { authorize_user_refresh } from "../../../authorize/authorize_user_refresh";

export async function test_api_user_preferences_retrieval_existing(
  connection: api.IConnection,
): Promise<void> {
  // Create user connection and authenticate
  const userConnection: api.IConnection = { host: connection.host };
  const user = await authorize_user_join(userConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      bio: RandomGenerator.paragraph({ sentences: 2 }),
    } satisfies IDiscussionBoardUser.IJoin,
  });
  typia.assert(user);
  // Retrieve user preferences
  const preferences =
    await api.functional.discussionBoard.user.preferences.index(userConnection);
  typia.assert(preferences);
  // Validate pagination business logic
  TestValidator.predicate(
    "pagination records matches data length",
    preferences.pagination.records === preferences.data.length,
  );
  // Validate each preference record contains expected business data
  for (const preference of preferences.data) {
    TestValidator.predicate(
      "preference has valid display order",
      preference.display_order >= 0,
    );
    TestValidator.predicate(
      "section has valid display order",
      preference.section.display_order >= 0,
    );
    TestValidator.predicate(
      "section has non-empty name",
      preference.section.name.length > 0,
    );
  }
  // Validate sorting by display_order (business logic)
  if (preferences.data.length > 1) {
    for (let i = 1; i < preferences.data.length; i++) {
      TestValidator.predicate(
        `preferences sorted by display_order ascending`,
        preferences.data[i].display_order >=
          preferences.data[i - 1].display_order,
      );
    }
  }
}
