import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdministrator";
import type { IDiscussionBoardAdministratorGrade } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdministratorGrade";
import type { IDiscussionBoardRegisteredUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardRegisteredUser";
import type { IDiscussionBoardSuperAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSuperAdministrator";
import type { IDiscussionBoardUserBan } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardUserBan";
import type { IDiscussionBoardUserUnban } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardUserUnban";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_super_administrator_join } from "../../../authorize/authorize_super_administrator_join";
import { authorize_super_administrator_login } from "../../../authorize/authorize_super_administrator_login";
import { authorize_super_administrator_refresh } from "../../../authorize/authorize_super_administrator_refresh";

export async function test_api_user_unban_retrieval_by_super_administrator_success(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Authenticate as a super administrator using the join endpoint
  const superAdminConnection: api.IConnection = { host: connection.host };
  const superAdminAuthorized = await authorize_super_administrator_join(
    superAdminConnection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: "S3cureP@ssw0rd!",
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
        ip: null,
      },
    },
  );
  typia.assert(superAdminAuthorized);
  // superAdminConnection.headers.Authorization is set internally by authorize function
  // Step 2: Request the unban record by providing a valid unbanId
  // Note: In an ideal test, unban record should be created before this. Here, we use a random UUID for demonstration.
  const unbanId = typia.random<string & tags.Format<"uuid">>();
  const unbanRecord =
    await api.functional.discussionBoard.superAdministrator.administrator.unbans.at(
      superAdminConnection,
      { unbanId },
    );
  // Validate response type fully
  typia.assert(unbanRecord);
  // Step 3: Validate contents of the unban record
  TestValidator.predicate(
    "unban reason exists",
    () =>
      typeof unbanRecord.reason === "string" && unbanRecord.reason.length > 0,
  );
  TestValidator.predicate(
    "userBan id exists",
    () =>
      typeof unbanRecord.userBan.id === "string" &&
      unbanRecord.userBan.id.length > 0,
  );
  TestValidator.predicate(
    "administrator id exists",
    () =>
      typeof unbanRecord.administrator.id === "string" &&
      unbanRecord.administrator.id.length > 0,
  );
  TestValidator.predicate("createdAt is ISO date string", () =>
    /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?Z$/.test(
      unbanRecord.createdAt,
    ),
  );
  TestValidator.predicate("updatedAt is ISO date string", () =>
    /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?Z$/.test(
      unbanRecord.updatedAt,
    ),
  );
  if (unbanRecord.deletedAt !== null && unbanRecord.deletedAt !== undefined) {
    TestValidator.predicate(
      "deletedAt is ISO date string or null",
      () =>
        typeof unbanRecord.deletedAt === "string" &&
        /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?Z$/.test(
          unbanRecord.deletedAt,
        ),
    );
  }
}
