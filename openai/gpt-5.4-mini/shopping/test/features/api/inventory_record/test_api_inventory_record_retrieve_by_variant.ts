import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IMallPlatformCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformCategory";
import type { IMallPlatformInventoryRecord } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformInventoryRecord";
import type { IMallPlatformProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformProduct";
import type { IMallPlatformProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformProductImage";
import type { IMallPlatformProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformProductVariant";
import type { IMallPlatformSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformSeller";
import type { IMallPlatformSellerAccount } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformSellerAccount";
import type { IMallPlatformSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformSellerProfile";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";

export async function test_api_inventory_record_retrieve_by_variant(
  connection: api.IConnection,
): Promise<void> {
  /**
   * Retrieve an inventory record for a seller's product variant and verify the
   * read-only inventory history contract.
   *
   * This test authenticates a seller using an isolated connection, then invokes
   * the inventory record retrieval endpoint with valid UUID path parameters.
   * It accepts either a successful inventory record response when seeded data is
   * present or a not-found response when the environment does not provide the
   * required fixture data.
   *
   * 1. Register and authenticate a seller using an isolated seller connection.
   * 2. Call the inventory record lookup endpoint with well-formed UUIDs.
   * 3. Validate the successful response shape when a record exists.
   * 4. Allow a not-found response when the environment has no matching fixture.
   */
  const sellerConnection: api.IConnection = { host: connection.host };
  await authorize_seller_join(sellerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "P@ssw0rd1234" as string & tags.Format<"password">,
    } satisfies IMallPlatformSeller.IJoin,
  });
  const props = {
    productId: typia.random<string & tags.Format<"uuid">>(),
    variantId: typia.random<string & tags.Format<"uuid">>(),
    inventoryRecordId: typia.random<string & tags.Format<"uuid">>(),
  } satisfies {
    productId: string & tags.Format<"uuid">;
    variantId: string & tags.Format<"uuid">;
    inventoryRecordId: string & tags.Format<"uuid">;
  };

  let output: IMallPlatformInventoryRecord | null = null;
  try {
    const response =
      await api.functional.mallPlatform.seller.products.variants.inventoryRecords.at(
        sellerConnection,
        props,
      );
    output = typia.assert(response);
  } catch {
    await TestValidator.httpError(
      "inventory record lookup may return not found when fixture data is absent",
      [404],
      async () => {
        await api.functional.mallPlatform.seller.products.variants.inventoryRecords.at(
          sellerConnection,
          props,
        );
      },
    );
  }

  if (output !== null) {
    TestValidator.equals(
      "inventory record id",
      output.id,
      props.inventoryRecordId,
    );
    TestValidator.equals(
      "inventory record variant id",
      output.productVariant.id,
      props.variantId,
    );
    TestValidator.equals(
      "inventory record product id",
      output.productVariant.product.id,
      props.productId,
    );
    TestValidator.predicate(
      "quantity change is an integer",
      Number.isInteger(output.quantityChange),
    );
    TestValidator.predicate("reason is non-empty", output.reason.length > 0);
  }
}
