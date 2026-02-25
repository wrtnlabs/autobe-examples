import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceCustomer";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_customer_join } from "../../../authorize/authorize_customer_join";
import { authorize_customer_login } from "../../../authorize/authorize_customer_login";
import { authorize_customer_refresh } from "../../../authorize/authorize_customer_refresh";

export async function test_api_customer_registration_success(
  connection: api.IConnection,
): Promise<void> {
  // Create actor-specific connection for customer registration
  const customerConnection: api.IConnection = { host: connection.host };
  // Generate random test data matching IJoin constraints
  const joinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(16),
    display_name: RandomGenerator.paragraph({
      sentences: 1,
      wordMin: 2,
      wordMax: 4,
    }).substring(0, 50),
    phone_number: RandomGenerator.mobile(),
  } satisfies IEcommerceCustomer.IJoin;
  // Use utility function (mandatory) for customer registration
  const response = await authorize_customer_join(customerConnection, {
    body: joinBody,
  });
  // Complete validation of response structure
  typia.assert(response);
  // Verify business logic - email matches input
  TestValidator.equals(
    "email should match input",
    response.email,
    joinBody.email,
  );
  // Verify display name matches input
  TestValidator.equals(
    "display name should match input",
    response.display_name,
    joinBody.display_name,
  );
  // Verify phone number matches input
  TestValidator.equals(
    "phone number should match input",
    response.phone_number,
    joinBody.phone_number,
  );
  // Verify UUID format and non-emptiness
  TestValidator.predicate(
    "id should be a non-empty string",
    response.id.length > 0,
  );
  // Verify token structure
  TestValidator.predicate(
    "access token should be non-empty",
    response.token.access.length > 0,
  );
  TestValidator.predicate(
    "refresh token should be non-empty",
    response.token.refresh.length > 0,
  );
  // Verify token expiration timestamps
  const expiredAt = new Date(response.token.expired_at);
  const refreshableUntil = new Date(response.token.refreshable_until);
  TestValidator.predicate(
    "expired_at should be valid date",
    !isNaN(expiredAt.getTime()),
  );
  TestValidator.predicate(
    "refreshable_until should be valid date",
    !isNaN(refreshableUntil.getTime()),
  );
  // Verify created_at and updated_at are valid timestamps
  const createdAt = new Date(response.created_at);
  const updatedAt = new Date(response.updated_at);
  TestValidator.predicate(
    "created_at should be valid date",
    !isNaN(createdAt.getTime()),
  );
  TestValidator.predicate(
    "updated_at should be valid date",
    !isNaN(updatedAt.getTime()),
  );
  // Verify deleted_at is null (not soft-deleted)
  TestValidator.equals(
    "deleted_at should be null for new customer",
    response.deleted_at,
    null,
  );
  // Verify timestamps are recent (within last minute)
  const now = new Date();
  const oneMinuteAgo = new Date(now.getTime() - 60 * 1000);
  TestValidator.predicate(
    "created_at should be recent",
    createdAt > oneMinuteAgo,
  );
  TestValidator.predicate(
    "updated_at should be recent",
    updatedAt > oneMinuteAgo,
  );
  // Verify expired_at is in the future (token not expired)
  TestValidator.predicate("token should not be expired", expiredAt > now);
  // Verify refreshable_until is after expired_at
  TestValidator.predicate(
    "refreshable_until should be after expired_at",
    refreshableUntil > expiredAt,
  );
}
