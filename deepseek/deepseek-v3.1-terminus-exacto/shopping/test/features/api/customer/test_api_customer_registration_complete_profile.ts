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

export async function test_api_customer_registration_complete_profile(
  connection: api.IConnection,
): Promise<void> {
  // Create customer connection
  const customerConnection: api.IConnection = { host: connection.host };
  // Generate complete customer registration data
  const joinBody: IEcommerceCustomer.IJoin = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(16),
    display_name: RandomGenerator.paragraph({
      sentences: 1,
      wordMin: 2,
      wordMax: 4,
    }).substring(0, 50),
    phone_number: RandomGenerator.mobile(),
  };
  // Register customer via utility function
  const authorized = await authorize_customer_join(customerConnection, {
    body: joinBody,
  });
  typia.assert(authorized);
  // Validate response structure
  TestValidator.predicate("has valid customer ID", authorized.id.length > 0);
  TestValidator.equals("email matches input", authorized.email, joinBody.email);
  TestValidator.equals(
    "display name matches input",
    authorized.display_name,
    joinBody.display_name,
  );
  TestValidator.equals(
    "phone number matches input",
    authorized.phone_number,
    joinBody.phone_number,
  );
  TestValidator.predicate(
    "created at is valid date",
    authorized.created_at.length > 0,
  );
  TestValidator.predicate(
    "updated at is valid date",
    authorized.updated_at.length > 0,
  );
  // Validate token structure
  TestValidator.predicate(
    "has access token",
    authorized.token.access.length > 0,
  );
  TestValidator.predicate(
    "has refresh token",
    authorized.token.refresh.length > 0,
  );
  TestValidator.predicate(
    "has token expiration",
    authorized.token.expired_at.length > 0,
  );
  TestValidator.predicate(
    "has refreshable until",
    authorized.token.refreshable_until.length > 0,
  );
}
