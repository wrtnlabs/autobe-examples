import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";
import api from "@ORGANIZATION/PROJECT-api";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import type { IShoppingMallProductQuestion } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductQuestion";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import type { IShoppingMallSellerBillingAddress } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerBillingAddress";
import type { IShoppingMallSellerOnboardingProgress } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerOnboardingProgress";
import type { IShoppingMallSellerPayoutSettings } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerPayoutSettings";
import type { IShoppingMallSellerPerformanceMetrics } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerPerformanceMetrics";
import type { IShoppingMallSellerSocialMediaHandles } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerSocialMediaHandles";
import { prepare_random_shopping_mall_product_question } from "../../../prepare/prepare_random_shopping_mall_product_question";
import { prepare_random_shopping_mall_product } from "../../../prepare/prepare_random_shopping_mall_product";
import { generate_random_shopping_mall_customer_products_questions_create } from "../../../generate/generate_random_shopping_mall_customer_products_questions_create";
import { generate_random_shopping_mall_seller_products_create } from "../../../generate/generate_random_shopping_mall_seller_products_create";
import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";
export async function test_api_product_question_admin_retrieval(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Create admin connection and authenticate admin
  const adminConnection: api.IConnection = { host: connection.host };
  const adminJoinInput = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(16),
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  };
  await authorize_admin_join(adminConnection, { body: adminJoinInput });
  await authorize_admin_login(adminConnection, { body: adminJoinInput });
  // Step 2: Create seller connection and authenticate seller
  const sellerConnection: api.IConnection = { host: connection.host };
  const sellerJoinInput = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(16),
    business_name: RandomGenerator.name(),
    contact_phone: RandomGenerator.mobile(),
    createdAt: new Date().toISOString(),
  };
  await authorize_member_join(sellerConnection, { body: sellerJoinInput });
  await authorize_member_login(sellerConnection, { body: sellerJoinInput });
  // Step 3: Create customer connection and authenticate customer
  const customerConnection: api.IConnection = { host: connection.host };
  // Update customerJoinInput to match required IJoin interface
  const customerJoinInput = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(16),
    business_name: RandomGenerator.name(),
    contact_phone: RandomGenerator.mobile(),
    createdAt: new Date().toISOString(),
  };
  await authorize_member_join(customerConnection, { body: customerJoinInput });
  await authorize_member_login(customerConnection, { body: customerJoinInput });
  // Step 4: Create product as seller
  const product = await generate_random_shopping_mall_seller_products_create(
    sellerConnection,
    {
      body: {
        title: RandomGenerator.paragraph({ sentences: 3 }),
        description: RandomGenerator.content({ paragraphs: 2 }),
        price: typia.random<
          number & tags.Minimum<0.01> & tags.Maximum<10000>
        >(),
        sku: RandomGenerator.alphaNumeric(10),
        images: [
          typia.random<string & tags.Format<"uri">>(),
          typia.random<string & tags.Format<"uri">>(),
        ],
      },
    },
  );
  typia.assert(product);
  // Step 5: Create product question as customer
  const question =
    await generate_random_shopping_mall_customer_products_questions_create(
      customerConnection,
      {
        body: {
          question: RandomGenerator.paragraph({ sentences: 2 }),
        },
        params: {
          productId: product.id,
        },
      },
    );
  typia.assert(question);
  // Step 6: Retrieve product question as admin
  const retrievedQuestion =
    await api.functional.shoppingMall.admin.products.questions.at(
      adminConnection,
      {
        productId: product.id,
        questionId: question.id,
      },
    );
  typia.assert(retrievedQuestion);
  // Validate retrieved question matches created question
  // Only validate basic information that is guaranteed to be identical
  TestValidator.equals(
    "retrieved question ID matches",
    retrievedQuestion.id,
    question.id,
  );
  TestValidator.equals(
    "retrieved question product ID matches",
    retrievedQuestion.productId,
    product.id,
  );
  TestValidator.equals(
    "retrieved question content matches",
    retrievedQuestion.question,
    question.question,
  );
}