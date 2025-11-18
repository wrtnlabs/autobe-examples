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

export async function test_api_legal_hold_erase_by_admin(
  connection: api.IConnection,
) {
  // 1. Join an admin to obtain authenticated context
  const adminJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.Format<"password">>(),
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies IShoppingMallAdminJoin.ICreate;

  const adminAuthorized: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: adminJoinBody,
    });
  typia.assert<IShoppingMallAdmin.IAuthorized>(adminAuthorized);

  // 2. Create a new legal hold with a unique business code
  const legalHoldCode: string = RandomGenerator.alphaNumeric(16);

  const legalHoldCreateBody = {
    code: legalHoldCode,
    title: RandomGenerator.paragraph({ sentences: 3 }),
    description: RandomGenerator.paragraph({ sentences: 5 }),
    status: "active",
    scope_description: RandomGenerator.paragraph({ sentences: 4 }),
    external_reference: RandomGenerator.alphaNumeric(12),
    effective_from: new Date().toISOString(),
  } satisfies IShoppingMallLegalHold.ICreate;

  const createdHold: IShoppingMallLegalHold =
    await api.functional.shoppingMall.admin.legalHolds.create(connection, {
      body: legalHoldCreateBody,
    });
  typia.assert<IShoppingMallLegalHold>(createdHold);

  // Ensure created hold matches the requested code and key attributes
  TestValidator.equals(
    "created legal hold code must match input code",
    createdHold.code,
    legalHoldCode,
  );
  TestValidator.equals(
    "created legal hold status must match input status",
    createdHold.status,
    legalHoldCreateBody.status,
  );

  // 3. Optionally reload the hold by its business code to confirm existence
  const fetchedBeforeErase: IShoppingMallLegalHold =
    await api.functional.shoppingMall.admin.legalHolds.at(connection, {
      legalHoldCode,
    });
  typia.assert<IShoppingMallLegalHold>(fetchedBeforeErase);
  TestValidator.equals(
    "fetched-before-erase legal hold id must equal created id",
    fetchedBeforeErase.id,
    createdHold.id,
  );
  TestValidator.equals(
    "fetched-before-erase legal hold code must equal created code",
    fetchedBeforeErase.code,
    createdHold.code,
  );

  // 4. Erase the legal hold by its business code
  await api.functional.shoppingMall.admin.legalHolds.erase(connection, {
    legalHoldCode,
  });

  // 5. After erase, GET by the same code must fail with a domain/HTTP error
  await TestValidator.error(
    "erased legal hold must not be retrievable",
    async () => {
      await api.functional.shoppingMall.admin.legalHolds.at(connection, {
        legalHoldCode,
      });
    },
  );

  // 6. Optionally confirm via search that the erased code no longer appears
  const pageAfterErase: IPageIShoppingMallLegalHold.ISummary =
    await api.functional.shoppingMall.admin.legalHolds.index(connection, {
      body: {
        codes: [legalHoldCode],
        statuses: undefined,
        created_from: null,
        created_to: null,
        created_by_admin_ids: undefined,
        released_by_admin_ids: undefined,
        is_active: null,
        external_references: undefined,
        page: null,
        limit: null,
        order_by: null,
        order_direction: null,
      } satisfies IShoppingMallLegalHold.IRequest,
    });
  typia.assert<IPageIShoppingMallLegalHold.ISummary>(pageAfterErase);

  TestValidator.equals(
    "search by erased legal hold code must return empty data list",
    pageAfterErase.data.length,
    0,
  );
}
