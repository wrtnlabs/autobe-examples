import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallSaleQuestion } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallSaleQuestion";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallProductCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductCategory";
import type { IShoppingMallSale } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSale";
import type { IShoppingMallSaleQuestion } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSaleQuestion";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_customer_join } from "../../../authorize/authorize_customer_join";
import { authorize_customer_login } from "../../../authorize/authorize_customer_login";
import { authorize_customer_refresh } from "../../../authorize/authorize_customer_refresh";
import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";
import { generate_random_shopping_mall_seller_sales_create } from "../../../generate/generate_random_shopping_mall_seller_sales_create";
import { prepare_random_shopping_mall_sale } from "../../../prepare/prepare_random_shopping_mall_sale";

export async function test_api_customer_sales_questions_listing_successful(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Seller registration and login
  const sellerConnection: api.IConnection = { host: connection.host };
  const sellerJoinBody: Partial<IShoppingMallSeller.IJoin> = {
    email: typia.random<string & tags.Format<"email">>(),
    password: "StrongPass1234",
    shopName: RandomGenerator.name(1),
    shopDescription: null,
    logoUri: null,
  };
  const sellerAuthorized = await authorize_seller_join(sellerConnection, {
    body: sellerJoinBody,
  });
  typia.assert(sellerAuthorized);
  // Step 2: Seller creates a sale listing
  const sale = await generate_random_shopping_mall_seller_sales_create(
    sellerConnection,
    { body: undefined },
  );
  typia.assert(sale);
  // Step 3: Customer registration and login
  const customerConnection: api.IConnection = { host: connection.host };
  const customerJoinBody: Partial<IShoppingMallCustomer.IJoin> = {
    email: typia.random<string & tags.Format<"email">>(),
    password: "SecurePass1234",
  };
  const customerAuthorized = await authorize_customer_join(customerConnection, {
    body: customerJoinBody,
  });
  typia.assert(customerAuthorized);
  // Step 4: Customer queries questions for the sale
  // Use basic pagination with page 1 and limit 10, no filters set
  const requestBody: IShoppingMallSaleQuestion.IRequest = {
    page: 1,
    limit: 10,
    status: undefined,
    createdAtFrom: null,
    createdAtTo: null,
    updatedAtFrom: null,
    updatedAtTo: null,
    search: undefined,
  };
  const questionsPage =
    await api.functional.shoppingMall.customer.sales.questions.index(
      customerConnection,
      {
        saleId: sale.id,
        body: requestBody,
      },
    );
  typia.assert(questionsPage);
  // Step 5: Validate pagination metadata consistency
  const { pagination, data } = questionsPage;
  TestValidator.predicate(
    "pagination current page must be 1",
    pagination.current === 1,
  );
  TestValidator.predicate(
    "pagination limit must be 10",
    pagination.limit === 10,
  );
  TestValidator.predicate(
    "pagination records count must be >= data length",
    pagination.records >= data.length,
  );
  TestValidator.predicate(
    "pagination pages must cover records with given limit",
    pagination.pages ===
      (pagination.records === 0
        ? 0
        : Math.ceil(pagination.records / pagination.limit)),
  );
  // Step 6: Validate each question relates to the sale and not deleted
  for (const question of data) {
    typia.assert(question);
    TestValidator.equals("question sale id matches", question.sale.id, sale.id);
    TestValidator.predicate(
      "question deletedAt is null",
      question.deletedAt === null,
    );
  }
}
