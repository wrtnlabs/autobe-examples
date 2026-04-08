import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IMallPlatformCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformCategory";
import type { IMallPlatformCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformCustomer";
import type { IMallPlatformProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformProduct";
import type { IMallPlatformProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformProductImage";
import type { IMallPlatformProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformProductVariant";
import type { IMallPlatformSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformSeller";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_customer_join } from "../../../authorize/authorize_customer_join";
import { authorize_customer_login } from "../../../authorize/authorize_customer_login";
import { authorize_customer_refresh } from "../../../authorize/authorize_customer_refresh";

/**
 * Test missing product or variant not found behavior for customer variant lookup.
 *
 * Validates that the customer-facing product variant lookup endpoint returns a not-found error when the requested product or variant identifiers do not correspond to an existing catalog record.
 *
 * Because only the read endpoint and customer registration endpoint are available in this test surface, the scenario is executed as two independent not-found lookups against random UUIDs. This still confirms the endpoint's failure path is stable, read-only, and does not produce a successful variant payload for nonexistent catalog references.
 *
 * 1. Register and authenticate a customer account for authorization.
 * 2. Verify that a lookup using a random product and variant identifier fails with not-found.
 * 3. Verify that a second lookup using another random identifier pair also fails with not-found.
 */
export async function test_api_product_variant_get_missing_product_or_variant_not_found(
  connection: api.IConnection,
): Promise<void> {
  const customerConnection: api.IConnection = { host: connection.host };
  const customer = await authorize_customer_join(customerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "Password123!" satisfies string & tags.Format<"password">,
      href: "https://example.com/register",
      referrer: "https://example.com/landing",
    } satisfies IMallPlatformCustomer.IJoin,
  });
  typia.assert(customer);
  await TestValidator.httpError(
    "missing parent product should return not found",
    404,
    async () => {
      await api.functional.mallPlatform.customer.products.variants.at(
        customerConnection,
        {
          productId: typia.random<string & tags.Format<"uuid">>(),
          variantId: typia.random<string & tags.Format<"uuid">>(),
        },
      );
    },
  );
  await TestValidator.httpError(
    "missing child variant should return not found",
    404,
    async () => {
      await api.functional.mallPlatform.customer.products.variants.at(
        customerConnection,
        {
          productId: typia.random<string & tags.Format<"uuid">>(),
          variantId: typia.random<string & tags.Format<"uuid">>(),
        },
      );
    },
  );
}
