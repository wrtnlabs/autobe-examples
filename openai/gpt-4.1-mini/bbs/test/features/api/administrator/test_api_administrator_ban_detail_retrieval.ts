import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdministrator";
import type { IDiscussionBoardAdministratorGrade } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdministratorGrade";
import type { IDiscussionBoardRegisteredUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardRegisteredUser";
import type { IDiscussionBoardUserBan } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardUserBan";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_administrator_join } from "../../../authorize/authorize_administrator_join";
import { authorize_administrator_login } from "../../../authorize/authorize_administrator_login";
import { authorize_administrator_refresh } from "../../../authorize/authorize_administrator_refresh";

export async function test_api_administrator_ban_detail_retrieval(
  connection: api.IConnection,
): Promise<void> {
  // Scenario: Test ban record retrieval by valid and invalid ban ID.
  // 1. Administrator join and authorization
  const adminAuthorized1 = await authorize_administrator_join(
    { host: connection.host },
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: "strongPassword123!",
      },
    },
  );
  typia.assert(adminAuthorized1);
  const adminConnection1: api.IConnection = { host: connection.host };
  adminConnection1.headers = {
    Authorization: `Bearer ${adminAuthorized1.token.access}`,
  };
  // ----- Scenario 1: Successful retrieval -----
  // Since there's no banning API utility or SDK, simulate ban record creation data
  const banRecord: IDiscussionBoardUserBan = {
    id: typia.random<string & tags.Format<"uuid">>(),
    reason: RandomGenerator.paragraph({ sentences: 1 }),
    bannedAt: new Date().toISOString(),
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    deletedAt: null,
    registeredUserId: typia.random<string & tags.Format<"uuid">>(),
    administratorId: adminAuthorized1.id,
    registeredUser: {
      id: typia.random<string & tags.Format<"uuid">>(),
      email: typia.random<string & tags.Format<"email">>(),
      displayName: RandomGenerator.name(),
      bio: RandomGenerator.paragraph({ sentences: 1 }),
      isBanned: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      deletedAt: null,
    },
    administrator: {
      id: adminAuthorized1.id,
      email: adminAuthorized1.email,
      grade: typia.assert(
        adminAuthorized1.grade!,
      ) as IDiscussionBoardAdministrator.ISummary["grade"],
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      deleted_at: null,
    },
  };
  const fetchedBan =
    await api.functional.discussionBoard.administrator.administrator.bans.atBan(
      adminConnection1,
      { banId: banRecord.id },
    );
  typia.assert(fetchedBan);
  // Validate fetched ban record matches expected fields
  TestValidator.equals("ban ID matches", fetchedBan.id, banRecord.id);
  TestValidator.predicate("ban reason not empty", fetchedBan.reason.length > 0);
  TestValidator.predicate(
    "bannedAt is valid ISO datetime",
    Boolean(Date.parse(fetchedBan.bannedAt)),
  );
  TestValidator.predicate(
    "createdAt is valid ISO datetime",
    Boolean(Date.parse(fetchedBan.createdAt)),
  );
  TestValidator.predicate(
    "updatedAt is valid ISO datetime",
    Boolean(Date.parse(fetchedBan.updatedAt)),
  );
  TestValidator.equals(
    "registeredUserId matches",
    fetchedBan.registeredUserId,
    banRecord.registeredUserId,
  );
  TestValidator.equals(
    "registeredUser ID matches",
    fetchedBan.registeredUser.id,
    banRecord.registeredUser.id,
  );
  TestValidator.equals(
    "registeredUser email matches",
    fetchedBan.registeredUser.email,
    banRecord.registeredUser.email,
  );
  TestValidator.predicate(
    "registeredUser displayName not empty",
    fetchedBan.registeredUser.displayName.length > 0,
  );
  if (
    fetchedBan.registeredUser.bio !== null &&
    fetchedBan.registeredUser.bio !== undefined
  ) {
    TestValidator.predicate(
      "registeredUser bio not empty",
      fetchedBan.registeredUser.bio.length > 0,
    );
  }
  TestValidator.predicate(
    "registeredUser isBanned is true",
    fetchedBan.registeredUser.isBanned === true,
  );
  TestValidator.predicate(
    "registeredUser createdAt is valid ISO datetime",
    Boolean(Date.parse(fetchedBan.registeredUser.createdAt)),
  );
  TestValidator.predicate(
    "registeredUser updatedAt is valid ISO datetime",
    Boolean(Date.parse(fetchedBan.registeredUser.updatedAt)),
  );
  TestValidator.equals(
    "registeredUser deletedAt is null",
    fetchedBan.registeredUser.deletedAt,
    null,
  );
  if (
    fetchedBan.administrator !== null &&
    fetchedBan.administrator !== undefined
  ) {
    TestValidator.equals(
      "administrator ID matches",
      fetchedBan.administrator.id,
      banRecord.administrator?.id ?? "",
    );
    TestValidator.equals(
      "administrator email matches",
      fetchedBan.administrator.email,
      banRecord.administrator?.email ?? "",
    );
    TestValidator.equals(
      "administrator deleted_at is null",
      fetchedBan.administrator.deleted_at,
      null,
    );
  }
  // ----- Scenario 2: Retrieval with non-existent ban ID -----
  const adminAuthorized2 = await authorize_administrator_join(
    { host: connection.host },
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: "anotherStrongPassword!",
      },
    },
  );
  typia.assert(adminAuthorized2);
  const adminConnection2: api.IConnection = { host: connection.host };
  adminConnection2.headers = {
    Authorization: `Bearer ${adminAuthorized2.token.access}`,
  };
  const nonExistentBanId = typia.random<string & tags.Format<"uuid">>();
  await TestValidator.httpError(
    "non-existent ban ID retrieval returns 404",
    404,
    async () => {
      await api.functional.discussionBoard.administrator.administrator.bans.atBan(
        adminConnection2,
        { banId: nonExistentBanId },
      );
    },
  );
}
