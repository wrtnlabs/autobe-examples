import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEconomicPoliticalBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicPoliticalBoardAdmin";
import type { IEconomicPoliticalBoardAdministratorRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicPoliticalBoardAdministratorRole";
import type { IEconomicPoliticalBoardBanRecord } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicPoliticalBoardBanRecord";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEconomicPoliticalBoardBanRecord } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEconomicPoliticalBoardBanRecord";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";

export async function test_api_ban_records_list_admin_access(
  connection: api.IConnection,
): Promise<void> {
  // 1. Join as administrator to establish admin actor authentication
  const adminConnection: api.IConnection = { host: connection.host };
  const adminAuth = await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      displayName: RandomGenerator.name(),
      bio: RandomGenerator.paragraph({ sentences: 2 }),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IEconomicPoliticalBoardAdmin.IJoin,
  });
  typia.assert(adminAuth);
  // 2. Call PATCH /economicPoliticalBoard/admin/bans with default pagination
  const response = await api.functional.economicPoliticalBoard.admin.bans.index(
    adminConnection,
    {
      body: {} satisfies IEconomicPoliticalBoardBanRecord.IRequest,
    },
  );
  typia.assert(response);
  // 3. Validate pagination metadata
  TestValidator.equals("pagination current", response.pagination.current, 1);
  TestValidator.equals("pagination limit", response.pagination.limit, 20);
  TestValidator.predicate(
    "pagination records non-negative",
    response.pagination.records >= 0,
  );
  TestValidator.equals(
    "pagination pages",
    response.pagination.pages,
    response.pagination.records === 0
      ? 0
      : Math.ceil(response.pagination.records / response.pagination.limit),
  );
  // 4. Validate ban records data array
  for (const banRecord of response.data) {
    typia.assert(banRecord);
    // Verify id field exists and is valid UUID
    typia.assert(banRecord.id);
    // Validate user field exists and has required fields
    TestValidator.equals(
      "ban record has user",
      banRecord.user.id !== undefined,
      true,
    );
    typia.assert(banRecord.user);
    // Validate bannedByAdmin field exists and has required fields
    TestValidator.equals(
      "ban record has bannedByAdmin",
      banRecord.bannedByAdmin.id !== undefined,
      true,
    );
    typia.assert(banRecord.bannedByAdmin);
    // Validate reason field is string
    TestValidator.equals(
      "ban record reason is string",
      typeof banRecord.reason,
      "string",
    );
    // Validate createdAt field is valid date-time string
    TestValidator.equals(
      "ban record createdAt is string",
      typeof banRecord.createdAt,
      "string",
    );
  }
}