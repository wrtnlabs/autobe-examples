import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallAdmin";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallAdminOfCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdminOfCustomer";
import type { IShoppingMallAdminOfSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdminOfSeller";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";

export async function test_api_admin_list_email_filter_and_actor_type(
  connection: api.IConnection,
): Promise<void> {
  // 1. Setup: Register a new admin with a known unique email substring
  const uniqueTag = RandomGenerator.alphaNumeric(12);
  const adminEmail =
    `test_admin_${uniqueTag}@filtertest.example.com` as string &
      tags.Format<"email">;
  const adminPassword = "TestPass123!" as string & tags.Format<"password">;
  const adminConnection: api.IConnection = { host: connection.host };
  const authorized = await authorize_admin_join(adminConnection, {
    body: {
      email: adminEmail,
      password: adminPassword,
    },
  });
  typia.assert(authorized);
  // uniqueTag is a unique substring guaranteed to match only our admin's email
  const partialEmail = uniqueTag;
  // 2. Partial email filter: verify created admin appears and all results contain substring
  const filteredByEmail = await api.functional.shoppingMall.admin.admins.index(
    adminConnection,
    {
      body: {
        email: partialEmail,
      } satisfies IShoppingMallAdmin.IRequest,
    },
  );
  typia.assert(filteredByEmail);
  // Verify the newly created admin appears in result
  TestValidator.predicate(
    "created admin appears in email-filtered results",
    filteredByEmail.data.some((admin) => admin.id === authorized.id),
  );
  // Verify every record's email contains the search substring (case-insensitive)
  for (const admin of filteredByEmail.data) {
    TestValidator.predicate(
      "every result email contains search substring",
      admin.email.toLowerCase().includes(partialEmail.toLowerCase()),
    );
  }
  // 3. Non-existent email filter: expect empty results
  const noMatchFilter = await api.functional.shoppingMall.admin.admins.index(
    adminConnection,
    {
      body: {
        email: "nonexistent_xyz_12345@impossible.domain",
      } satisfies IShoppingMallAdmin.IRequest,
    },
  );
  typia.assert(noMatchFilter);
  TestValidator.equals(
    "non-existent email filter returns empty data",
    noMatchFilter.data.length,
    0,
  );
  TestValidator.equals(
    "non-existent email filter returns records count 0",
    noMatchFilter.pagination.records,
    0,
  );
  // 4. actorType 'customer' filter - all returned records must have actor_type 'customer'
  const filteredByCustomer =
    await api.functional.shoppingMall.admin.admins.index(adminConnection, {
      body: {
        actorType: "customer",
      } satisfies IShoppingMallAdmin.IRequest,
    });
  typia.assert(filteredByCustomer);
  for (const admin of filteredByCustomer.data) {
    TestValidator.equals(
      "actor_type customer filter returns only customer admins",
      admin.actor_type,
      "customer" as "customer" | "seller",
    );
  }
  // 5. actorType 'seller' filter - all returned records must have actor_type 'seller'
  const filteredBySeller = await api.functional.shoppingMall.admin.admins.index(
    adminConnection,
    {
      body: {
        actorType: "seller",
      } satisfies IShoppingMallAdmin.IRequest,
    },
  );
  typia.assert(filteredBySeller);
  for (const admin of filteredBySeller.data) {
    TestValidator.equals(
      "actor_type seller filter returns only seller admins",
      admin.actor_type,
      "seller" as "customer" | "seller",
    );
  }
  // 6. Combined filter: email substring + actorType 'customer'
  const combinedFilter = await api.functional.shoppingMall.admin.admins.index(
    adminConnection,
    {
      body: {
        email: partialEmail,
        actorType: "customer",
      } satisfies IShoppingMallAdmin.IRequest,
    },
  );
  typia.assert(combinedFilter);
  for (const admin of combinedFilter.data) {
    TestValidator.predicate(
      "combined filter: email matches substring",
      admin.email.toLowerCase().includes(partialEmail.toLowerCase()),
    );
    TestValidator.equals(
      "combined filter: actor_type is customer",
      admin.actor_type,
      "customer" as "customer" | "seller",
    );
  }
}
