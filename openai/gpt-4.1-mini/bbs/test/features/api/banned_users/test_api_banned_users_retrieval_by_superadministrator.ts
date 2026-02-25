import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdministrator";
import type { IDiscussionBoardAdministratorGrade } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdministratorGrade";
import type { IDiscussionBoardRegisteredUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardRegisteredUser";
import type { IDiscussionBoardSuperAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSuperAdministrator";
import type { IDiscussionBoardUserBan } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardUserBan";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIDiscussionBoardUserBan } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardUserBan";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_super_administrator_join } from "../../../authorize/authorize_super_administrator_join";
import { authorize_super_administrator_login } from "../../../authorize/authorize_super_administrator_login";
import { authorize_super_administrator_refresh } from "../../../authorize/authorize_super_administrator_refresh";

export async function test_api_banned_users_retrieval_by_superadministrator(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as super administrator
  const superAdminConnection: api.IConnection = { host: connection.host };
  const superAdmin = await authorize_super_administrator_join(
    superAdminConnection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: "P@ssword1234",
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
        ip: null,
      },
    },
  );
  // The authorization token is in superAdmin.token, but connection.headers.Authorization requires 'Bearer ' prefix
  superAdminConnection.headers ??= {};
  superAdminConnection.headers.Authorization = `Bearer ${superAdmin.token.access}`;
  // 2. Test default pagination retrieval (page=undefined, limit=undefined)
  const defaultBody: IDiscussionBoardUserBan.IRequest = {};
  const defaultBannedUsers =
    await api.functional.discussionBoard.superAdministrator.administrator.bans.index(
      superAdminConnection,
      { body: defaultBody },
    );
  typia.assert(defaultBannedUsers);
  // Validate pagination metadata
  const pagination = defaultBannedUsers.pagination;
  TestValidator.predicate(
    "default pagination current page >= 0",
    pagination.current >= 0,
  );
  TestValidator.predicate(
    "default pagination limit >= 0",
    pagination.limit >= 0,
  );
  TestValidator.predicate(
    "default pagination records >= 0",
    pagination.records >= 0,
  );
  TestValidator.predicate(
    "default pagination pages >= 0",
    pagination.pages >= 0,
  );
  // Validate each banned user entry
  for (const ban of defaultBannedUsers.data) {
    typia.assert(ban);
    // Check required fields existence
    TestValidator.predicate(
      "ban id is uuid",
      typeof ban.id === "string" && ban.id.length > 0,
    );
    TestValidator.predicate(
      "ban reason is non-empty string",
      typeof ban.reason === "string" && ban.reason.length > 0,
    );
    TestValidator.predicate(
      "ban timestamps valid",
      typeof ban.bannedAt === "string" &&
        typeof ban.createdAt === "string" &&
        typeof ban.updatedAt === "string",
    );
    TestValidator.predicate(
      "registeredUser exists and isBanned true",
      ban.registeredUser !== null && ban.registeredUser.isBanned === true,
    );
    if (ban.administrator !== null && ban.administrator !== undefined) {
      TestValidator.predicate(
        "administrator id is string",
        typeof ban.administrator.id === "string" &&
          ban.administrator.id.length > 0,
      );
      TestValidator.predicate(
        "administrator email is string",
        typeof ban.administrator.email === "string" &&
          ban.administrator.email.length > 0,
      );
    }
  }
  // 3. Test explicit pagination parameters
  const explicitBody: IDiscussionBoardUserBan.IRequest = {
    page: 1,
    limit: 5,
  };
  const explicitBannedUsers =
    await api.functional.discussionBoard.superAdministrator.administrator.bans.index(
      superAdminConnection,
      { body: explicitBody },
    );
  typia.assert(explicitBannedUsers);
  // Validate explicit pagination metadata
  const paginationExplicit = explicitBannedUsers.pagination;
  TestValidator.equals(
    "pagination current page equals requested",
    paginationExplicit.current,
    1,
  );
  TestValidator.equals(
    "pagination limit equals requested",
    paginationExplicit.limit,
    5,
  );
  TestValidator.predicate(
    "pagination records >= 0",
    paginationExplicit.records >= 0,
  );
  TestValidator.predicate(
    "pagination pages >= 0",
    paginationExplicit.pages >= 0,
  );
  // Validate each ban data entry
  for (const ban of explicitBannedUsers.data) {
    typia.assert(ban);
    TestValidator.predicate(
      "ban id string non-empty",
      typeof ban.id === "string" && ban.id.length > 0,
    );
    TestValidator.predicate(
      "ban reason string non-empty",
      typeof ban.reason === "string" && ban.reason.length > 0,
    );
    TestValidator.predicate(
      "ban timestamps strings",
      typeof ban.bannedAt === "string" &&
        typeof ban.createdAt === "string" &&
        typeof ban.updatedAt === "string",
    );
    TestValidator.predicate(
      "registeredUser exists and isBanned true",
      ban.registeredUser !== null && ban.registeredUser.isBanned === true,
    );
    if (ban.administrator !== null && ban.administrator !== undefined) {
      TestValidator.predicate(
        "administrator id is string",
        typeof ban.administrator.id === "string" &&
          ban.administrator.id.length > 0,
      );
      TestValidator.predicate(
        "administrator email is string",
        typeof ban.administrator.email === "string" &&
          ban.administrator.email.length > 0,
      );
    }
  }
  // 4. Test access control: banned users retrieval with unauthorized connection
  const unauthorizedConnection: api.IConnection = { host: connection.host };
  await TestValidator.error(
    "banned users retrieval forbidden for unauthorized",
    async () => {
      await api.functional.discussionBoard.superAdministrator.administrator.bans.index(
        unauthorizedConnection,
        { body: {} },
      );
    },
  );
}
