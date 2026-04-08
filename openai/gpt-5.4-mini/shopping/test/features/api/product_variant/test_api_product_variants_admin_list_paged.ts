import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IMallPlatformAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformAdministrator";
import type { IMallPlatformCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformCategory";
import type { IMallPlatformProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformProduct";
import type { IMallPlatformProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformProductImage";
import type { IMallPlatformProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformProductVariant";
import type { IMallPlatformSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformSeller";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIMallPlatformProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIMallPlatformProductVariant";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_administrator_join } from "../../../authorize/authorize_administrator_join";
import { authorize_administrator_login } from "../../../authorize/authorize_administrator_login";
import { authorize_administrator_refresh } from "../../../authorize/authorize_administrator_refresh";

export async function test_api_product_variants_admin_list_paged(
  connection: api.IConnection,
): Promise<void> {
  /**
   * Validate administrator access and pagination shape for product variant listing.
   *
   * Verifies that the administrator-scoped variant listing endpoint accepts a
   * valid authenticated administrator connection and returns a paginated summary
   * payload for a product-scoped variant query.
   *
   * Because the available test environment does not expose product creation
   * utilities for assembling a multi-variant fixture, this test focuses on the
   * supported contract-level behavior: authenticated access, request acceptance,
   * and the structural integrity of the paginated response.
   *
   * 1. Authenticate as an administrator using the provided utility function.
   * 2. Call the product variant listing endpoint with a valid UUID product id.
   * 3. Validate the pagination container and returned summary list structure.
   */
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_administrator_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "Admin1234!",
    } satisfies IMallPlatformAdministrator.IJoin,
  });
  const output =
    await api.functional.mallPlatform.administrator.products.variants.index(
      adminConnection,
      {
        productId: typia.random<string & tags.Format<"uuid">>(),
        body: {
          page: 1,
          limit: 10,
        } satisfies IMallPlatformProductVariant.IRequest,
      },
    );
  typia.assert(output);
  TestValidator.predicate(
    "pagination current page is valid",
    output.pagination.current >= 0,
  );
  TestValidator.predicate(
    "pagination limit is valid",
    output.pagination.limit >= 0,
  );
  TestValidator.predicate(
    "pagination records is non-negative",
    output.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination pages is non-negative",
    output.pagination.pages >= 0,
  );
  TestValidator.predicate(
    "variant summaries array is present",
    Array.isArray(output.data),
  );
  TestValidator.predicate(
    "each returned record is a variant summary",
    output.data.every(
      (item) =>
        typeof item.id === "string" &&
        typeof item.skuCode === "string" &&
        typeof item.optionValues === "string" &&
        typeof item.priceOverride !== "undefined" &&
        typeof item.isActive === "boolean" &&
        typeof item.createdAt === "string" &&
        typeof item.updatedAt === "string" &&
        (item.deletedAt === null || typeof item.deletedAt === "string") &&
        typeof item.product.id === "string" &&
        typeof item.product.name === "string" &&
        typeof item.product.description === "string" &&
        typeof item.product.basePrice === "number",
    ),
  );
}
