import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEconomicPoliticalBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicPoliticalBoardAdmin";
import type { IEconomicPoliticalBoardAdministratorRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicPoliticalBoardAdministratorRole";
import type { IEconomicPoliticalBoardBanRecord } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicPoliticalBoardBanRecord";
import type { IEconomicPoliticalBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicPoliticalBoardMember";
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

export async function test_api_ban_records_list_by_admin(
  connection: api.IConnection,
): Promise<void> {
  // 1. Admin authentication
  const adminConnection: api.IConnection = { host: connection.host };
  const adminAuth = await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email"> & tags.MinLength<1> & tags.MaxLength<255>>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  typia.assert(adminAuth);
  // 2. Create new admin connection with token
  const adminBearerConnection: api.IConnection = {
    host: connection.host,
    headers: {
      ...connection.headers,
      Authorization: adminAuth.token.access,
    },
  };
  // 3. Request ban records list with pagination
  const response =
    await api.functional.economicPoliticalBoard.admin.ban_records.index(
      adminBearerConnection,
      {
        body: typia.random<IEconomicPoliticalBoardBanRecord.IRequest>(),
      },
    );
  typia.assert(response);
  // 4. Validate pagination metadata exists
  TestValidator.equals(
    "pagination current field exists",
    response.pagination.current >= 0,
    true,
  );
  TestValidator.equals(
    "pagination limit field exists",
    response.pagination.limit > 0,
    true,
  );
  TestValidator.equals(
    "pagination records field exists",
    response.pagination.records >= 0,
    true,
  );
  TestValidator.equals(
    "pagination pages field exists",
    response.pagination.pages >= 0,
    true,
  );
  // 5. Validate pagination calculations
  const expectedPages =
    response.pagination.records > 0
      ? Math.ceil(response.pagination.records / response.pagination.limit)
      : 0;
  TestValidator.equals(
    "pagination pages calculation correct",
    response.pagination.pages,
    expectedPages,
  );
  // 6. Validate data array exists and is array type
  TestValidator.equals(
    "response data is array",
    Array.isArray(response.data),
    true,
  );
  // 7. Handle empty state - verify data is empty array but pagination still exists
  if (response.data.length === 0) {
    TestValidator.equals(
      "empty state - pagination metadata still present",
      response.pagination.records,
      0,
    );
    TestValidator.equals(
      "empty state - pages equals 0",
      response.pagination.pages,
      0,
    );
  }
  // 8. Validate each ban record structure (if any records exist)
  if (response.data.length > 0) {
    for (const banRecord of response.data) {
      // Verify ban record has required ID fields
      TestValidator.equals(
        "ban record has id",
        banRecord.id !== undefined,
        true,
      );
      TestValidator.equals(
        "ban record has user_id",
        banRecord.user_id !== undefined,
        true,
      );
      TestValidator.equals(
        "ban record has banned_by_admin_id",
        banRecord.banned_by_admin_id !== undefined,
        true,
      );
      TestValidator.equals(
        "ban record has reason",
        typeof banRecord.reason === "string",
        true,
      );
      TestValidator.equals(
        "ban record has created_at",
        typeof banRecord.created_at === "string",
        true,
      );
      // Verify user field exists (ISummary has limited properties)
      TestValidator.equals(
        "user field exists",
        banRecord.user !== undefined,
        true,
      );
      TestValidator.equals(
        "user has id",
        banRecord.user.id !== undefined,
        true,
      );
      // Verify bannedByAdmin field exists (ISummary has limited properties)
      TestValidator.equals(
        "bannedByAdmin field exists",
        banRecord.bannedByAdmin !== undefined,
        true,
      );
      TestValidator.equals(
        "bannedByAdmin has id",
        banRecord.bannedByAdmin.id !== undefined,
        true,
      );
    }
  }
  // 9. Verify pagination.total equals actual data length
  TestValidator.equals(
    "pagination records equals data array length",
    response.pagination.records,
    response.data.length,
  );
}