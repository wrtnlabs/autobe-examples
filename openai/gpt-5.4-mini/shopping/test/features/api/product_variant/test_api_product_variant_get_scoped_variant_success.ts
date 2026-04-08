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
 * Retrieve a scoped product variant as an authenticated customer.
 *
 * This test validates the customer-authenticated read flow for a variant nested under a specific product. It ensures the endpoint returns the complete variant payload, preserves the parent product relationship, and does not mutate any state while serving the read.
 *
 * 1. Register and authenticate a customer account using the join utility.
 * 2. Request a variant using the requested product and variant identifiers.
 * 3. Validate that the returned variant belongs to the requested product and exposes the expected read-only payload fields.
 */
export async function test_api_product_variant_get_scoped_variant_success(
  connection: api.IConnection,
): Promise<void> {
  const customerConnection: api.IConnection = { host: connection.host };
  const authorized = await authorize_customer_join(customerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "P@ssw0rd1234",
      href: "https://example.com/register",
      referrer: "https://example.com/landing",
    } satisfies IMallPlatformCustomer.IJoin,
  });
  typia.assert(authorized);
  const productId = typia.random<string & tags.Format<"uuid">>();
  const variantId = typia.random<string & tags.Format<"uuid">>();
  const variant =
    await api.functional.mallPlatform.customer.products.variants.at(
      customerConnection,
      {
        productId,
        variantId,
      },
    );
  typia.assert(variant);
  TestValidator.equals(
    "parent product id matches request context",
    variant.product.id,
    productId,
  );
  TestValidator.predicate(
    "variant belongs to the requested product context",
    variant.product.id === productId,
  );
  TestValidator.predicate("sku code is populated", variant.skuCode.length > 0);
  TestValidator.predicate(
    "option values are populated",
    variant.optionValues.length > 0,
  );
  TestValidator.equals(
    "soft delete marker is null for active variant",
    variant.deletedAt,
    null,
  );
  TestValidator.equals("variant is active", variant.isActive, true);
  TestValidator.predicate(
    "parent product summary is present",
    variant.product.name.length > 0,
  );
  TestValidator.predicate(
    "parent product timestamps are present",
    variant.product.createdAt.length > 0 &&
      variant.product.updatedAt.length > 0,
  );
}
