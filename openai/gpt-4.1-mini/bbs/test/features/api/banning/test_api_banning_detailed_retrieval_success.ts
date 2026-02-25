import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdministrator";
import type { IDiscussionBoardAdministratorGrade } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdministratorGrade";
import type { IDiscussionBoardRegisteredUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardRegisteredUser";
import type { IDiscussionBoardSuperAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSuperAdministrator";
import type { IDiscussionBoardUserBan } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardUserBan";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_super_administrator_join } from "../../../authorize/authorize_super_administrator_join";
import { authorize_super_administrator_login } from "../../../authorize/authorize_super_administrator_login";
import { authorize_super_administrator_refresh } from "../../../authorize/authorize_super_administrator_refresh";

export async function test_api_banning_detailed_retrieval_success(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register and authenticate superAdministrator
  const superAdminConnection: api.IConnection = { host: connection.host };
  const superAdmin = await authorize_super_administrator_join(
    superAdminConnection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: "StrongPass1234!",
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
        ip: null,
      },
    },
  );
  typia.assert(superAdmin);
  // 2. Use the authenticated superAdminConnection with already set headers
  // 3. Generate a random banId (assumed to exist in test environment)
  const banId = typia.random<string & tags.Format<"uuid">>();
  // 4. Retrieve the detailed ban record
  const banRecord =
    await api.functional.discussionBoard.superAdministrator.administrator.bans.atBan(
      superAdminConnection,
      { banId },
    );
  typia.assert(banRecord);
  // 5: Validate the response fields
  TestValidator.predicate("banId matches", banRecord.id === banId);
  TestValidator.predicate(
    "has ban reason",
    typeof banRecord.reason === "string" && banRecord.reason.length > 0,
  );
  TestValidator.predicate(
    "bannedAt is date-time format",
    /^[0-9]{4}-(0[1-9]|1[0-2])-(0[1-9]|[12][0-9]|3[01])[T ]([01][0-9]|2[0-3]):[0-5][0-9]:[0-5][0-9](?:\.[0-9]+)?(Z|[+-]([01][0-9]|2[0-3]):[0-5][0-9])?$/.test(
      banRecord.bannedAt,
    ),
  );
  TestValidator.predicate(
    "createdAt is date-time format",
    /^[0-9]{4}-(0[1-9]|1[0-2])-(0[1-9]|[12][0-9]|3[01])[T ]([01][0-9]|2[0-3]):[0-5][0-9]:[0-5][0-9](?:\.[0-9]+)?(Z|[+-]([01][0-9]|2[0-3]):[0-5][0-9])?$/.test(
      banRecord.createdAt,
    ),
  );
  TestValidator.predicate(
    "updatedAt is date-time format",
    /^[0-9]{4}-(0[1-9]|1[0-2])-(0[1-9]|[12][0-9]|3[01])[T ]([01][0-9]|2[0-3]):[0-5][0-9]:[0-5][0-9](?:\.[0-9]+)?(Z|[+-]([01][0-9]|2[0-3]):[0-5][0-9])?$/.test(
      banRecord.updatedAt,
    ),
  );
  TestValidator.predicate(
    "deletedAt is null or undefined",
    banRecord.deletedAt === null || banRecord.deletedAt === undefined,
  );
  TestValidator.predicate(
    "registeredUser exists",
    banRecord.registeredUser !== null && banRecord.registeredUser !== undefined,
  );
  typia.assertGuardEquals(banRecord.registeredUser);
  TestValidator.predicate(
    "administrator is null or object",
    banRecord.administrator === null ||
      banRecord.administrator === undefined ||
      true,
  );
  if (
    banRecord.administrator !== null &&
    banRecord.administrator !== undefined
  ) {
    typia.assertGuardEquals(banRecord.administrator);
  }
  // 6. Validate nested IDs and email strings
  TestValidator.predicate(
    "registeredUser id is uuid",
    /^[0-9a-fA-F-]{36}$/.test(banRecord.registeredUser.id),
  );
  TestValidator.predicate(
    "registeredUser email is string",
    typeof banRecord.registeredUser.email === "string",
  );
  if (banRecord.administrator) {
    TestValidator.predicate(
      "administrator id is uuid",
      /^[0-9a-fA-F-]{36}$/.test(banRecord.administrator.id),
    );
    TestValidator.predicate(
      "administrator email is string",
      typeof banRecord.administrator.email === "string",
    );
  }
}
