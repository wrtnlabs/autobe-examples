import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEconPolDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconPolDiscussionBoardAdmin";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEconPolDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEconPolDiscussionBoardAdmin";

export async function test_api_econ_pol_discussion_board_admins_patch_search_pagination(
  connection: api.IConnection,
) {
  // 1. Admin user registration to get auth token
  const adminJoinBody = {
    username: RandomGenerator.alphaNumeric(8),
    email: `${RandomGenerator.alphaNumeric(5)}@example.com`,
    password: RandomGenerator.alphaNumeric(12),
  } satisfies IEconPolDiscussionBoardAdmin.IJoin;
  const adminAuthorized = await api.functional.auth.admin.join(connection, {
    body: adminJoinBody,
  });
  typia.assert(adminAuthorized);

  // 2. Create multiple admin accounts
  const adminsCreated: IEconPolDiscussionBoardAdmin[] = [];
  for (let i = 0; i < 5; ++i) {
    const body = {
      adminUsername: `admin${RandomGenerator.alphaNumeric(4)}`,
      email: `${RandomGenerator.alphaNumeric(6)}@example.com`,
      password: RandomGenerator.alphaNumeric(12),
      role: "admin",
    } satisfies IEconPolDiscussionBoardAdmin.ICreate;
    const admin =
      await api.functional.econPolDiscussionBoard.admin.econPolDiscussionBoardAdmins.create(
        connection,
        { body },
      );
    typia.assert(admin);
    adminsCreated.push(admin);
  }

  // 3. Retrieve list with pagination (page=1, limit=10), sort by created_at asc
  const paginationBody = {
    page: 1,
    limit: 10,
    sort_by: "created_at",
    order: "asc",
  } satisfies IEconPolDiscussionBoardAdmin.IRequest;
  const pageResult =
    await api.functional.econPolDiscussionBoard.admin.econPolDiscussionBoardAdmins.index(
      connection,
      { body: paginationBody },
    );
  typia.assert(pageResult);

  // Validate all created admins present in the result
  for (const created of adminsCreated) {
    TestValidator.predicate(
      `admin username ${created.adminUsername} exists in pageResult`,
      pageResult.data.some((item) => item.username === created.adminUsername),
    );
    TestValidator.predicate(
      `admin email ${created.email} exists in pageResult`,
      pageResult.data.some((item) => item.email === created.email),
    );
  }

  // Validate pagination info
  TestValidator.predicate(
    "pagination current equals 1",
    pageResult.pagination.current === 1,
  );
  TestValidator.predicate(
    "pagination limit equals 10",
    pageResult.pagination.limit === 10,
  );
  TestValidator.predicate(
    "pagination records >= number of created admins",
    pageResult.pagination.records >= adminsCreated.length,
  );
  TestValidator.predicate(
    "pagination pages >= 1",
    pageResult.pagination.pages >= 1,
  );

  // 4. Search by substring of a created admin's username
  const substringUsername = adminsCreated[0].adminUsername.substring(1, 5);
  const searchByUsernameBody = {
    search: substringUsername,
    page: 1,
    limit: 10,
    sort_by: "created_at",
    order: "asc",
  } satisfies IEconPolDiscussionBoardAdmin.IRequest;
  const searchByUsernameResult =
    await api.functional.econPolDiscussionBoard.admin.econPolDiscussionBoardAdmins.index(
      connection,
      { body: searchByUsernameBody },
    );
  typia.assert(searchByUsernameResult);

  // Validate all usernames contain substring
  for (const item of searchByUsernameResult.data) {
    TestValidator.predicate(
      `username ${item.username} contains substring ${substringUsername}`,
      item.username.includes(substringUsername),
    );
  }

  // 5. Search by substring of another admin's email
  const substringEmail = adminsCreated[1].email.substring(1, 5);
  const searchByEmailBody = {
    search: substringEmail,
    page: 1,
    limit: 10,
    sort_by: "created_at",
    order: "asc",
  } satisfies IEconPolDiscussionBoardAdmin.IRequest;
  const searchByEmailResult =
    await api.functional.econPolDiscussionBoard.admin.econPolDiscussionBoardAdmins.index(
      connection,
      { body: searchByEmailBody },
    );
  typia.assert(searchByEmailResult);

  // Validate all emails contain substring
  for (const item of searchByEmailResult.data) {
    TestValidator.predicate(
      `email ${item.email} contains substring ${substringEmail}`,
      item.email.includes(substringEmail),
    );
  }

  // 6. Pagination test with limit 2
  const paginationLimit2Body = {
    page: 1,
    limit: 2,
    sort_by: "created_at",
    order: "asc",
  } satisfies IEconPolDiscussionBoardAdmin.IRequest;
  const paginationLimit2Result =
    await api.functional.econPolDiscussionBoard.admin.econPolDiscussionBoardAdmins.index(
      connection,
      { body: paginationLimit2Body },
    );
  typia.assert(paginationLimit2Result);

  TestValidator.equals(
    "pagination current is 1",
    paginationLimit2Result.pagination.current,
    1,
  );
  TestValidator.equals(
    "pagination limit is 2",
    paginationLimit2Result.pagination.limit,
    2,
  );
  TestValidator.predicate(
    "pagination records >= number of created admins",
    paginationLimit2Result.pagination.records >= adminsCreated.length,
  );
  TestValidator.predicate(
    "pagination pages >= 1",
    paginationLimit2Result.pagination.pages >= 1,
  );
  TestValidator.predicate(
    "data length <= limit 2",
    paginationLimit2Result.data.length <= 2,
  );
}
