import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallSeller";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallAdminJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdminJoin";
import type { IShoppingMallLegalHold } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallLegalHold";
import type { IShoppingMallLegalHoldTarget } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallLegalHoldTarget";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import type { IShoppingMallSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerProfile";

/**
 * Validate that admin deletion of a seller is blocked when the seller is under
 * an active legal hold.
 *
 * Business context:
 *
 * - Platform governance requires that sellers under legal hold cannot be
 *   hard-deleted while the hold is active.
 * - Legal holds are created and managed by admins and associated to concrete
 *   business entities (like sellers) through legal hold targets.
 *
 * End-to-end steps:
 *
 * 1. Join as an admin using POST /auth/admin/join so that subsequent
 *    /shoppingMall/admin/* calls run with admin authorization.
 * 2. Fetch a page of sellers via PATCH /shoppingMall/admin/sellers using a broad
 *    search (IShoppingMallSeller.IRequest) and pick one seller summary as the
 *    target of the test.
 * 3. Create a legal hold via POST /shoppingMall/admin/legalHolds using
 *    IShoppingMallLegalHold.ICreate with a unique business code and basic
 *    descriptive metadata in title/status.
 * 4. Attach the chosen seller as a legal hold target using POST
 *    /shoppingMall/admin/legalHolds/{legalHoldCode}/targets with
 *    IShoppingMallLegalHoldTarget.ICreate, setting target_type to "seller" and
 *    target_id to the picked sellerId.
 * 5. Attempt to delete the seller via DELETE
 *    /shoppingMall/admin/sellers/{sellerId}.
 * 6. Assert that the deletion attempt fails with an error (HttpError at the SDK
 *    level). We do NOT assert on HTTP status codes or response payload details;
 *    we simply require that an error is thrown for this operation.
 * 7. Confirm the seller still exists by calling GET
 *    /shoppingMall/admin/sellers/{sellerId} and validating the
 *    IShoppingMallSeller result via typia.assert.
 * 8. Optionally confirm that the seller remains in the admin listing by re-running
 *    the index operation and ensuring the seller id is still in the page data.
 *
 * Edge conditions:
 *
 * - If the environment has no sellers (admin index returns an empty list), the
 *   test short-circuits with a predicate assertion indicating it cannot run
 *   meaningfully.
 * - All DTOs used strictly follow the generated structures; no extra properties
 *   are introduced.
 */
export async function test_api_admin_seller_deletion_blocked_by_risk_or_legal_hold(
  connection: api.IConnection,
) {
  // 1. Join as an admin to obtain an authorized admin context
  const adminJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.Format<"password">>(),
    href: "https://admin.test.local/join",
    referrer: "https://admin.test.local/landing",
  } satisfies IShoppingMallAdminJoin.ICreate;

  const adminAuthorized: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: adminJoinBody,
    });
  typia.assert<IShoppingMallAdmin.IAuthorized>(adminAuthorized);

  // 2. Fetch a page of sellers to select a target seller
  const sellerSearchBody = {
    page: 1 as number & tags.Type<"int32">,
    limit: 10 as number & tags.Type<"int32">,
  } satisfies IShoppingMallSeller.IRequest;

  const sellerPage: IPageIShoppingMallSeller.ISummary =
    await api.functional.shoppingMall.admin.sellers.index(connection, {
      body: sellerSearchBody,
    });
  typia.assert<IPageIShoppingMallSeller.ISummary>(sellerPage);

  TestValidator.predicate(
    "admin seller index must return at least one seller to run legal hold deletion-block test",
    sellerPage.data.length > 0,
  );
  if (sellerPage.data.length === 0) return; // Nothing more we can do in an empty environment

  const targetSellerSummary: IShoppingMallSeller.ISummary = sellerPage.data[0];

  // 3. Create a legal hold that will protect this seller
  const legalHoldCode: string = `test-legal-hold-${RandomGenerator.alphaNumeric(12)}`;
  const legalHoldCreateBody = {
    code: legalHoldCode,
    title: RandomGenerator.paragraph({ sentences: 3 }),
    status: "active",
    description: RandomGenerator.paragraph({ sentences: 6 }),
    scope_description: RandomGenerator.paragraph({ sentences: 4 }),
    external_reference: RandomGenerator.alphaNumeric(16),
    effective_from: new Date().toISOString(),
  } satisfies IShoppingMallLegalHold.ICreate;

  const legalHold: IShoppingMallLegalHold =
    await api.functional.shoppingMall.admin.legalHolds.create(connection, {
      body: legalHoldCreateBody,
    });
  typia.assert<IShoppingMallLegalHold>(legalHold);

  // 4. Attach the chosen seller as a legal hold target
  const legalHoldTargetCreateBody = {
    target_type: "seller",
    target_id: targetSellerSummary.id,
    target_display: targetSellerSummary.email,
    note: RandomGenerator.paragraph({ sentences: 2 }),
  } satisfies IShoppingMallLegalHoldTarget.ICreate;

  const legalHoldTarget: IShoppingMallLegalHoldTarget =
    await api.functional.shoppingMall.admin.legalHolds.targets.create(
      connection,
      {
        legalHoldCode,
        body: legalHoldTargetCreateBody,
      },
    );
  typia.assert<IShoppingMallLegalHoldTarget>(legalHoldTarget);

  // 5. Attempt to delete the seller
  await TestValidator.error(
    "seller deletion must be blocked when a legal hold target exists for that seller",
    async () => {
      const deletedSeller: IShoppingMallSeller =
        await api.functional.shoppingMall.admin.sellers.erase(connection, {
          sellerId: targetSellerSummary.id,
        });
      // If we reach here, deletion unexpectedly succeeded; assert to fail the test
      typia.assert<IShoppingMallSeller>(deletedSeller);
    },
  );

  // 6. Confirm the seller still exists via GET /shoppingMall/admin/sellers/{sellerId}
  const sellerAfterAttempt: IShoppingMallSeller =
    await api.functional.shoppingMall.admin.sellers.at(connection, {
      sellerId: targetSellerSummary.id,
    });
  typia.assert<IShoppingMallSeller>(sellerAfterAttempt);

  TestValidator.equals(
    "seller id after blocked deletion must equal original target seller id",
    sellerAfterAttempt.id,
    targetSellerSummary.id,
  );

  // 7. Optionally confirm seller is still in list (re-query page 1)
  const sellerPageAfter: IPageIShoppingMallSeller.ISummary =
    await api.functional.shoppingMall.admin.sellers.index(connection, {
      body: sellerSearchBody,
    });
  typia.assert<IPageIShoppingMallSeller.ISummary>(sellerPageAfter);

  const stillListed = sellerPageAfter.data.some(
    (summary) => summary.id === targetSellerSummary.id,
  );
  TestValidator.predicate(
    "seller should remain present in admin seller listing after blocked deletion attempt",
    stillListed,
  );
}
