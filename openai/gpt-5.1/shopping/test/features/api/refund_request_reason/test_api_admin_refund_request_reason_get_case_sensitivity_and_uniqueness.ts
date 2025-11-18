import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallAdminJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdminJoin";
import type { IShoppingMallRefundRequestReason } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallRefundRequestReason";

/**
 * Validate case sensitivity and uniqueness of refund request reason codes.
 *
 * Business goal: Ensure that the admin-facing GET endpoint for refund request
 * reasons behaves in a code-unique, predictable way: codes are treated as
 * case-sensitive identifiers, they cannot be duplicated on creation, and GET by
 * code always resolves to at most one configuration record.
 *
 * Test workflow:
 *
 * 1. Join an admin account using POST /auth/admin/join. This establishes an
 *    authenticated admin context via the SDK, which automatically injects the
 *    access token into `connection.headers.Authorization`.
 * 2. As this admin, create a new refund request reason using POST
 *    /shoppingMall/admin/refundRequestReasons with a deliberately mixed-case
 *    `code` such as "Damaged_Item_001" through
 *    IShoppingMallRefundRequestReason.ICreate.
 * 3. Call GET /shoppingMall/admin/refundRequestReasons/{reasonCode} via
 *    api.functional.shoppingMall.admin.refundRequestReasons.at with the exact
 *    same code string. Assert that the response is a single
 *    IShoppingMallRefundRequestReason whose `code` matches exactly and whose
 *    other core fields (id, flags, timestamps) are properly populated.
 * 4. Call the same GET endpoint using a differently cased code variant, e.g.
 *    "damaged_item_001". Assert that an error is thrown (using
 *    TestValidator.error or TestValidator.httpError) to reflect that the
 *    platform does not treat codes as case-insensitive. Per global rules we do
 *    _not_ validate the exact HTTP status code, only that an error occurs.
 * 5. Attempt to create a second refund request reason with the exact same `code`
 *    and otherwise different payload. Assert that this creation attempt fails
 *    with an error, which indirectly confirms the unique constraint on `code`.
 * 6. Throughout, ensure that successful responses are validated with
 *    typia.assert() and that all request bodies use `satisfies` with the
 *    correct DTO types. Never touch `connection.headers` manually, and do not
 *    attempt any type-error-based tests.
 */
export async function test_api_admin_refund_request_reason_get_case_sensitivity_and_uniqueness(
  connection: api.IConnection,
) {
  // 1. Join an admin account to obtain authenticated context.
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
  typia.assert(adminAuthorized);

  // 2. Create a refund request reason with a mixed-case code.
  const mixedCaseCode = "Damaged_Item_001";
  const createReasonBody = {
    code: mixedCaseCode,
    name: RandomGenerator.paragraph({ sentences: 3, wordMin: 3, wordMax: 10 }),
    description: RandomGenerator.paragraph({
      sentences: 6,
      wordMin: 3,
      wordMax: 10,
    }),
    applies_to_cancellation: true,
    applies_to_refund: true,
    is_active: true,
  } satisfies IShoppingMallRefundRequestReason.ICreate;

  const createdReason: IShoppingMallRefundRequestReason =
    await api.functional.shoppingMall.admin.refundRequestReasons.create(
      connection,
      {
        body: createReasonBody,
      },
    );
  typia.assert(createdReason);

  // Verify core identity fields.
  TestValidator.equals(
    "created reason code matches request body",
    createdReason.code,
    mixedCaseCode,
  );

  // 3. GET with exact same code and verify the record matches.
  const fetchedExact: IShoppingMallRefundRequestReason =
    await api.functional.shoppingMall.admin.refundRequestReasons.at(
      connection,
      { reasonCode: mixedCaseCode },
    );
  typia.assert(fetchedExact);

  TestValidator.equals(
    "fetched reason id matches created id",
    fetchedExact.id,
    createdReason.id,
  );
  TestValidator.equals(
    "fetched reason code matches created code exactly",
    fetchedExact.code,
    createdReason.code,
  );
  TestValidator.equals(
    "fetched reason name matches created name",
    fetchedExact.name,
    createdReason.name,
  );
  TestValidator.equals(
    "fetched applies_to_cancellation matches created",
    fetchedExact.applies_to_cancellation,
    createdReason.applies_to_cancellation,
  );
  TestValidator.equals(
    "fetched applies_to_refund matches created",
    fetchedExact.applies_to_refund,
    createdReason.applies_to_refund,
  );
  TestValidator.equals(
    "fetched is_active matches created",
    fetchedExact.is_active,
    createdReason.is_active,
  );

  // 4. GET with differently cased code and assert an error is thrown.
  const lowerCasedCode = mixedCaseCode.toLowerCase();
  if (lowerCasedCode !== mixedCaseCode) {
    await TestValidator.error(
      "GET with differently cased code should fail",
      async () => {
        await api.functional.shoppingMall.admin.refundRequestReasons.at(
          connection,
          { reasonCode: lowerCasedCode },
        );
      },
    );
  }

  // 5. Attempt duplicate creation with the same code and expect failure.
  const duplicateCreateBody = {
    code: mixedCaseCode,
    name: RandomGenerator.paragraph({ sentences: 2, wordMin: 3, wordMax: 10 }),
    description: RandomGenerator.paragraph({
      sentences: 4,
      wordMin: 3,
      wordMax: 10,
    }),
    applies_to_cancellation: false,
    applies_to_refund: true,
    is_active: false,
  } satisfies IShoppingMallRefundRequestReason.ICreate;

  await TestValidator.error(
    "creating a second reason with duplicate code should fail",
    async () => {
      await api.functional.shoppingMall.admin.refundRequestReasons.create(
        connection,
        { body: duplicateCreateBody },
      );
    },
  );

  // 6. Implicitly validate that GET returns a single record for a given code
  // by the fact that the response type is a single DTO and all assertions
  // above operate on singular objects.
}
