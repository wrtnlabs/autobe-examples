import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallAdminJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdminJoin";
import type { IShoppingMallLegalHold } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallLegalHold";

/**
 * Validate that an admin can erase a legal hold only after it has been
 * released.
 *
 * Business flow covered by this test:
 *
 * 1. Admin joins the platform (POST /auth/admin/join) and gets authenticated.
 * 2. The authenticated admin creates a new legal hold with an initial active
 *    status and no released_at value (POST /shoppingMall/admin/legalHolds).
 * 3. The admin updates the legal hold to a released state by calling PUT
 *    /shoppingMall/admin/legalHolds/{legalHoldCode} with
 *    IShoppingMallLegalHold.IUpdate, setting status to a released-like value
 *    and setting released_at to a concrete timestamp.
 * 4. The admin fetches the legal hold via GET
 *    /shoppingMall/admin/legalHolds/{legalHoldCode} and verifies that status
 *    and released_at have been updated, and that released_by_admin is non-null,
 *    proving the release was attributed.
 * 5. Still authenticated as admin, the test erases the legal hold with DELETE
 *    /shoppingMall/admin/legalHolds/{legalHoldCode}.
 * 6. The erase call returns void, so the test only verifies that no error is
 *    thrown.
 * 7. A subsequent attempt to fetch the same legal hold should now fail, which the
 *    test validates using TestValidator.error, focusing on the fact that an
 *    error occurs (not its specific HTTP status code).
 *
 * Constraints and notes:
 *
 * - Must not touch connection.headers directly in the test; authentication is
 *   handled automatically by the SDK join function.
 * - Must not add any new imports beyond the template.
 * - Must use IShoppingMallAdminJoin.ICreate and IShoppingMallLegalHold.ICreate/
 *   IShoppingMallLegalHold.IUpdate exactly as defined, with request bodies
 *   using `satisfies` rather than `as` casting, and never `as any`.
 * - Must validate non-void responses with typia.assert and use TestValidator only
 *   for business-logic checks (like matching codes and status semantics), not
 *   for type or HTTP-status validation.
 */
export async function test_api_legal_hold_erase_after_release_by_admin(
  connection: api.IConnection,
) {
  // 1. Admin joins the platform and becomes authenticated
  const adminJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.Format<"password">>(),
    ip: null,
    href: "https://admin.shoppingmall.local/join",
    referrer: "https://admin.shoppingmall.local/login",
  } satisfies IShoppingMallAdminJoin.ICreate;

  const adminAuthorized: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: adminJoinBody,
    });
  typia.assert(adminAuthorized);

  // 2. Create a new legal hold with initial active status and no released_at
  const legalHoldCode: string = RandomGenerator.alphaNumeric(16);
  const createBody = {
    code: legalHoldCode,
    title: RandomGenerator.paragraph({ sentences: 3 }),
    description: RandomGenerator.content({ paragraphs: 1 }),
    status: "active",
    scope_description: RandomGenerator.paragraph({ sentences: 5 }),
    external_reference: RandomGenerator.alphaNumeric(12),
    effective_from: new Date().toISOString(),
  } satisfies IShoppingMallLegalHold.ICreate;

  const createdHold: IShoppingMallLegalHold =
    await api.functional.shoppingMall.admin.legalHolds.create(connection, {
      body: createBody,
    });
  typia.assert(createdHold);

  TestValidator.equals(
    "created legal hold code matches request code",
    createdHold.code,
    legalHoldCode,
  );
  TestValidator.equals(
    "created legal hold status should be active",
    createdHold.status,
    "active",
  );

  // 3. Update the legal hold to a released state (set status and released_at)
  const releasedAt: string & tags.Format<"date-time"> =
    new Date().toISOString() as string & tags.Format<"date-time">;

  const updateBody = {
    status: "released",
    released_at: releasedAt,
  } satisfies IShoppingMallLegalHold.IUpdate;

  const releasedHold: IShoppingMallLegalHold =
    await api.functional.shoppingMall.admin.legalHolds.update(connection, {
      legalHoldCode,
      body: updateBody,
    });
  typia.assert(releasedHold);

  TestValidator.equals(
    "released legal hold code remains unchanged",
    releasedHold.code,
    legalHoldCode,
  );
  TestValidator.equals(
    "released legal hold status is now released",
    releasedHold.status,
    "released",
  );
  TestValidator.predicate(
    "released_at must be non-null after releasing",
    releasedHold.released_at !== null && releasedHold.released_at !== undefined,
  );
  TestValidator.predicate(
    "released_by_admin should be non-null after releasing",
    releasedHold.released_by_admin !== null &&
      releasedHold.released_by_admin !== undefined,
  );

  // 4. Fetch the legal hold again and confirm released state
  const fetchedAfterRelease: IShoppingMallLegalHold =
    await api.functional.shoppingMall.admin.legalHolds.at(connection, {
      legalHoldCode,
    });
  typia.assert(fetchedAfterRelease);

  TestValidator.equals(
    "fetched-after-release code matches created code",
    fetchedAfterRelease.code,
    legalHoldCode,
  );
  TestValidator.equals(
    "fetched-after-release status remains released",
    fetchedAfterRelease.status,
    "released",
  );
  TestValidator.predicate(
    "fetched-after-release released_at still non-null",
    fetchedAfterRelease.released_at !== null &&
      fetchedAfterRelease.released_at !== undefined,
  );

  // 5. Erase the released legal hold
  await api.functional.shoppingMall.admin.legalHolds.erase(connection, {
    legalHoldCode,
  });

  // 6. Confirm that erase completed without throwing by reaching this point
  TestValidator.predicate("erase operation completed without throwing", true);

  // 7. Attempt to fetch again and expect an error (e.g., not found)
  await TestValidator.error(
    "erased legal hold cannot be fetched anymore",
    async () => {
      await api.functional.shoppingMall.admin.legalHolds.at(connection, {
        legalHoldCode,
      });
    },
  );
}
