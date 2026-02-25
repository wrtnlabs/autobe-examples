import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdministrator";
import type { IDiscussionBoardAdministratorGrade } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdministratorGrade";
import type { IDiscussionBoardRegisteredUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardRegisteredUser";
import type { IDiscussionBoardUserBan } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardUserBan";
import type { IDiscussionBoardUserUnban } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardUserUnban";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIDiscussionBoardUserUnban } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardUserUnban";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_administrator_join } from "../../../authorize/authorize_administrator_join";
import { authorize_administrator_login } from "../../../authorize/authorize_administrator_login";
import { authorize_administrator_refresh } from "../../../authorize/authorize_administrator_refresh";

export async function test_api_administrator_user_unban_list_pagination_and_filtering(
  connection: api.IConnection,
) {
  // 1. Setup administrator account
  const adminConnection: api.IConnection = { host: connection.host };
  const adminAuth = await authorize_administrator_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "SecurePass123!",
    },
  });
  typia.assert(adminAuth);
  adminConnection.headers = {
    Authorization: `Bearer ${adminAuth.token.access}`,
  };
  // 2. Call the unbans list API with default pagination
  let response =
    await api.functional.discussionBoard.administrator.administrator.unbans.index(
      adminConnection,
      {
        body: {},
      },
    );
  typia.assert(response);
  // 3. Validate pagination metadata coherence
  TestValidator.predicate(
    "pagination current page >= 1",
    response.pagination.current >= 1,
  );
  TestValidator.predicate(
    "pagination limit within bounds",
    response.pagination.limit > 0 && response.pagination.limit <= 100,
  );
  TestValidator.predicate(
    "pagination records >= data length",
    response.pagination.records >= response.data.length,
  );
  TestValidator.predicate(
    "pagination pages >= 0",
    response.pagination.pages >= 0,
  );
  // 4. If data exists, validate entries' structure and relationships
  if (response.data.length > 0) {
    for (const unban of response.data) {
      typia.assert(unban);
      typia.assert(unban.userBan);
      typia.assert(unban.administrator);
      // Validate UUID formats for IDs
      TestValidator.predicate(
        "unban id is UUID",
        /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/.test(
          unban.id,
        ),
      );
      TestValidator.predicate(
        "userBan id is UUID",
        /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/.test(
          unban.userBan.id,
        ),
      );
      TestValidator.predicate(
        "administrator id is UUID",
        /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/.test(
          unban.administrator.id,
        ),
      );
      // Validate timestamps format
      TestValidator.predicate(
        "unban createdAt date-time",
        typeof unban.createdAt === "string" && unban.createdAt.length > 10,
      );
      TestValidator.predicate(
        "userBan bannedAt date-time",
        typeof unban.userBan.bannedAt === "string" &&
          unban.userBan.bannedAt.length > 10,
      );
      TestValidator.predicate(
        "unban updatedAt date-time",
        typeof unban.updatedAt === "string" && unban.updatedAt.length > 10,
      );
      // Check deletedAt can be null or string
      TestValidator.predicate(
        "unban deletedAt nullable",
        unban.deletedAt === null || typeof unban.deletedAt === "string",
      );
      // Verify reason is non-empty string
      TestValidator.predicate(
        "unban reason non-empty",
        typeof unban.reason === "string" && unban.reason.length > 0,
      );
      // Verify userBan reason is non-empty
      TestValidator.predicate(
        "userBan reason non-empty",
        typeof unban.userBan.reason === "string" &&
          unban.userBan.reason.length > 0,
      );
      // Validate registeredUser summary inside userBan
      typia.assert(unban.userBan.registeredUser);
      TestValidator.predicate(
        "registeredUser email present",
        typeof unban.userBan.registeredUser.email === "string" &&
          unban.userBan.registeredUser.email.length > 0,
      );
      // Validate administrator summary inside unban
      TestValidator.predicate(
        "administrator email present",
        typeof unban.administrator.email === "string" &&
          unban.administrator.email.length > 0,
      );
    }
  }
  // 5. Test pagination and filtering with multiple pages if records exist
  if (response.pagination.pages > 1) {
    const page2Response =
      await api.functional.discussionBoard.administrator.administrator.unbans.index(
        adminConnection,
        {
          body: { page: 2, limit: response.pagination.limit },
        },
      );
    typia.assert(page2Response);
    TestValidator.predicate(
      "page 2 data length <= limit",
      page2Response.data.length <= response.pagination.limit,
    );
    // Validate page numbers in pagination metadata
    TestValidator.equals(
      "page 2 current page",
      page2Response.pagination.current,
      2,
    );
  }
  // 6. Test filtering by administratorId
  if (response.data.length > 0) {
    const adminId = response.data[0].administrator.id;
    const filteredResponse =
      await api.functional.discussionBoard.administrator.administrator.unbans.index(
        adminConnection,
        {
          body: { administratorId: adminId },
        },
      );
    typia.assert(filteredResponse);
    TestValidator.predicate(
      "filtered data administratorId matches",
      filteredResponse.data.every((d) => d.administrator.id === adminId),
    );
  }
  // 7. Test filtering by createdAfter
  if (response.data.length > 0) {
    const createdAfter = response.data[0].createdAt;
    const createdAfterResponse =
      await api.functional.discussionBoard.administrator.administrator.unbans.index(
        adminConnection,
        {
          body: { createdAfter },
        },
      );
    typia.assert(createdAfterResponse);
    // All unban records should have createdAt >= createdAfter param
    TestValidator.predicate(
      "createdAfter filter works",
      createdAfterResponse.data.every((d) => d.createdAt >= createdAfter),
    );
  }
  // 8. Test empty result on impossible filter
  const impossibleResponse =
    await api.functional.discussionBoard.administrator.administrator.unbans.index(
      adminConnection,
      {
        body: {
          administratorId: typia.random<string & tags.Format<"uuid">>(),
          createdAfter: new Date(
            Date.now() + 1000 * 60 * 60 * 24,
          ).toISOString(),
        },
      },
    );
  typia.assert(impossibleResponse);
  TestValidator.equals("empty data length", impossibleResponse.data.length, 0);
}
