import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdministrator";
import type { IEcommerceMallUserBan } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallUserBan";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEcommerceMallUserBan } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceMallUserBan";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_administrator_join } from "../../../authorize/authorize_administrator_join";
import { authorize_administrator_login } from "../../../authorize/authorize_administrator_login";
import { authorize_administrator_refresh } from "../../../authorize/authorize_administrator_refresh";

export async function test_api_administrator_bans_list_all(
  connection: api.IConnection,
): Promise<void> {
  // 1. Administrator setup - register admin account
  const adminConnection: api.IConnection = { host: connection.host };
  const admin = await api.functional.ecommerceMall.auth.administrator.join(
    adminConnection,
    {
      body: {
        display_name: RandomGenerator.name(3),
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(12),
        grade: "regular" as const,
      } satisfies IEcommerceMallAdministrator.IJoin,
    },
  );
  typia.assert(admin);
  // 2. List all bans with default pagination
  const banList: IPageIEcommerceMallUserBan.ISummary =
    await api.functional.ecommerceMall.administrator.bans.index(
      adminConnection,
      {
        body: {
          page: 1,
          limit: 20,
        } satisfies IEcommerceMallUserBan.IRequest,
      },
    );
  typia.assert(banList);
  // 3. Validate pagination structure
  TestValidator.predicate(
    "pagination exists",
    banList.pagination !== undefined,
  );
  TestValidator.equals("current page", banList.pagination.current, 1);
  TestValidator.equals("limit", banList.pagination.limit, 20);
  TestValidator.predicate(
    "records non-negative",
    banList.pagination.records >= 0,
  );
  TestValidator.equals(
    "pages calculated correctly",
    banList.pagination.pages,
    banList.pagination.records === 0
      ? 0
      : Math.ceil(banList.pagination.records / 20),
  );
  // 4. Validate ban record structure if any exist
  if (banList.data.length > 0) {
    const firstBan = banList.data[0];
    typia.assert(firstBan);
    // Validate user_type is one of valid values
    TestValidator.predicate(
      "user_type is customer or seller",
      firstBan.user_type === "customer" || firstBan.user_type === "seller",
    );
    TestValidator.predicate("reason is non-empty", firstBan.reason.length > 0);
    TestValidator.predicate(
      "ban_status is active or completed",
      firstBan.ban_status === "active" || firstBan.ban_status === "completed",
    );
    // Validate administrator reference
    TestValidator.predicate(
      "administrator display_name is non-empty",
      firstBan.administrator.displayName.length > 0,
    );
    TestValidator.predicate(
      "administrator email is non-empty",
      firstBan.administrator.email.length > 0,
    );
  }
  // 5. Test pagination with different parameters
  const secondPage: IPageIEcommerceMallUserBan.ISummary =
    await api.functional.ecommerceMall.administrator.bans.index(
      adminConnection,
      {
        body: {
          page: 2,
          limit: 10,
        } satisfies IEcommerceMallUserBan.IRequest,
      },
    );
  typia.assert(secondPage);
  TestValidator.equals("second page current", secondPage.pagination.current, 2);
  TestValidator.equals("second page limit", secondPage.pagination.limit, 10);
  // 6. Test filtering by user_type
  const customerBans: IPageIEcommerceMallUserBan.ISummary =
    await api.functional.ecommerceMall.administrator.bans.index(
      adminConnection,
      {
        body: {
          user_type: "customer",
          page: 1,
          limit: 20,
        } satisfies IEcommerceMallUserBan.IRequest,
      },
    );
  typia.assert(customerBans);
  // 7. Test filtering by ban_status
  const activeBans: IPageIEcommerceMallUserBan.ISummary =
    await api.functional.ecommerceMall.administrator.bans.index(
      adminConnection,
      {
        body: {
          ban_status: "active",
          page: 1,
          limit: 20,
        } satisfies IEcommerceMallUserBan.IRequest,
      },
    );
  typia.assert(activeBans);
}
