import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdministrator";
import type { IDiscussionBoardAdministratorGrade } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdministratorGrade";
import type { IDiscussionBoardRegisteredUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardRegisteredUser";
import type { IDiscussionBoardUserBan } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardUserBan";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIDiscussionBoardUserBan } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardUserBan";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_administrator_join } from "../../../authorize/authorize_administrator_join";
import { authorize_administrator_login } from "../../../authorize/authorize_administrator_login";
import { authorize_administrator_refresh } from "../../../authorize/authorize_administrator_refresh";

export async function test_api_administrator_banned_users_list_basic_access(
  connection: api.IConnection,
): Promise<void> {
  // 1. Administrator registration and login
  const adminJoinConnection: api.IConnection = { host: connection.host };
  const adminAuthorized = await authorize_administrator_join(
    adminJoinConnection,
    {
      body: {
        email: `admin${RandomGenerator.alphaNumeric(4)}@test.com`,
        password: "strongPassword123",
      },
    },
  );
  typia.assert(adminAuthorized);
  const adminConnection: api.IConnection = { host: connection.host };
  adminConnection.headers = {
    Authorization: `Bearer ${adminAuthorized.token.access}`,
  };
  // 2. Test invalid authorization: no token
  await TestValidator.httpError(
    "forbidden access without authentication",
    401,
    async () => {
      await api.functional.discussionBoard.administrator.administrator.banned_users.index(
        { host: connection.host },
        { body: {} },
      );
    },
  );
  // 3. Query banned-users with default empty filters
  const emptyFilterResponse =
    await api.functional.discussionBoard.administrator.administrator.banned_users.index(
      adminConnection,
      {
        body: {},
      },
    );
  typia.assert(emptyFilterResponse);
  // Validate pagination info consistency
  const pagination = emptyFilterResponse.pagination;
  TestValidator.predicate(
    "pagination current page >= 1",
    pagination.current >= 1,
  );
  TestValidator.predicate("pagination limit >= 0", pagination.limit >= 0);
  TestValidator.predicate("pagination records >= 0", pagination.records >= 0);
  TestValidator.predicate("pagination pages >= 0", pagination.pages >= 0);
  TestValidator.predicate(
    "pagination current <= pagination pages or pages is zero",
    pagination.current <= pagination.pages || pagination.pages === 0,
  );
  // Each banned user summary record must have valid properties
  for (const ban of emptyFilterResponse.data) {
    typia.assert(ban);
    // Check id format
    TestValidator.predicate(
      "ban id is valid UUID",
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
        ban.id,
      ),
    );
    // Verify reason is non-empty string
    TestValidator.predicate(
      "ban reason non-empty",
      typeof ban.reason === "string" && ban.reason.length > 0,
    );
    // Check timestamps format
    const dateTimeRegex =
      /^[0-9]{4}-[0-9]{2}-[0-9]{2}T[0-9]{2}:[0-9]{2}:[0-9]{2}.*Z$/i;
    TestValidator.predicate(
      "ban bannedAt ISO8601 format",
      dateTimeRegex.test(ban.bannedAt),
    );
    TestValidator.predicate(
      "ban createdAt ISO8601 format",
      dateTimeRegex.test(ban.createdAt),
    );
    TestValidator.predicate(
      "ban updatedAt ISO8601 format",
      dateTimeRegex.test(ban.updatedAt),
    );
    // deletedAt can be null or ISO string
    if (ban.deletedAt !== null && ban.deletedAt !== undefined) {
      TestValidator.predicate(
        "ban deletedAt ISO8601 format or null",
        dateTimeRegex.test(ban.deletedAt),
      );
    }
    // registeredUser must have valid summary fields
    typia.assert(ban.registeredUser);
    TestValidator.predicate(
      "registeredUser id is valid UUID",
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
        ban.registeredUser.id,
      ),
    );
    TestValidator.predicate(
      "registeredUser email format",
      /^[^@]+@[^@]+\.[^@]+$/.test(ban.registeredUser.email),
    );
    // administrator may be null or have valid summary
    if (ban.administrator !== null && ban.administrator !== undefined) {
      typia.assert(ban.administrator);
      TestValidator.predicate(
        "administrator id is valid UUID",
        /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
          ban.administrator.id,
        ),
      );
      TestValidator.predicate(
        "administrator email format",
        /^[^@]+@[^@]+\.[^@]+$/.test(ban.administrator.email),
      );
    }
  }
  // 4. Query with filters: registeredUserId
  if (emptyFilterResponse.data.length > 0) {
    const firstBan = emptyFilterResponse.data[0];
    const registeredUserId = firstBan.registeredUser.id;
    const filteredByRegisteredUserId =
      await api.functional.discussionBoard.administrator.administrator.banned_users.index(
        adminConnection,
        {
          body: { registeredUserId },
        },
      );
    typia.assert(filteredByRegisteredUserId);
    for (const ban of filteredByRegisteredUserId.data) {
      TestValidator.equals(
        "filter by registeredUserId",
        ban.registeredUser.id,
        registeredUserId,
      );
    }
  }
  // 5. Query with filters: administratorId
  if (emptyFilterResponse.data.length > 0) {
    const firstBan = emptyFilterResponse.data[0];
    if (
      firstBan.administrator !== null &&
      firstBan.administrator !== undefined
    ) {
      const administratorId = firstBan.administrator.id;
      const filteredByAdministratorId =
        await api.functional.discussionBoard.administrator.administrator.banned_users.index(
          adminConnection,
          {
            body: { administratorId },
          },
        );
      typia.assert(filteredByAdministratorId);
      for (const ban of filteredByAdministratorId.data) {
        if (ban.administrator !== null && ban.administrator !== undefined) {
          TestValidator.equals(
            "filter by administratorId",
            ban.administrator.id,
            administratorId,
          );
        }
      }
    }
  }
  // 6. Query with pagination parameters (page, limit)
  const pageTwoResponse =
    await api.functional.discussionBoard.administrator.administrator.banned_users.index(
      adminConnection,
      {
        body: { page: 2, limit: 5 },
      },
    );
  typia.assert(pageTwoResponse);
  TestValidator.predicate(
    "pagination page is 2",
    pageTwoResponse.pagination.current === 2,
  );
  TestValidator.predicate(
    "pagination limit is 5",
    pageTwoResponse.pagination.limit === 5,
  );
}
