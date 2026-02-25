import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceCustomer";
import type { IEcommerceCustomerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceCustomerProfile";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_customer_join } from "../../../authorize/authorize_customer_join";
import { authorize_customer_login } from "../../../authorize/authorize_customer_login";
import { authorize_customer_refresh } from "../../../authorize/authorize_customer_refresh";

export async function test_api_customer_profile_display_name_length(
  connection: api.IConnection,
): Promise<void> {
  // Scenario 1: Create customer with 2-character display name
  const shortConnection = { host: connection.host };
  await authorize_customer_join(shortConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IEcommerceCustomer.IJoin,
  });
  const shortProfile =
    await api.functional.ecommerce.customer.profile.at(shortConnection);
  typia.assert(shortProfile);
  TestValidator.equals(
    "Short display name matches",
    shortProfile.display_name,
    "ab",
  );
  // Scenario 2: Create customer with 50-character display name
  const longConnection = { host: connection.host };
  await authorize_customer_join(longConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IEcommerceCustomer.IJoin,
  });
  const longProfile =
    await api.functional.ecommerce.customer.profile.at(longConnection);
  typia.assert(longProfile);
  TestValidator.equals(
    "Long display name matches",
    longProfile.display_name,
    Array(50).fill("a").join(""),
  );
}
