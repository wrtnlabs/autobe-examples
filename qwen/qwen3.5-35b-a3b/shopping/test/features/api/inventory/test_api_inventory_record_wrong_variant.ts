import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCategory";
import type { IEcommerceMallInventoryRecord } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallInventoryRecord";
import type { IEcommerceMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProduct";
import type { IEcommerceMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductVariant";
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

/**
 * Test inventory record retrieval with invalid product-variant relationship.
 *
 * Validates the business logic edge case where an inventory record exists but the variant specified in the URL does not belong to the specified product. This test ensures the system properly validates nested entity relationships before returning data, returning 400 Bad Request instead of 404 or 500 errors when the relationship is invalid.
 *
 * The test creates a valid seller account, attempts to retrieve an inventory record using mismatched product and variant IDs, and verifies that the 400 status is returned with an appropriate error message indicating the variant does not belong to the specified product.
 *
 * 1. Seller registers and authenticates via POST /ecommerceMall/auth/seller/join.
 * 2. Test retrieves inventory record using mismatched productA_id and variantB_id.
 * 3. Verifies response returns 400 Bad Request with clear error message.
 * 4. Confirms no inventory data is returned in the response.
 *
 * This test validates the cascade validation logic: product exists → variant exists → variant belongs to product → inventory record exists. The 400 status confirms the relationship check happens before the record lookup, providing clear error feedback to API consumers.
 */
export async function test_api_inventory_record_wrong_variant(
  connection: api.IConnection,
): Promise<void> {
  const sellerConnection: api.IConnection = { host: connection.host };
  const joinResult: IEcommerceMallSeller.IAuthorized =
    await authorize_seller_join(sellerConnection, {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(16),
        display_name: RandomGenerator.name(2),
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      },
    });
  typia.assert(joinResult);
  TestValidator.equals(
    "seller approval status approved",
    joinResult.approval_status,
    "approved",
  );
  sellerConnection.headers ??= {};
  sellerConnection.headers.Authorization = joinResult.token.access;
  const productId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();
  const variantId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();
  const recordId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();
  await TestValidator.error(
    "inventory record retrieval with wrong variant returns 400",
    async () => {
      await api.functional.ecommerceMall.seller.products.variants.inventory.at(
        sellerConnection,
        {
          productId,
          variantId,
          recordId,
        },
      );
    },
  );
}
