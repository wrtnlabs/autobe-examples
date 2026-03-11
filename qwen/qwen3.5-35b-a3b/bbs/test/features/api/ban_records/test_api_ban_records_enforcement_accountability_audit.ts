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

export async function test_api_ban_records_enforcement_accountability_audit(
  connection: api.IConnection,
): Promise<void> {
  // 1. Join as a new administrator
  const adminConnection: api.IConnection = { host: connection.host };
  const adminJoin = await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      displayName: RandomGenerator.name(),
      bio: RandomGenerator.paragraph({ sentences: 2 }),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IEconomicPoliticalBoardAdmin.IJoin,
  });
  typia.assert(adminJoin);
  // Create admin connection with token
  const adminAuthConnection: api.IConnection = {
    host: connection.host,
    headers: { Authorization: `Bearer ${adminJoin.token.access}` },
  };
  // 2. Retrieve ban records (may be empty initially)
  const banResponse =
    await api.functional.economicPoliticalBoard.admin.bans.index(
      adminAuthConnection,
      {
        body: {} satisfies IEconomicPoliticalBoardBanRecord.IRequest,
      },
    );
  typia.assert(banResponse);
  // 3. Verify pagination metadata exists
  TestValidator.equals(
    "pagination metadata present",
    banResponse.pagination.current,
    banResponse.pagination.current,
  );
  TestValidator.equals(
    "pagination limit present",
    banResponse.pagination.limit,
    banResponse.pagination.limit,
  );
  TestValidator.equals(
    "pagination records present",
    banResponse.pagination.records,
    banResponse.pagination.records,
  );
  TestValidator.equals(
    "pagination pages present",
    banResponse.pagination.pages,
    banResponse.pagination.pages,
  );
  TestValidator.predicate(
    "pagination current is number",
    typeof banResponse.pagination.current === "number",
  );
  TestValidator.predicate(
    "pagination limit is number",
    typeof banResponse.pagination.limit === "number",
  );
  TestValidator.predicate(
    "pagination records is number",
    typeof banResponse.pagination.records === "number",
  );
  TestValidator.predicate(
    "pagination pages is number",
    typeof banResponse.pagination.pages === "number",
  );
  // 4. If ban records exist, verify structure
  if (banResponse.data.length > 0) {
    const firstBan = banResponse.data[0];
    // Verify ban record has id
    TestValidator.predicate(
      "ban record has id",
      typeof firstBan.id === "string",
    );
    // Verify user object structure
    TestValidator.predicate(
      "ban record has user object",
      typeof firstBan.user === "object",
    );
    if (firstBan.user !== null && firstBan.user !== undefined) {
      TestValidator.equals("user has id", firstBan.user.id, firstBan.user.id);
      TestValidator.equals(
        "user has grade",
        firstBan.user.grade,
        firstBan.user.grade,
      );
      TestValidator.equals(
        "user has created_at",
        firstBan.user.created_at,
        firstBan.user.created_at,
      );
      TestValidator.equals(
        "user has updated_at",
        firstBan.user.updated_at,
        firstBan.user.updated_at,
      );
    }
    // Verify bannedByAdmin object structure
    TestValidator.predicate(
      "ban record has bannedByAdmin object",
      typeof firstBan.bannedByAdmin === "object",
    );
    if (
      firstBan.bannedByAdmin !== null &&
      firstBan.bannedByAdmin !== undefined
    ) {
      TestValidator.equals(
        "bannedByAdmin has id",
        firstBan.bannedByAdmin.id,
        firstBan.bannedByAdmin.id,
      );
      TestValidator.equals(
        "bannedByAdmin has grade",
        firstBan.bannedByAdmin.grade,
        firstBan.bannedByAdmin.grade,
      );
      TestValidator.equals(
        "bannedByAdmin has created_at",
        firstBan.bannedByAdmin.created_at,
        firstBan.bannedByAdmin.created_at,
      );
      TestValidator.equals(
        "bannedByAdmin has updated_at",
        firstBan.bannedByAdmin.updated_at,
        firstBan.bannedByAdmin.updated_at,
      );
    }
    // Verify reason field
    TestValidator.equals(
      "ban record has reason",
      firstBan.reason,
      firstBan.reason,
    );
    TestValidator.predicate(
      "ban reason is string",
      typeof firstBan.reason === "string",
    );
    // Verify createdAt field
    TestValidator.equals(
      "ban record has createdAt",
      firstBan.createdAt,
      firstBan.createdAt,
    );
    TestValidator.predicate(
      "ban createdAt is string",
      typeof firstBan.createdAt === "string",
    );
    // 5. Verify accountability: bannedByAdmin must exist (not null)
    TestValidator.predicate(
      "bannedByAdmin exists for accountability",
      firstBan.bannedByAdmin !== null && firstBan.bannedByAdmin !== undefined,
    );
    // 6. Test filtering by reason keyword
    const filteredResponse =
      await api.functional.economicPoliticalBoard.admin.bans.index(
        adminAuthConnection,
        {
          body: {
            reasonKeyword: firstBan.reason.substring(0, 5),
          } satisfies IEconomicPoliticalBoardBanRecord.IRequest,
        },
      );
    typia.assert(filteredResponse);
    // Verify filtered results match the reason
    if (filteredResponse.data.length > 0) {
      const filteredBan = filteredResponse.data[0];
      TestValidator.predicate(
        "filter by reason keyword works",
        filteredBan.reason.includes(firstBan.reason.substring(0, 5)),
      );
    }
    // 7. Test filtering by user ID
    const userFilteredResponse =
      await api.functional.economicPoliticalBoard.admin.bans.index(
        adminAuthConnection,
        {
          body: {
            userId: firstBan.user.id,
          } satisfies IEconomicPoliticalBoardBanRecord.IRequest,
        },
      );
    typia.assert(userFilteredResponse);
    // All filtered records should have the same user
    for (const banRecord of userFilteredResponse.data) {
      TestValidator.equals(
        "user ID filter returns matching records",
        banRecord.user.id,
        firstBan.user.id,
      );
    }
    // 8. Test sorting by newest first (default)
    const newestFirstResponse =
      await api.functional.economicPoliticalBoard.admin.bans.index(
        adminAuthConnection,
        {
          body: {
            sortBy: "newest",
          } satisfies IEconomicPoliticalBoardBanRecord.IRequest,
        },
      );
    typia.assert(newestFirstResponse);
    // 9. Test sorting by oldest
    const oldestFirstResponse =
      await api.functional.economicPoliticalBoard.admin.bans.index(
        adminAuthConnection,
        {
          body: {
            sortBy: "oldest",
          } satisfies IEconomicPoliticalBoardBanRecord.IRequest,
        },
      );
    typia.assert(oldestFirstResponse);
    // Verify pagination with limit
    const limitedResponse =
      await api.functional.economicPoliticalBoard.admin.bans.index(
        adminAuthConnection,
        {
          body: {
            limit: 10,
          } satisfies IEconomicPoliticalBoardBanRecord.IRequest,
        },
      );
    typia.assert(limitedResponse);
    TestValidator.equals(
      "limit parameter respects pagination",
      limitedResponse.pagination.limit,
      10,
    );
  }
}
