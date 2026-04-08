import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdministrator";
import type { IEcommerceMallMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallMember";
import type { IEcommerceMallUserBan } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallUserBan";
import type { IEcommerceMallUserBanOfCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallUserBanOfCustomer";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEcommerceMallUserBanOfCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceMallUserBanOfCustomer";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_administrator_join } from "../../../authorize/authorize_administrator_join";
import { authorize_administrator_login } from "../../../authorize/authorize_administrator_login";
import { authorize_administrator_refresh } from "../../../authorize/authorize_administrator_refresh";

export async function test_api_administrator_customer_ban_list(
  connection: api.IConnection,
): Promise<void> {
  // 1. Administrator joins the system
  const adminConnection: api.IConnection = { host: connection.host };
  const admin = await authorize_administrator_join(adminConnection, {
    body: {
      display_name: RandomGenerator.name(),
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
    } satisfies IEcommerceMallAdministrator.IJoin,
  });
  typia.assert(admin);
  // 2. Administrator queries ban list with default parameters
  const banList =
    await api.functional.ecommerceMall.administrator.user_ban_of_customers.index(
      adminConnection,
      {
        body: {
          ban_status: "active",
          page: 1,
          limit: 10,
        } satisfies IEcommerceMallUserBanOfCustomer.IRequest,
      },
    );
  typia.assert(banList);
  // 3. Validate pagination metadata structure
  TestValidator.predicate(
    "pagination has valid structure",
    banList.pagination.records >= 0,
  );
  TestValidator.equals("pagination limit", banList.pagination.limit, 10);
  TestValidator.equals(
    "pagination current page",
    banList.pagination.current,
    1,
  );
  TestValidator.predicate(
    "pagination pages is non-negative",
    banList.pagination.pages >= 0,
  );
  // 4. Validate each ban record structure
  for (const banRecord of banList.data) {
    typia.assert(banRecord);
    // Validate customer reference
    typia.assert(banRecord.customer);
    TestValidator.predicate(
      "customer has email",
      banRecord.customer.email !== undefined,
    );
    // Validate display_name can be null or non-empty string
    if (banRecord.customer.display_name !== null) {
      TestValidator.predicate(
        "customer display_name is non-empty string",
        banRecord.customer.display_name.length > 0,
      );
    }
    // Validate ban reference
    typia.assert(banRecord.ban);
    TestValidator.equals(
      "ban has customer type",
      banRecord.ban.user_type,
      "customer",
    );
    TestValidator.predicate("ban has reason", banRecord.ban.reason.length > 0);
    TestValidator.predicate(
      "ban has banned_at timestamp",
      banRecord.ban.banned_at.length > 0,
    );
    TestValidator.equals(
      "ban has active status",
      banRecord.ban.ban_status,
      "active",
    );
    // Validate administrator reference
    typia.assert(banRecord.ban.administrator);
    TestValidator.predicate(
      "administrator has id",
      banRecord.ban.administrator.id.length > 0,
    );
    TestValidator.predicate(
      "administrator has display name",
      banRecord.ban.administrator.displayName.length > 0,
    );
    // Validate timestamps
    TestValidator.predicate(
      "ban record has created_at",
      banRecord.created_at.length > 0,
    );
    TestValidator.predicate(
      "ban record has updated_at",
      banRecord.updated_at.length > 0,
    );
    TestValidator.equals(
      "active ban has null deleted_at",
      banRecord.deleted_at,
      null,
    );
  }
}
