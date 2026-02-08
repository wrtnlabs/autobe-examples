import api from "@ORGANIZATION/PROJECT-api";
import type { IConnection } from "@nestia/fetcher";
import { RandomGenerator, TestValidator } from "@nestia/e2e";
import typia, { tags } from "typia";

import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { generate_random_shopping_mall_seller_sales_create } from "../../../generate/generate_random_shopping_mall_seller_sales_create";

export async function test_api_seller_sales_update_logical_deletion_rejection(
  connection: api.IConnection,
): Promise<void> {
  // 1. Seller registration and login
  const sellerConnection: api.IConnection = { host: connection.host };
  const sellerAuth = await authorize_seller_join(sellerConnection, {
    body: {},
  });
  typia.assert(sellerAuth);
  sellerConnection.headers = {
    Authorization: `Bearer ${sellerAuth.token.access}`,
  };

  // 2. Seller creates a new sale listing
  const createdSale = await generate_random_shopping_mall_seller_sales_create(
    sellerConnection,
    {},
  );
  typia.assert(createdSale);

  // 3. Seller updates the sale listing successfully
  // Prepare update body
  const updateBody = {
    name: RandomGenerator.paragraph({ sentences: 2 }),
    description: RandomGenerator.content({ paragraphs: 1 }),
    base_price: typia.random<number & tags.Type<"uint32"> & tags.Minimum<1>>(),
    status: "active",
  };

  // Since createdSale.id does not exist on type, cast as any
  const saleId = (createdSale as any).id as string;

  const updatedSale = await api.functional.shoppingMall.seller.sales.update(
    sellerConnection,
    {
      saleId,
      body: updateBody,
    },
  );
  typia.assert(updatedSale);

  // 4. Logical deletion simulation
  const saleToDelete = await generate_random_shopping_mall_seller_sales_create(
    sellerConnection,
    {},
  );
  typia.assert(saleToDelete);

  const saleToDeleteId = (saleToDelete as any).id as string;

  const updateBodyDeleted = {
    name: RandomGenerator.paragraph({ sentences: 1 }),
    description: RandomGenerator.content({ paragraphs: 1 }),
    base_price: typia.random<number & tags.Type<"uint32"> & tags.Minimum<1>>(),
    status: "inactive",
  };

  await TestValidator.error(
    "update logically deleted sale throws",
    async () => {
      await api.functional.shoppingMall.seller.sales.update(sellerConnection, {
        saleId: saleToDeleteId,
        body: updateBodyDeleted,
      });
    },
  );
}
