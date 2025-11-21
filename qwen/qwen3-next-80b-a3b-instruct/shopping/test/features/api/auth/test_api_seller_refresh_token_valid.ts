import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";

export async function test_api_seller_refresh_token_valid(
  connection: api.IConnection,
) {
  // Per the API contract, refresh endpoint accepts IRequest (filters) not authentication tokens
  // We must provide a sample IShoppingMallSeller.IRequest as per the type definition
  // This is a functional test of the endpoint's ability to handle IRequest and return IAuthorized

  // Generate random request parameters according to IRequest definition
  const requestBody: IShoppingMallSeller.IRequest = {
    business_name: RandomGenerator.paragraph({ sentences: 1 }), // business_name is optional
    status: RandomGenerator.pick([
      "active",
      "suspended",
      "pending_verification",
      "rejected",
    ] as const), // one of allowed statuses
    created_at_from: new Date(
      Date.now() - 1000 * 60 * 60 * 24 * 30,
    ).toISOString(), // 30 days ago
    created_at_to: new Date().toISOString(), // now
    updated_at_from: new Date(
      Date.now() - 1000 * 60 * 60 * 24 * 7,
    ).toISOString(), // 7 days ago
    updated_at_to: new Date().toISOString(), // now
  };

  // Verify we're following IRequest exactly and not including forbidden properties
  TestValidator.predicate(
    "request body follows IRequest structure",
    typeof requestBody.business_name === "string" ||
      requestBody.business_name === undefined,
  );
  TestValidator.predicate(
    "status is valid",
    requestBody.status === undefined ||
      ["active", "suspended", "pending_verification", "rejected"].includes(
        requestBody.status,
      ),
  );
  TestValidator.predicate(
    "created_at_from is date-time",
    requestBody.created_at_from === undefined ||
      /:\d{2}:\d{2}:\d{2}\.\d{3}Z$/i.test(requestBody.created_at_from),
  );
  TestValidator.predicate(
    "created_at_to is date-time",
    requestBody.created_at_to === undefined ||
      /:\d{2}:\d{2}:\d{2}\.\d{3}Z$/i.test(requestBody.created_at_to),
  );
  TestValidator.predicate(
    "updated_at_from is date-time",
    requestBody.updated_at_from === undefined ||
      /:\d{2}:\d{2}:\d{2}\.\d{3}Z$/i.test(requestBody.updated_at_from),
  );
  TestValidator.predicate(
    "updated_at_to is date-time",
    requestBody.updated_at_to === undefined ||
      /:\d{2}:\d{2}:\d{2}\.\d{3}Z$/i.test(requestBody.updated_at_to),
  );

  // Call refresh with IRequest body
  const response: IShoppingMallSeller.IAuthorized =
    await api.functional.auth.seller.refresh(connection, {
      body: requestBody satisfies IShoppingMallSeller.IRequest,
    });
  typia.assert(response);

  // Validate the response object has all required properties
  TestValidator.predicate("id is a string", typeof response.id === "string");
  TestValidator.predicate(
    "email is valid email format",
    typeof response.email === "string" &&
      /^[a-z0-9!#$%&'*+/=?^_`{|}~-]+(?:\.[a-z0-9!#$%&'*+/=?^_`{|}~-]+)*@(?:[a-z0-9](?:[a-z0-9-]*[a-z0-9])?\.)+[a-z0-9](?:[a-z0-9-]*[a-z0-9])?$/i.test(
        response.email,
      ),
  );
  TestValidator.predicate(
    "business_name is string",
    typeof response.business_name === "string",
  );
  TestValidator.predicate(
    "business_address is string",
    typeof response.business_address === "string",
  );
  TestValidator.predicate(
    "tax_id is string",
    typeof response.tax_id === "string",
  );
  TestValidator.predicate(
    "created_at is date-time",
    typeof response.created_at === "string" &&
      /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/i.test(
        response.created_at,
      ),
  );
  TestValidator.predicate(
    "updated_at is date-time",
    typeof response.updated_at === "string" &&
      /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/i.test(
        response.updated_at,
      ),
  );
  TestValidator.predicate(
    "status is valid",
    response.status === "pending_verification" ||
      response.status === "active" ||
      response.status === "suspended" ||
      response.status === "deleted",
  );

  // Validate that the token object exists and has required properties
  TestValidator.predicate("token is present", response.token !== undefined);
  TestValidator.predicate(
    "token.access is string",
    typeof response.token.access === "string" &&
      response.token.access.length > 0,
  );
  TestValidator.predicate(
    "token.refresh is string",
    typeof response.token.refresh === "string" &&
      response.token.refresh.length > 0,
  );
  TestValidator.predicate(
    "token.expired_at is date-time",
    typeof response.token.expired_at === "string" &&
      /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/i.test(
        response.token.expired_at,
      ),
  );
  TestValidator.predicate(
    "token.refreshable_until is date-time",
    typeof response.token.refreshable_until === "string" &&
      /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/i.test(
        response.token.refreshable_until,
      ),
  );

  // Validate that token is still valid (experiments with current timestamp)
  const now = new Date();
  TestValidator.predicate(
    "access token hasn't expired",
    new Date(response.token.expired_at) > now,
  );
  TestValidator.predicate(
    "refresh token is still valid",
    new Date(response.token.refreshable_until) > now,
  );

  // Validate that deleted_at is optional and null if not set (per definition)
  TestValidator.predicate("deleted_at is null", response.deleted_at === null);
}
