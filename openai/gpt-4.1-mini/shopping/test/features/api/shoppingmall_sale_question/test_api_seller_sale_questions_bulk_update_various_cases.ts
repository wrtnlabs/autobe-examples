import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
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
import { generate_random_shopping_mall_customer_sales_questions_create_question } from "../../../generate/generate_random_shopping_mall_customer_sales_questions_create_question";
import { generate_random_shopping_mall_seller_sales_create } from "../../../generate/generate_random_shopping_mall_seller_sales_create";
import { prepare_random_shopping_mall_sale } from "../../../prepare/prepare_random_shopping_mall_sale";
import { prepare_random_shopping_mall_sale_question } from "../../../prepare/prepare_random_shopping_mall_sale_question";

export async function test_api_seller_sale_questions_bulk_update_various_cases(
  connection: api.IConnection,
): Promise<void> {
  // Scenario 1: Successful bulk update of multiple sale questions by an authorized seller.
  {
    // Seller join and login
    const sellerConnection: api.IConnection = { host: connection.host };
    const sellerAuth = await authorize_seller_join(sellerConnection, {
      body: {},
    });
    typia.assert(sellerAuth);
    // Create a sale listing for the seller
    const sale = await generate_random_shopping_mall_seller_sales_create(
      sellerConnection,
      { body: {} },
    );
    typia.assert(sale);
    // Create a customer who will ask questions
    const customerConnection: api.IConnection = { host: connection.host };
    const customerAuth = await authorize_customer_join(customerConnection, {
      body: {},
    });
    typia.assert(customerAuth);
    // Create multiple questions by the customer on the sale
    const questionCount = 3;
    const questions = await Promise.all(
      ArrayUtil.repeat(questionCount, async () =>
        generate_random_shopping_mall_customer_sales_questions_create_question(
          customerConnection,
          {
            params: { saleId: sale.id },
            body: {},
          },
        ),
      ),
    );
    // Prepare bulk update entries with new statuses and some answer bodies
    const bulkUpdateEntries = questions.map((q, i) => ({
      id: q.id,
      status: "answered",
      title: q.title,
      body: `Answer to: ${q.body}`,
    }));
    // Perform bulk update
    const updated =
      await api.functional.shoppingMall.seller.sales.questions.bulk_update.bulkUpdate(
        sellerConnection,
        {
          body: { updates: bulkUpdateEntries },
        },
      );
    typia.assert(updated);
    // Validate all updated questions have expected status and updated fields
    for (const update of bulkUpdateEntries) {
      TestValidator.predicate(
        `Question id ${update.id} status updated to answered`,
        updated.id === update.id ? updated.status === "answered" : true,
      );
    }
  }
  // Scenario 2: Partial failure due to invalid question IDs
  {
    // Seller join and login
    const sellerConnection: api.IConnection = { host: connection.host };
    const sellerAuth = await authorize_seller_join(sellerConnection, {
      body: {},
    });
    typia.assert(sellerAuth);
    // Create a sale listing
    const sale = await generate_random_shopping_mall_seller_sales_create(
      sellerConnection,
      { body: {} },
    );
    typia.assert(sale);
    // Create a customer
    const customerConnection: api.IConnection = { host: connection.host };
    const customerAuth = await authorize_customer_join(customerConnection, {
      body: {},
    });
    typia.assert(customerAuth);
    // Create some questions
    const questions = await Promise.all(
      ArrayUtil.repeat(2, async () =>
        generate_random_shopping_mall_customer_sales_questions_create_question(
          customerConnection,
          {
            params: { saleId: sale.id },
            body: {},
          },
        ),
      ),
    );
    // Include an invalid question id
    const invalidId = typia.random<string & tags.Format<"uuid">>();
    const bulkUpdateEntries = [
      ...questions.map((q) => ({ id: q.id, status: "answered" })),
      {
        id: invalidId,
        status: "answered",
        title: "Invalid",
        body: "Invalid question",
      },
    ];
    // Attempt bulk update, expect partial failure
    await TestValidator.error(
      "Bulk update with invalid question IDs should fail partially",
      async () => {
        await api.functional.shoppingMall.seller.sales.questions.bulk_update.bulkUpdate(
          sellerConnection,
          {
            body: { updates: bulkUpdateEntries },
          },
        );
      },
    );
  }
  // Scenario 3: Unauthorized access attempts
  {
    // Attempt bulk update without any authentication
    const bulkUpdateEntries: IShoppingMallSaleQuestion.IBulkUpdateEntry[] = [];
    await TestValidator.httpError(
      "Bulk update without auth should be unauthorized",
      401,
      async () => {
        await api.functional.shoppingMall.seller.sales.questions.bulk_update.bulkUpdate(
          connection,
          {
            body: { updates: bulkUpdateEntries },
          },
        );
      },
    );
    // Customer login attempt to bulk update
    const customerConnection2: api.IConnection = { host: connection.host };
    const customerAuth2 = await authorize_customer_join(customerConnection2, {
      body: {},
    });
    typia.assert(customerAuth2);
    await TestValidator.httpError(
      "Customer role bulk update should be forbidden",
      403,
      async () => {
        await api.functional.shoppingMall.seller.sales.questions.bulk_update.bulkUpdate(
          customerConnection2,
          {
            body: { updates: bulkUpdateEntries },
          },
        );
      },
    );
  }
}
