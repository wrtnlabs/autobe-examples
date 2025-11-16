import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallBuyer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallBuyer";
import type { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";
import type { IShoppingMallSale } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSale";
import type { IShoppingMallSaleQuestion } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSaleQuestion";
import type { IShoppingMallSaleQuestionAnswer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSaleQuestionAnswer";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";

/**
 * Test question submission validation for maximum content length constraints.
 *
 * Validates that the Q&A system properly handles questions submitted with
 * content at the maximum allowed lengths (title: 200 characters, body: 2000
 * characters). Ensures that boundary-length content is accepted, stored without
 * truncation, and fully retrievable, confirming the platform can handle
 * comprehensive buyer inquiries while enforcing documented content limits.
 *
 * Test workflow:
 *
 * 1. Admin authenticates and creates a product category
 * 2. Seller authenticates and creates a product sale listing
 * 3. Buyer authenticates to establish session
 * 4. Submit question with maximum-length title (200 chars) and body (2000 chars)
 * 5. Validate successful creation with complete content preservation
 * 6. Verify no truncation occurred in title or body
 * 7. Confirm character counts match maximum allowed lengths
 * 8. Ensure proper associations with sale and buyer
 */
export async function test_api_buyer_question_submission_with_maximum_content_length(
  connection: api.IConnection,
) {
  // Step 1: Admin authenticates and creates product category
  const adminData = {
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.Format<"password">>(),
    full_name: RandomGenerator.name(),
    phone_number: RandomGenerator.mobile(),
    admin_level: "super_admin" as const,
    email_verified: true,
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies IShoppingMallAdmin.ICreate;

  const admin: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, { body: adminData });
  typia.assert(admin);

  // Create product category
  const categoryData = {
    parent_id: null,
    name: RandomGenerator.name(2),
    slug: RandomGenerator.alphaNumeric(8),
    description: RandomGenerator.paragraph({ sentences: 5 }),
    image_url: typia.random<string & tags.Format<"uri">>(),
    display_order: typia.random<number & tags.Type<"int32">>(),
    status: "active" as const,
  } satisfies IShoppingMallCategory.ICreate;

  const category: IShoppingMallCategory =
    await api.functional.shoppingMall.admin.categories.create(connection, {
      body: categoryData,
    });
  typia.assert(category);

  // Step 2: Seller authenticates and creates product sale
  const sellerData = {
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.MinLength<8>>(),
    full_name: RandomGenerator.name(),
    phone_number: RandomGenerator.mobile(),
    business_name: RandomGenerator.name(3),
    business_description: RandomGenerator.paragraph({ sentences: 10 }),
    store_name: RandomGenerator.name(2),
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies IShoppingMallSeller.ICreate;

  const seller: IShoppingMallSeller.IAuthorized =
    await api.functional.auth.seller.join(connection, { body: sellerData });
  typia.assert(seller);

  // Create product sale
  const saleData = {
    code: RandomGenerator.alphaNumeric(12),
    shopping_mall_category_id: category.id,
    title: RandomGenerator.paragraph({ sentences: 5, wordMin: 5, wordMax: 10 }),
    description: RandomGenerator.content({
      paragraphs: 3,
      sentenceMin: 10,
      sentenceMax: 20,
    }),
    brand: RandomGenerator.name(1),
    condition: "new" as const,
    short_description: RandomGenerator.paragraph({
      sentences: 3,
      wordMin: 5,
      wordMax: 8,
    }),
    return_policy_days: 30 as const,
    warranty_info: RandomGenerator.paragraph({ sentences: 5 }),
    status: "published",
  } satisfies IShoppingMallSale.ICreate;

  const sale: IShoppingMallSale =
    await api.functional.shoppingMall.seller.sales.create(connection, {
      body: saleData,
    });
  typia.assert(sale);

  // Step 3: Buyer authenticates
  const buyerData = {
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.MinLength<8>>(),
    full_name: RandomGenerator.name(),
    phone_number: RandomGenerator.mobile(),
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies IShoppingMallBuyer.ICreate;

  const buyer: IShoppingMallBuyer.IAuthorized =
    await api.functional.auth.buyer.join(connection, { body: buyerData });
  typia.assert(buyer);

  // Step 4: Generate maximum-length content (title: 200 chars, body: 2000 chars)
  const maxTitleLength = 200;
  const maxBodyLength = 2000;

  // Generate title with exactly 200 characters
  const questionTitle = RandomGenerator.alphabets(maxTitleLength);

  // Generate body with exactly 2000 characters
  const questionBody = RandomGenerator.alphabets(maxBodyLength);

  // Verify generated content is exactly at maximum lengths
  TestValidator.equals(
    "title length is exactly 200",
    questionTitle.length,
    maxTitleLength,
  );
  TestValidator.equals(
    "body length is exactly 2000",
    questionBody.length,
    maxBodyLength,
  );

  // Step 5: Submit question with maximum-length content
  const questionData = {
    title: questionTitle,
    body: questionBody,
  } satisfies IShoppingMallSaleQuestion.ICreate;

  const createdQuestion: IShoppingMallSaleQuestion =
    await api.functional.shoppingMall.buyer.sales.questions.postBySalecode(
      connection,
      {
        saleCode: sale.code,
        body: questionData,
      },
    );
  typia.assert(createdQuestion);

  // Step 6: Validate successful creation with complete content preservation
  TestValidator.equals(
    "question title matches submitted",
    createdQuestion.title,
    questionTitle,
  );
  TestValidator.equals(
    "question body matches submitted",
    createdQuestion.body,
    questionBody,
  );

  // Step 7: Verify character counts are at maximum allowed lengths
  TestValidator.equals(
    "title character count is 200",
    createdQuestion.title.length,
    maxTitleLength,
  );
  TestValidator.equals(
    "body character count is 2000",
    createdQuestion.body.length,
    maxBodyLength,
  );

  // Step 8: Ensure proper associations with sale and buyer
  TestValidator.equals(
    "question associated with correct sale",
    createdQuestion.shopping_mall_sale_id,
    sale.id,
  );
  TestValidator.equals(
    "question associated with correct buyer",
    createdQuestion.shopping_mall_buyer_id,
    buyer.id,
  );

  // Verify question has valid timestamps
  typia.assert<string & tags.Format<"date-time">>(createdQuestion.created_at);
  typia.assert<string & tags.Format<"date-time">>(createdQuestion.updated_at);
}
