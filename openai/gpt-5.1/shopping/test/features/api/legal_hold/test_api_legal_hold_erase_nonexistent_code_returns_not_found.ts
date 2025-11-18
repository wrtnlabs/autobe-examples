import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallLegalHold } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallLegalHold";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallAdminJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdminJoin";
import type { IShoppingMallLegalHold } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallLegalHold";

export async function test_api_legal_hold_erase_nonexistent_code_returns_not_found(
  connection: api.IConnection,
) {
  // 1. Join an admin to get authenticated admin context
  const adminJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.Format<"password">>(),
    ip: null,
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies IShoppingMallAdminJoin.ICreate;

  const adminAuthorized: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: adminJoinBody,
    });
  typia.assert(adminAuthorized);

  // 2. Create at least one valid legal hold
  const legalHoldCodeExisting: string = RandomGenerator.alphaNumeric(16);

  const createBody = {
    code: legalHoldCodeExisting,
    title: RandomGenerator.paragraph({ sentences: 3 }),
    description: RandomGenerator.paragraph({ sentences: 6 }),
    status: "active",
    scope_description: RandomGenerator.paragraph({ sentences: 5 }),
    external_reference: RandomGenerator.alphaNumeric(12),
    effective_from: new Date().toISOString(),
  } satisfies IShoppingMallLegalHold.ICreate;

  const created: IShoppingMallLegalHold =
    await api.functional.shoppingMall.admin.legalHolds.create(connection, {
      body: createBody,
    });
  typia.assert(created);

  TestValidator.equals(
    "created legal hold code must match input code",
    created.code,
    legalHoldCodeExisting,
  );

  // 3. Capture baseline count including this legal hold via index()
  const indexRequestBefore = {
    codes: [legalHoldCodeExisting],
    statuses: undefined,
    created_from: null,
    created_to: null,
    created_by_admin_ids: undefined,
    released_by_admin_ids: undefined,
    is_active: null,
    external_references: undefined,
    page: 1 as number & tags.Type<"int32"> & tags.Minimum<1>,
    limit: 10 as number & tags.Type<"int32"> & tags.Minimum<1>,
    order_by: null,
    order_direction: null,
  } satisfies IShoppingMallLegalHold.IRequest;

  const pageBefore: IPageIShoppingMallLegalHold.ISummary =
    await api.functional.shoppingMall.admin.legalHolds.index(connection, {
      body: indexRequestBefore,
    });
  typia.assert(pageBefore);

  const baselineCount: number = pageBefore.data.length;

  TestValidator.predicate(
    "baseline result must include at least the created legal hold",
    baselineCount >= 1,
  );

  // 4. Pick a non-existent legalHoldCode (different from existing one)
  let nonExistingCode: string = legalHoldCodeExisting;
  while (nonExistingCode === legalHoldCodeExisting) {
    nonExistingCode = RandomGenerator.alphaNumeric(18);
  }

  TestValidator.notEquals(
    "non-existing code must differ from existing code",
    nonExistingCode,
    legalHoldCodeExisting,
  );

  // 5. Call erase() with non-existent code and expect error (e.g., 404)
  await TestValidator.error(
    "erase with non-existent legal hold code must fail",
    async () => {
      await api.functional.shoppingMall.admin.legalHolds.erase(connection, {
        legalHoldCode: nonExistingCode,
      });
    },
  );

  // 6. Verify via at() that existing legal hold is still present and unchanged
  const fetched: IShoppingMallLegalHold =
    await api.functional.shoppingMall.admin.legalHolds.at(connection, {
      legalHoldCode: legalHoldCodeExisting,
    });
  typia.assert(fetched);

  TestValidator.equals(
    "fetched legal hold code remains unchanged",
    fetched.code,
    created.code,
  );
  TestValidator.equals(
    "fetched legal hold title remains unchanged",
    fetched.title,
    created.title,
  );
  TestValidator.equals(
    "fetched legal hold status remains unchanged",
    fetched.status,
    created.status,
  );

  // 7. Optionally confirm via index() that the record count for this code has not decreased
  const indexRequestAfter = {
    codes: [legalHoldCodeExisting],
    statuses: undefined,
    created_from: null,
    created_to: null,
    created_by_admin_ids: undefined,
    released_by_admin_ids: undefined,
    is_active: null,
    external_references: undefined,
    page: 1 as number & tags.Type<"int32"> & tags.Minimum<1>,
    limit: 10 as number & tags.Type<"int32"> & tags.Minimum<1>,
    order_by: null,
    order_direction: null,
  } satisfies IShoppingMallLegalHold.IRequest;

  const pageAfter: IPageIShoppingMallLegalHold.ISummary =
    await api.functional.shoppingMall.admin.legalHolds.index(connection, {
      body: indexRequestAfter,
    });
  typia.assert(pageAfter);

  TestValidator.equals(
    "record count for existing legal hold code must remain unchanged after failed erase",
    pageAfter.data.length,
    baselineCount,
  );
}
