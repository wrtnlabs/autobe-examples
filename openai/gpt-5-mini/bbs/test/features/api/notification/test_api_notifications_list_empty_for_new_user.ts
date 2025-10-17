import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEconPoliticalForumNotification } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconPoliticalForumNotification";
import type { IEconPoliticalForumRegisteredUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconPoliticalForumRegisteredUser";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEconPoliticalForumNotification } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEconPoliticalForumNotification";

export async function test_api_notifications_list_empty_for_new_user(
  connection: api.IConnection,
) {
  // 1) Prepare a fresh registered user payload
  const username = `user_${RandomGenerator.alphaNumeric(8)}`;
  const email = typia.random<string & tags.Format<"email">>();
  const password = "P@ssw0rd12345"; // test-safe strong password
  const display_name = RandomGenerator.name();

  const joinBody = {
    username,
    email,
    password,
    display_name,
  } satisfies IEconPoliticalForumRegisteredUser.IJoin;

  // 2) Register the new user. The SDK will set connection.headers.Authorization
  const authorized: IEconPoliticalForumRegisteredUser.IAuthorized =
    await api.functional.auth.registeredUser.join(connection, {
      body: joinBody,
    });
  typia.assert(authorized);

  // 3) Prepare notifications request (empty = defaults)
  const requestBody = {} satisfies IEconPoliticalForumNotification.IRequest;

  // 4) Call notifications index
  const page: IPageIEconPoliticalForumNotification.ISummary =
    await api.functional.econPoliticalForum.registeredUser.notifications.index(
      connection,
      {
        body: requestBody,
      },
    );
  typia.assert(page);

  // 5) Business assertions
  // items must be present and be an empty array for a freshly created user
  TestValidator.equals(
    "notifications should be empty for new user",
    page.data,
    [],
  );

  // Pagination metadata sanity checks
  TestValidator.predicate(
    "pagination current page must be >= 1",
    page.pagination.current >= 1,
  );
  TestValidator.predicate(
    "pagination limit must be within allowed bounds (1..100)",
    page.pagination.limit >= 1 && page.pagination.limit <= 100,
  );
  TestValidator.predicate(
    "pagination records must be >= 0",
    page.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination pages must be >= 0",
    page.pagination.pages >= 0,
  );
}
