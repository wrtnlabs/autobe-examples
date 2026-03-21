import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomer";
import type { IEcommerceMallCustomerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomerProfile";
import type { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";

export async function test_api_seller_profile_view_by_authenticated_seller(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create a new connection for seller operations
  const sellerConnection: api.IConnection = { host: connection.host };
  // 2. Register a new seller account using the utility function
  const authorized = await authorize_seller_join(sellerConnection, {});
  typia.assert(authorized);
  // 3. Retrieve the authenticated seller's profile
  const profile =
    await api.functional.ecommerceMall.seller.profile.at(sellerConnection);
  typia.assert(profile);
  // 4. Validate profile response structure
  TestValidator.equals(
    "seller profile id is string",
    typeof profile.id,
    "string",
  );
  TestValidator.equals(
    "display_name is string",
    typeof profile.display_name,
    "string",
  );
  TestValidator.equals("phone is string", typeof profile.phone, "string");
  TestValidator.equals(
    "created_at is string",
    typeof profile.created_at,
    "string",
  );
  TestValidator.equals(
    "updated_at is string",
    typeof profile.updated_at,
    "string",
  );
  // 5. Validate profile contains customer reference information
  TestValidator.equals(
    "customer reference exists",
    profile.customer !== undefined,
    true,
  );
  TestValidator.equals(
    "customer id is string",
    typeof profile.customer.id,
    "string",
  );
  TestValidator.equals(
    "customer email is string",
    typeof profile.customer.email,
    "string",
  );
  TestValidator.equals(
    "customer status is active",
    profile.customer.status,
    "active",
  );
  // 6. Validate timestamps are valid date-time format
  TestValidator.predicate("created_at is valid ISO date", () => {
    const date = new Date(profile.created_at);
    return !isNaN(date.getTime());
  });
  TestValidator.predicate("updated_at is valid ISO date", () => {
    const date = new Date(profile.updated_at);
    return !isNaN(date.getTime());
  });
  // 7. Validate display_name is within length constraints
  TestValidator.predicate(
    "display_name length valid",
    profile.display_name.length <= 100,
  );
  // 8. Validate phone is within length constraints
  TestValidator.predicate(
    "phone length valid",
    profile.phone.length >= 10 && profile.phone.length <= 20,
  );
}
