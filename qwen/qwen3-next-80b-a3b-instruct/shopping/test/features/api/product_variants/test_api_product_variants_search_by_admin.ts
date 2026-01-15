import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";
import api from "@ORGANIZATION/PROJECT-api";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallProductVariant";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductImage";
import type { IShoppingMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariant";
import type { IShoppingMallProductVariantAttributeSummary } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariantAttributeSummary";
import type { IShoppingMallProductVariantIRequestIAttributes } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariantIRequestIAttributes";
import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";
export async function test_api_product_variants_search_by_admin(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Authenticate as administrator using the utility function
  const adminConnection: api.IConnection = { host: connection.host };
  const admin: IShoppingMallAdmin.IAuthorized = await authorize_admin_join(
    adminConnection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(16),
        href: "https://example.com/admin/join",
        referrer: "https://example.com/admin/signup",
      } satisfies IShoppingMallAdmin.IJoin,
    },
  );
  typia.assert(admin);
  // Step 2: Create search request with filtering criteria
  const searchRequest: IShoppingMallProductVariant.IRequest = {
    page: 1,
    limit: 10,
    price_min: 100,
    price_max: 1000,
    availability: "available",
    attributes: "color:red,size:large", // Correct: string type per schema, format example from system design
    search: "product",
  } satisfies IShoppingMallProductVariant.IRequest;
  // Step 3: Call the admin product variants search endpoint with adminConnection
  const response: IPageIShoppingMallProductVariant.ISummary =
    await api.functional.shoppingMall.admin.products.skus.index(
      adminConnection,
      {
        body: searchRequest,
      },
    );
  typia.assert(response);
  // Step 4: Validate pagination structure
  TestValidator.equals(
    "pagination current page is 1",
    response.pagination.current,
    1,
  );
  TestValidator.equals("pagination limit is 10", response.pagination.limit, 10);
  TestValidator.predicate(
    "pagination records is positive",
    response.pagination.records > 0,
  );
  TestValidator.predicate(
    "pagination pages is positive",
    response.pagination.pages > 0,
  );
  // Step 5: Validate that data array contains items
  TestValidator.predicate("data array is not empty", response.data.length > 0);
  // Step 6: Validate that all returned variants match search criteria
  for (const variant of response.data) {
    // Verify price is within range
    TestValidator.predicate(
      "variant price is within range",
      variant.price >= 100 && variant.price <= 1000,
    );
    // Verify availability status is 'available'
    TestValidator.equals(
      "variant availability status is available",
      variant.availability_status,
      "available",
    );
    // Verify inventory level is positive (for 'available')
    TestValidator.predicate(
      "variant inventory level is positive",
      variant.inventory_level > 0,
    );
    // Verify name contains search term
    if (searchRequest.search) {
      TestValidator.predicate(
        "variant name contains search term",
        variant.name.toLowerCase().includes(searchRequest.search.toLowerCase()),
      );
    }
    // Verify variation_attributes have correct structure
    TestValidator.predicate(
      "variation_attributes is an array",
      Array.isArray(variant.variation_attributes),
    );
    for (const attr of variant.variation_attributes) {
      TestValidator.predicate(
        "each attribute has string representation",
        typeof attr === "string",
      );
    }
    // Verify images have correct structure
    TestValidator.predicate(
      "images is an array",
      Array.isArray(variant.images),
    );
    for (const image of variant.images) {
      TestValidator.equals("image id is uuid", typeof image.id, "string");
      TestValidator.equals("image url is uri", typeof image.url, "string");
      TestValidator.equals("image name is string", typeof image.name, "string");
      TestValidator.equals(
        "image extension is string",
        typeof image.extension,
        "string",
      );
      TestValidator.predicate(
        "image order is integer",
        Number.isInteger(image.order),
      );
      TestValidator.equals(
        "image is_primary is boolean",
        typeof image.is_primary,
        "boolean",
      );
      TestValidator.equals(
        "image created_at is date-time",
        typeof image.created_at,
        "string",
      );
    }
  }
}
