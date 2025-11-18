import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallAdminJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdminJoin";
import type { IShoppingMallLegalHold } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallLegalHold";

export async function test_api_admin_legal_hold_detail_requires_authentication(
  connection: api.IConnection,
) {
  /**
   * 1. Register a new admin and obtain an authenticated connection.
   *
   *    - Use POST /auth/admin/join with a realistic IShoppingMallAdminJoin.ICreate
   *         body.
   *    - The SDK will automatically attach the JWT access token into
   *         connection.headers.Authorization.
   * 2. Create a new legal hold using the authenticated admin context.
   *
   *    - Call POST /shoppingMall/admin/legalHolds with an
   *         IShoppingMallLegalHold.ICreate body.
   *    - Capture the returned legal hold and especially its `code` field.
   * 3. Build an unauthenticated connection object by shallow-cloning the incoming
   *    connection.
   *
   *    - Do NOT touch or inspect `connection.headers` per the global rules.
   *    - The cloned connection must not carry over the Authorization header; since
   *         we cannot manipulate headers, we instead construct a fresh minimal
   *         connection structure with the same host/simulate/options but
   *         without headers at all.
   * 4. Using the unauthenticated connection, attempt to call GET
   *    /shoppingMall/admin/legalHolds/{legalHoldCode} for the valid `code`.
   *
   *    - Wrap this call in TestValidator.error(...) to assert that some HttpError is
   *         thrown.
   *    - Do not assert on the specific HTTP status code (401 vs 403); only that an
   *         error occurs.
   * 5. As a positive control, call the same GET endpoint using the authenticated
   *    connection.
   *
   *    - Assert that the returned IShoppingMallLegalHold matches the previously
   *         created legal hold on key business fields such as `code`, `title`,
   *         and `status`.
   */

  // 1. Admin join to obtain authenticated admin context
  const joinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.Format<"password">>(),
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies IShoppingMallAdminJoin.ICreate;

  const authorizedAdmin: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: joinBody,
    });
  typia.assert(authorizedAdmin);

  // 2. Create a concrete legal hold as this admin
  const legalHoldCreateBody = {
    code: RandomGenerator.alphaNumeric(12),
    title: RandomGenerator.paragraph({ sentences: 3 }),
    description: RandomGenerator.paragraph({ sentences: 8 }),
    status: "active",
    scope_description: RandomGenerator.paragraph({ sentences: 5 }),
    external_reference: RandomGenerator.alphaNumeric(10),
    effective_from: new Date().toISOString(),
  } satisfies IShoppingMallLegalHold.ICreate;

  const createdLegalHold: IShoppingMallLegalHold =
    await api.functional.shoppingMall.admin.legalHolds.create(connection, {
      body: legalHoldCreateBody,
    });
  typia.assert(createdLegalHold);

  // 3. Prepare an unauthenticated connection.
  // According to the global rules, we must not touch connection.headers at all.
  // Therefore, we construct a fresh connection object that only reuses safe fields
  // like host, simulate flag, logger, encryption, options, and fetch, without any headers.
  const unauthenticatedConnection: api.IConnection = {
    host: connection.host,
    simulate: connection.simulate,
    logger: connection.logger,
    encryption: connection.encryption,
    options: connection.options,
    fetch: connection.fetch,
  };

  // 4. Attempt to access the legal hold detail without authentication and expect an HttpError.
  await TestValidator.error(
    "unauthenticated admin legal hold detail must fail",
    async () => {
      await api.functional.shoppingMall.admin.legalHolds.at(
        unauthenticatedConnection,
        {
          legalHoldCode: createdLegalHold.code,
        },
      );
    },
  );

  // 5. Positive control: access the same detail with the authenticated admin connection.
  const fetchedLegalHold: IShoppingMallLegalHold =
    await api.functional.shoppingMall.admin.legalHolds.at(connection, {
      legalHoldCode: createdLegalHold.code,
    });
  typia.assert(fetchedLegalHold);

  // Validate that the fetched record corresponds to the created one on key fields.
  TestValidator.equals(
    "legal hold code must match",
    fetchedLegalHold.code,
    createdLegalHold.code,
  );
  TestValidator.equals(
    "legal hold title must match",
    fetchedLegalHold.title,
    createdLegalHold.title,
  );
  TestValidator.equals(
    "legal hold status must match",
    fetchedLegalHold.status,
    createdLegalHold.status,
  );
}
