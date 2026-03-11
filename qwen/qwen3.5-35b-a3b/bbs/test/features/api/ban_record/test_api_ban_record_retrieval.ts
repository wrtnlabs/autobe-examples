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

export async function test_api_ban_record_retrieval(
  connection: api.IConnection,
): Promise<void> {
  // 1. Admin authentication
  const adminConnection: api.IConnection = { host: connection.host };
  const adminResult = await authorize_admin_join(adminConnection, {
    body: typia.random<IEconomicPoliticalBoardAdmin.IJoin>(),
  });
  typia.assert(adminResult);
  // 2. List existing ban records to get a valid banId
  const banList = await api.functional.economicPoliticalBoard.admin.bans.index(
    adminConnection,
    {
      body: typia.random<IEconomicPoliticalBoardBanRecord.IRequest>(),
    },
  );
  typia.assert(banList);
  // 3. Create a ban record if none exist (for test purposes)
  let banId: string;
  if (banList.data.length === 0) {
    // Generate a test ban record structure
    const testBan: IEconomicPoliticalBoardBanRecord =
      typia.random<IEconomicPoliticalBoardBanRecord>();
    banId = testBan.id;
    // In real scenario, we would create a ban, but endpoint not available
    // For this test, we'll verify retrieval with generated UUID
  } else {
    banId = banList.data[0].id;
  }
  // 4. Retrieve the ban record by ID
  const banRecord =
    await api.functional.economicPoliticalBoard.admin.ban_records.at(
      adminConnection,
      {
        banId,
      },
    );
  typia.assert(banRecord);
  // 5. Validate response structure
  TestValidator.equals("ban record ID matches request", banId, banRecord.id);
  TestValidator.predicate(
    "has banned user info",
    banRecord.user !== null && banRecord.user !== undefined,
  );
  TestValidator.predicate(
    "banned user has ID",
    banRecord.user.id !== undefined,
  );
  TestValidator.predicate(
    "banned user has grade",
    banRecord.user.grade === "regular" || banRecord.user.grade === "super",
  );
  TestValidator.predicate(
    "has banning admin info",
    banRecord.bannedByAdmin !== null && banRecord.bannedByAdmin !== undefined,
  );
  TestValidator.predicate(
    "banning admin has ID",
    banRecord.bannedByAdmin.id !== undefined,
  );
  TestValidator.predicate(
    "banning admin has grade",
    banRecord.bannedByAdmin.grade === "regular" ||
      banRecord.bannedByAdmin.grade === "super",
  );
  TestValidator.predicate(
    "ban reason exists",
    banRecord.reason.length > 0,
  );
  TestValidator.predicate(
    "has creation timestamp",
    banRecord.created_at !== null && banRecord.created_at !== undefined,
  );
  // 6. Verify data consistency
  TestValidator.predicate(
    "reason is valid string",
    typeof banRecord.reason === "string" && banRecord.reason.length >= 1,
  );
  // 7. Test access control - retrieve ban by different admin
  const secondAdminConnection: api.IConnection = { host: connection.host };
  const secondAdminResult = await authorize_admin_join(secondAdminConnection, {
    body: typia.random<IEconomicPoliticalBoardAdmin.IJoin>(),
  });
  typia.assert(secondAdminResult);
  const banRecordByOtherAdmin =
    await api.functional.economicPoliticalBoard.admin.ban_records.at(
      secondAdminConnection,
      {
        banId,
      },
    );
  typia.assert(banRecordByOtherAdmin);
  TestValidator.equals(
    "other admin can retrieve ban record",
    banRecord.id,
    banRecordByOtherAdmin.id,
  );
}