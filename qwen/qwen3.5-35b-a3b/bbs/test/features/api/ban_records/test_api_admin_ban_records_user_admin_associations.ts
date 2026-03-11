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

export async function test_api_admin_ban_records_user_admin_associations(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create and authenticate admin
  const adminConnection: api.IConnection = { host: connection.host };
  const adminAuth = await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      displayName: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IEconomicPoliticalBoardAdmin.IJoin,
  });
  typia.assert(adminAuth);
  // 2. Retrieve ban records with admin connection (headers auto-updated by authorize_admin_join)
  const banRecordsPage =
    await api.functional.economicPoliticalBoard.admin.ban_records.index(
      adminConnection,
      {
        body: {} satisfies IEconomicPoliticalBoardBanRecord.IRequest,
      },
    );
  typia.assert(banRecordsPage);
  // 3. Validate pagination structure
  TestValidator.equals(
    "pagination current",
    banRecordsPage.pagination.current,
    1,
  );
  TestValidator.equals("pagination limit", banRecordsPage.pagination.limit, 20);
  TestValidator.predicate(
    "pagination records non-negative",
    banRecordsPage.pagination.records >= 0,
  );
  TestValidator.equals(
    "pagination pages",
    banRecordsPage.pagination.pages,
    Math.ceil(
      banRecordsPage.pagination.records / banRecordsPage.pagination.limit,
    ),
  );
  // 4. Validate ban record associations if records exist
  if (banRecordsPage.data.length > 0) {
    for (const banRecord of banRecordsPage.data) {
      typia.assert(banRecord);
      // 5. Verify user field is IEconomicPoliticalBoardAdministratorRole.ISummary
      typia.assert(banRecord.user);
      TestValidator.equals(
        "user id exists",
        banRecord.user.id !== undefined,
        true,
      );
      TestValidator.predicate(
        "user grade is valid",
        banRecord.user.grade === "regular" || banRecord.user.grade === "super",
      );
      TestValidator.equals(
        "user created_at exists",
        banRecord.user.created_at !== undefined,
        true,
      );
      TestValidator.equals(
        "user updated_at exists",
        banRecord.user.updated_at !== undefined,
        true,
      );
      // 6. Verify bannedByAdmin field is IEconomicPoliticalBoardAdministratorRole.ISummary
      typia.assert(banRecord.bannedByAdmin);
      TestValidator.equals(
        "bannedByAdmin id exists",
        banRecord.bannedByAdmin.id !== undefined,
        true,
      );
      TestValidator.predicate(
        "bannedByAdmin grade is valid",
        banRecord.bannedByAdmin.grade === "regular" ||
          banRecord.bannedByAdmin.grade === "super",
      );
      TestValidator.equals(
        "bannedByAdmin created_at exists",
        banRecord.bannedByAdmin.created_at !== undefined,
        true,
      );
      TestValidator.equals(
        "bannedByAdmin updated_at exists",
        banRecord.bannedByAdmin.updated_at !== undefined,
        true,
      );
      // 7. Verify ban record has reason and createdAt
      TestValidator.equals(
        "ban reason exists",
        banRecord.reason !== undefined,
        true,
      );
      TestValidator.equals(
        "ban createdAt exists",
        banRecord.createdAt !== undefined,
        true,
      );
    }
  }
  // 8. Test filtering by user ID if records exist
  if (banRecordsPage.data.length > 0) {
    const firstBanRecord = banRecordsPage.data[0];
    const filteredPage =
      await api.functional.economicPoliticalBoard.admin.ban_records.index(
        adminConnection,
        {
          body: {
            userId: firstBanRecord.user.id,
          } satisfies IEconomicPoliticalBoardBanRecord.IRequest,
        },
      );
    typia.assert(filteredPage);
    // All filtered records should have the same user
    for (const record of filteredPage.data) {
      TestValidator.equals(
        "filtered record user matches",
        record.user.id,
        firstBanRecord.user.id,
      );
    }
  }
  // 9. Test filtering by bannedByAdmin ID if records exist
  if (banRecordsPage.data.length > 0) {
    const firstBanRecord = banRecordsPage.data[0];
    const filteredByAdminPage =
      await api.functional.economicPoliticalBoard.admin.ban_records.index(
        adminConnection,
        {
          body: {
            bannedByAdminId: firstBanRecord.bannedByAdmin.id,
          } satisfies IEconomicPoliticalBoardBanRecord.IRequest,
        },
      );
    typia.assert(filteredByAdminPage);
    // All filtered records should have the same bannedByAdmin
    for (const record of filteredByAdminPage.data) {
      TestValidator.equals(
        "filtered by admin record matches",
        record.bannedByAdmin.id,
        firstBanRecord.bannedByAdmin.id,
      );
    }
  }
}
