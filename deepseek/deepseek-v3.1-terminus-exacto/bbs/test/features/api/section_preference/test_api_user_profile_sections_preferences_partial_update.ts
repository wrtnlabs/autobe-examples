import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdmin";
import type { IDiscussionBoardSection } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSection";
import type { IDiscussionBoardSectionPreference } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSectionPreference";
import type { IDiscussionBoardUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardUser";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";
import { authorize_user_join } from "../../../authorize/authorize_user_join";
import { authorize_user_login } from "../../../authorize/authorize_user_login";
import { authorize_user_refresh } from "../../../authorize/authorize_user_refresh";

export async function test_api_user_profile_sections_preferences_partial_update(
  connection: api.IConnection,
): Promise<void> {
  // Create admin connection and authenticate
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      href: "http://localhost:3000/admin",
      referrer: "http://localhost:3000",
      ip: typia.random<string & tags.Format<"ipv4">>(),
    },
  });
  // Create user connection and authenticate via join
  const userConnection: api.IConnection = { host: connection.host };
  const user = await authorize_user_join(userConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "testPassword123",
      display_name: RandomGenerator.name(),
    },
  });
  typia.assert(user);
  // Create multiple sections (since there's no API to create sections, we'll work with existing/pre-existing section structure)
  // Note: In a real implementation, this would call section creation API
  // Set initial comprehensive preferences
  const initialPreferences = {
    display_order: typia.random<
      number & tags.Type<"int32"> & tags.Minimum<0>
    >(),
    notify_new_articles: true,
    notify_new_comments: false,
    is_hidden: false,
    page: null,
    limit: null,
  } satisfies IDiscussionBoardSectionPreference.IRequest;
  const initialResponse =
    await api.functional.discussionBoard.user.profile.sections.preferences.patch(
      userConnection,
      {
        body: initialPreferences,
      },
    );
  typia.assert(initialResponse);
  // Verify initial preference values
  TestValidator.equals(
    "initial notify_new_articles",
    initialResponse.notifyNewArticles,
    true,
  );
  TestValidator.equals(
    "initial notify_new_comments",
    initialResponse.notifyNewComments,
    false,
  );
  TestValidator.predicate(
    "initial display order valid",
    initialResponse.displayOrder >= 0,
  );
  // Perform partial update changing only notification settings
  const partialUpdate = {
    notify_new_articles: false,
    notify_new_comments: true,
  } satisfies IDiscussionBoardSectionPreference.IRequest;
  const partialResponse =
    await api.functional.discussionBoard.user.profile.sections.preferences.patch(
      userConnection,
      {
        body: partialUpdate,
      },
    );
  typia.assert(partialResponse);
  // Verify unchanged fields remain intact
  TestValidator.equals(
    "display order unchanged after partial update",
    partialResponse.displayOrder,
    initialResponse.displayOrder,
  );
  TestValidator.equals(
    "isHidden unchanged after partial update",
    partialResponse.isHidden,
    initialResponse.isHidden,
  );
  // Verify updated fields reflect new values
  TestValidator.equals(
    "notify_new_articles updated correctly",
    partialResponse.notifyNewArticles,
    false,
  );
  TestValidator.equals(
    "notify_new_comments updated correctly",
    partialResponse.notifyNewComments,
    true,
  );
  // Verify response contains complete preference configuration with proper structure
  TestValidator.predicate(
    "has valid ID",
    typeof partialResponse.id === "string",
  );
  TestValidator.predicate(
    "has creation timestamp",
    typeof partialResponse.createdAt === "string",
  );
  TestValidator.predicate(
    "has update timestamp",
    typeof partialResponse.updatedAt === "string",
  );
  TestValidator.predicate(
    "has section data",
    partialResponse.section !== undefined,
  );
  TestValidator.predicate("has user data", partialResponse.user !== undefined);
  // Verify timestamps are properly updated
  TestValidator.predicate(
    "updatedAt changed after modification",
    partialResponse.updatedAt !== initialResponse.updatedAt,
  );
}
