import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceModificationInventoryRestoration } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceModificationInventoryRestoration";
import type { IEcommerceSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceSeller";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEcommerceModificationInventoryRestoration } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceModificationInventoryRestoration";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";

export async function test_api_seller_inventory_restorations_list_all(
  connection: api.IConnection,
): Promise<void> {
  // Create seller-specific connection
  const sellerConnection: api.IConnection = { host: connection.host };
  // Authenticate seller via join
  await authorize_seller_join(sellerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      shop_name: RandomGenerator.name(),
      shop_description: RandomGenerator.paragraph({ sentences: 2 }),
      logo_image_url: typia.random<string & tags.Format<"uri">>(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IEcommerceSeller.IJoin,
  });
  // Call inventory restoration list endpoint with empty request (no filtering)
  const response =
    await api.functional.ecommerce.seller.modification_inventory_restorations.index(
      sellerConnection,
      {
        body: {} satisfies IEcommerceModificationInventoryRestoration.IRequest,
      },
    );
  // Validate response structure - typia.assert performs complete validation
  typia.assert(response);
  // Validate pagination metadata structure
  TestValidator.equals(
    "pagination has current page",
    response.pagination.current >= 0,
    true,
  );
  TestValidator.equals(
    "pagination has valid limit",
    response.pagination.limit >= 1,
    true,
  );
  TestValidator.equals(
    "pagination has records count",
    response.pagination.records >= 0,
    true,
  );
  TestValidator.equals(
    "pagination has pages count",
    response.pagination.pages >= 0,
    true,
  );
  // Validate data array structure
  TestValidator.equals("data is array", Array.isArray(response.data), true);
  // Validate pagination calculation
  TestValidator.equals(
    "pages calculation matches records and limit",
    response.pagination.pages,
    Math.ceil(response.pagination.records / response.pagination.limit),
  );
}
