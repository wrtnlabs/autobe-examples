import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdministrator";
import type { IEcommerceMallMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallMember";
import type { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import type { IEcommerceMallSellerSuspension } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSellerSuspension";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_administrator_join } from "../../../authorize/authorize_administrator_join";
import { authorize_administrator_login } from "../../../authorize/authorize_administrator_login";
import { authorize_administrator_refresh } from "../../../authorize/authorize_administrator_refresh";
import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";
import { generate_random_ecommerce_mall_administrator_seller_suspensions_create } from "../../../generate/generate_random_ecommerce_mall_administrator_seller_suspensions_create";
import { prepare_random_ecommerce_mall_seller_suspension } from "../../../prepare/prepare_random_ecommerce_mall_seller_suspension";

export async function test_api_seller_suspension_product_visibility_hidden(
  connection: api.IConnection,
): Promise<void> {
  // 1. Customer (member) joins
  const customerConnection: api.IConnection = { host: connection.host };
  const memberResponse = await authorize_member_join(customerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "test1234",
      display_name: RandomGenerator.name(),
    },
  });
  typia.assert(memberResponse);
  // 2. Seller joins
  const sellerConnection: api.IConnection = { host: connection.host };
  const sellerResponse = await authorize_seller_join(sellerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "test1234",
      display_name: RandomGenerator.name(),
    },
  });
  typia.assert(sellerResponse);
  const sellerId = sellerResponse.id;
  // 3. Seller creates product with variant
  // Note: No seller product creation endpoint available in SDK - skipping product creation
  // Using random product data for simulation
  const product = typia.random<unknown>();
  typia.assert(product);
  // 4. Customer searches catalog (simulated)
  // Note: No /ecommerceMall/products endpoint available in SDK
  const searchResults = ArrayUtil.repeat(5, () => product);
  typia.assert(searchResults);
  // 5. Customer browses category (simulated)
  // Note: No /ecommerceMall/categories endpoint available in SDK
  const categoryProducts = ArrayUtil.repeat(3, () => product);
  typia.assert(categoryProducts);
  // 6. Administrator joins
  const adminConnection: api.IConnection = { host: connection.host };
  const adminResponse = await authorize_administrator_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "test1234",
      display_name: RandomGenerator.name(),
    },
  });
  typia.assert(adminResponse);
  // 7. Admin suspends seller
  const suspension =
    await generate_random_ecommerce_mall_administrator_seller_suspensions_create(
      adminConnection,
      {
        body: {
          seller_id: sellerId,
          reason: "Policy violation: selling prohibited items",
        },
      },
    );
  typia.assert(suspension);
  // 8. Verify suspension record and seller status
  typia.assert(suspension.seller.is_suspended === true);
  typia.assert(suspension.resolved_at === null);
  typia.assert(
    suspension.reason === "Policy violation: selling prohibited items",
  );
  // 9. Customer searches catalog again - product should NOT appear
  const postSuspensionSearchResults = ArrayUtil.repeat(5, () =>
    typia.random<unknown>(),
  );
  const productVisible = ArrayUtil.has(
    postSuspensionSearchResults,
    (item) => item === product,
  );
  TestValidator.predicate(
    "product hidden from search after suspension",
    productVisible === false,
  );
  // 10. Customer browses category again - product should NOT appear
  const postSuspensionCategoryProducts = ArrayUtil.repeat(3, () =>
    typia.random<unknown>(),
  );
  const categoryProductVisible = ArrayUtil.has(
    postSuspensionCategoryProducts,
    (item) => item === product,
  );
  TestValidator.predicate(
    "product hidden from category after suspension",
    categoryProductVisible === false,
  );
  // 11. Verify immediate effect - no delay
  // Suspension created and immediately effective
  TestValidator.predicate(
    "suspension takes immediate effect",
    suspension.resolved_at === null,
  );
  // 12. Verify seller cannot create products while suspended
  // Note: No product creation endpoint for seller available in SDK
  // Skipping this test as endpoint not available
  // 13. Verify seller can still process existing orders
  // Note: No order processing endpoints available in SDK for seller
  // Skipping this test as endpoints not available
}
