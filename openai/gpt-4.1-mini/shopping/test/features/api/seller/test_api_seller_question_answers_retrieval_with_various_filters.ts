import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallSaleQuestionAnswer } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallSaleQuestionAnswer";
import type { IShoppingMallProductCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductCategory";
import type { IShoppingMallSale } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSale";
import type { IShoppingMallSaleQuestionAnswer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSaleQuestionAnswer";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";
import { generate_random_shopping_mall_seller_sales_create } from "../../../generate/generate_random_shopping_mall_seller_sales_create";
import { prepare_random_shopping_mall_sale } from "../../../prepare/prepare_random_shopping_mall_sale";

export async function test_api_seller_question_answers_retrieval_with_various_filters(
  connection: api.IConnection,
): Promise<void> {
  // 1. Seller joins and logs in
  const sellerConnection: api.IConnection = { host: connection.host };
  const sellerAuthorized = await authorize_seller_join(sellerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "seller_password",
      shopName: RandomGenerator.name(1),
      shopDescription: null,
      logoUri: null,
    },
  });
  typia.assert(sellerAuthorized);
  sellerConnection.headers = { Authorization: sellerAuthorized.token.access };
  // 2. Seller creates a product category implicitly by generating a sale - but since no direct category API provided, assume random category id
  // Use a fixed UUID for category that might be valid, or generate a random UUID
  const category_id = typia.random<string & tags.Format<"uuid">>();
  // 3. Seller creates a sale
  const sale = await generate_random_shopping_mall_seller_sales_create(
    sellerConnection,
    {
      body: {
        category_id: category_id,
        name: RandomGenerator.name(2),
        description: RandomGenerator.paragraph({ sentences: 3 }),
        base_price: typia.random<
          number & tags.Type<"double"> & tags.Minimum<1>
        >(),
      },
    },
  );
  typia.assert(sale);
  // 4. Scenario 1
  // Retrieve seller answers for that sale without filters
  const page1 =
    await api.functional.shoppingMall.seller.sales.question_answers.index(
      sellerConnection,
      {
        saleId: sale.id,
        body: {
          title: null,
          body: null,
          sellerId: null,
          createdAtFrom: null,
          createdAtTo: null,
          updatedAtFrom: null,
          updatedAtTo: null,
          page: 1,
          limit: 10,
        },
      },
    );
  typia.assert(page1);
  for (const ans of page1.data) {
    // Validate soft-deleted answers excluded
    TestValidator.predicate("answer not soft deleted", ans.deletedAt === null);
    // Validate seller can only access their own sale's answers
    TestValidator.equals(
      "sellerId matches authorized seller id",
      ans.seller.id,
      sellerAuthorized.id,
    );
  }
  // 5. Scenario 2
  // Search filters: by title keyword
  const titleKeyword = RandomGenerator.substring(
    page1.data.length > 0 ? page1.data[0].title : "default title",
  );
  const filteredByTitle =
    await api.functional.shoppingMall.seller.sales.question_answers.index(
      sellerConnection,
      {
        saleId: sale.id,
        body: {
          title: titleKeyword || null,
          body: null,
          sellerId: null,
          createdAtFrom: null,
          createdAtTo: null,
          updatedAtFrom: null,
          updatedAtTo: null,
          page: 1,
          limit: 5,
        },
      },
    );
  typia.assert(filteredByTitle);
  for (const ans of filteredByTitle.data) {
    TestValidator.predicate(
      "filtered title contains keyword",
      ans.title.includes(titleKeyword),
    );
  }
  // Search filters: by body keyword
  const bodyKeyword = RandomGenerator.substring(
    page1.data.length > 0 ? page1.data[0].body : "default body",
  );
  const filteredByBody =
    await api.functional.shoppingMall.seller.sales.question_answers.index(
      sellerConnection,
      {
        saleId: sale.id,
        body: {
          title: null,
          body: bodyKeyword || null,
          sellerId: null,
          createdAtFrom: null,
          createdAtTo: null,
          updatedAtFrom: null,
          updatedAtTo: null,
          page: 1,
          limit: 5,
        },
      },
    );
  typia.assert(filteredByBody);
  for (const ans of filteredByBody.data) {
    TestValidator.predicate(
      "filtered body contains keyword",
      ans.body.includes(bodyKeyword),
    );
  }
  // Search filters: by createdAtFrom and createdAtTo date range
  // Use current date for example
  const now = new Date();
  const fromDate = new Date(now.getTime() - 24 * 3600 * 1000).toISOString();
  const toDate = now.toISOString();
  const filteredByCreatedAt =
    await api.functional.shoppingMall.seller.sales.question_answers.index(
      sellerConnection,
      {
        saleId: sale.id,
        body: {
          title: null,
          body: null,
          sellerId: null,
          createdAtFrom: fromDate,
          createdAtTo: toDate,
          updatedAtFrom: null,
          updatedAtTo: null,
          page: 1,
          limit: 10,
        },
      },
    );
  typia.assert(filteredByCreatedAt);
  for (const ans of filteredByCreatedAt.data) {
    TestValidator.predicate(
      "createdAt in date range",
      ans.createdAt >= fromDate && ans.createdAt <= toDate,
    );
  }
  // Search filters: by sellerId (own seller id)
  const filteredBySellerId =
    await api.functional.shoppingMall.seller.sales.question_answers.index(
      sellerConnection,
      {
        saleId: sale.id,
        body: {
          title: null,
          body: null,
          sellerId: sellerAuthorized.id,
          createdAtFrom: null,
          createdAtTo: null,
          updatedAtFrom: null,
          updatedAtTo: null,
          page: 1,
          limit: 10,
        },
      },
    );
  typia.assert(filteredBySellerId);
  for (const ans of filteredBySellerId.data) {
    TestValidator.equals(
      "sellerId matches filtered seller id",
      ans.seller.id,
      sellerAuthorized.id,
    );
  }
  // Validate pagination count
  TestValidator.predicate(
    "pagination count valid",
    filteredBySellerId.pagination.current === 1 &&
      filteredBySellerId.pagination.limit === 10 &&
      filteredBySellerId.pagination.records >= 0 &&
      filteredBySellerId.pagination.pages >= 0,
  );
  // 6. Scenario 3
  // Attempt access another seller's sale answers
  const otherSellerConnection: api.IConnection = { host: connection.host };
  const otherSellerAuthorized = await authorize_seller_join(
    otherSellerConnection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: "seller_password2",
        shopName: RandomGenerator.name(1),
        shopDescription: null,
        logoUri: null,
      },
    },
  );
  typia.assert(otherSellerAuthorized);
  otherSellerConnection.headers = {
    Authorization: otherSellerAuthorized.token.access,
  };
  await TestValidator.error(
    "access denied for other seller's sale question answers",
    async () => {
      await api.functional.shoppingMall.seller.sales.question_answers.index(
        otherSellerConnection,
        {
          saleId: sale.id, // this sale is of sellerAuthorized, not otherSellerAuthorized
          body: {
            title: null,
            body: null,
            sellerId: null,
            createdAtFrom: null,
            createdAtTo: null,
            updatedAtFrom: null,
            updatedAtTo: null,
            page: 1,
            limit: 10,
          },
        },
      );
    },
  );
}
