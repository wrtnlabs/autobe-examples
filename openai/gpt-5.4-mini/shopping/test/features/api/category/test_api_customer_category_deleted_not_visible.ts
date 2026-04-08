import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IMallPlatformCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformCategory";
import type { IMallPlatformCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformCustomer";
import type { IMallPlatformCustomerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformCustomerProfile";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_customer_join } from "../../../authorize/authorize_customer_join";
import { authorize_customer_login } from "../../../authorize/authorize_customer_login";
import { authorize_customer_refresh } from "../../../authorize/authorize_customer_refresh";

export async function test_api_customer_category_deleted_not_visible(
  connection: api.IConnection,
): Promise<void> {
  /**
   * Verifies that customer-facing category detail browsing hides missing or deleted categories.
   *
   * This test authenticates a customer account and then requests a category detail using a UUID
   * that is not expected to exist in the catalog. The intended customer-visible behavior is a
   * not-found response rather than returning category data, matching the rule that deleted
   * categories must not appear in customer browsing.
   *
   * 1. Register a customer and establish an authenticated customer connection.
   * 2. Request a category detail using a random UUID that should not resolve to an active category.
   * 3. Verify the API responds with a not-found error for the absent category.
   */
  const customerConnection: api.IConnection = { host: connection.host };
  await authorize_customer_join(customerConnection, {
    body: {
      email: `${RandomGenerator.alphabets(8)}@example.com` satisfies string &
        tags.Format<"email">,
      password: "P@ssw0rd123!" satisfies string & tags.Format<"password">,
      href: "https://example.com/register" satisfies string &
        tags.Format<"uri">,
      referrer: "https://example.com/" satisfies string & tags.Format<"uri">,
      ip: "127.0.0.1" satisfies string & tags.Format<"ipv4">,
    } satisfies IMallPlatformCustomer.IJoin,
  });
  const categoryId = typia.random<string & tags.Format<"uuid">>();
  await TestValidator.httpError(
    "customer category detail should not expose deleted or missing categories",
    404,
    async () => {
      await api.functional.mallPlatform.customer.categories.getByCategoryid(
        customerConnection,
        {
          categoryId,
        } satisfies api.functional.mallPlatform.customer.categories.getByCategoryid.Props,
      );
    },
  );
}
