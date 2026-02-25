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

export async function test_api_user_profile_sections_preferences_display_order_consistency(
  connection: api.IConnection,
): Promise<void> {
  // Admin setup: Create admin connection and create sections
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      href: "https://test.com/admin",
      referrer: "https://test.com",
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IDiscussionBoardAdmin.IJoin,
  });
  // User authentication
  const userConnection: api.IConnection = { host: connection.host };
  await authorize_user_join(userConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
    } satisfies IDiscussionBoardUser.IJoin,
  });
  // Testing display order consistency with multiple preference updates
  const preferenceUpdates = [
    {
      display_order: typia.random<
        number & tags.Type<"int32"> & tags.Minimum<0>
      >(),
      notify_new_articles: true,
      notify_new_comments: false,
      is_hidden: false,
    },
    {
      display_order: typia.random<
        number & tags.Type<"int32"> & tags.Minimum<0>
      >(),
      notify_new_articles: false,
      notify_new_comments: true,
      is_hidden: true,
    },
    {
      display_order: 0, // Test minimum boundary
      notify_new_articles: true,
      notify_new_comments: true,
      is_hidden: false,
    },
    {
      display_order: 999, // Test larger order value
      notify_new_articles: false,
      notify_new_comments: false,
      is_hidden: true,
    },
  ];
  for (const update of preferenceUpdates) {
    const response =
      await api.functional.discussionBoard.user.profile.sections.preferences.patch(
        userConnection,
        {
          body: update satisfies IDiscussionBoardSectionPreference.IRequest,
        },
      );
    typia.assert(response);
    // Validate response structure
    TestValidator.predicate("response contains valid id", () =>
      /^[0-9a-f-]{36}$/i.test(response.id),
    );
    TestValidator.equals(
      "display order matches input",
      response.displayOrder,
      update.display_order,
    );
    TestValidator.equals(
      "notification settings match",
      response.notifyNewArticles,
      update.notify_new_articles,
    );
    TestValidator.equals(
      "hidden flag matches",
      response.isHidden,
      update.is_hidden,
    );
  }
  // Test pagination parameters (if provided in request)
  const paginationTest =
    await api.functional.discussionBoard.user.profile.sections.preferences.patch(
      userConnection,
      {
        body: {
          display_order: 5,
          page: 1,
          limit: 10,
        } satisfies IDiscussionBoardSectionPreference.IRequest,
      },
    );
  typia.assert(paginationTest);
}
