import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";
import api from "@ORGANIZATION/PROJECT-api";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdmin";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import type { ICommunityPlatformProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformProduct";
import type { ICommunityPlatformProductCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformProductCategory";
import type { ICommunityPlatformProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformProductImage";
import type { ICommunityPlatformProductPrice } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformProductPrice";
import type { ICommunityPlatformProductQuestion } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformProductQuestion";
import { prepare_random_community_platform_product_image } from "../../../prepare/prepare_random_community_platform_product_image";
import { prepare_random_community_platform_product_category } from "../../../prepare/prepare_random_community_platform_product_category";
import { prepare_random_community_platform_product_question } from "../../../prepare/prepare_random_community_platform_product_question";
import { prepare_random_community_platform_product_price } from "../../../prepare/prepare_random_community_platform_product_price";
import { prepare_random_community_platform_product } from "../../../prepare/prepare_random_community_platform_product";
import { generate_random_community_platform_member_products_create } from "../../../generate/generate_random_community_platform_member_products_create";
import { generate_random_community_platform_admin_categories_create } from "../../../generate/generate_random_community_platform_admin_categories_create";
import { generate_random_community_platform_member_products_questions_create } from "../../../generate/generate_random_community_platform_member_products_questions_create";
import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";
export async function test_api_product_question_update_by_admin_after_24_hours(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Create admin connection and authenticate
  const adminConnection: api.IConnection = { host: connection.host };
  const adminJoinPassword = RandomGenerator.alphaNumeric(16);
  const adminJoinData: ICommunityPlatformAdmin.IJoin = {
    email: typia.random<string & tags.Format<"email">>(),
    href: "https://example.com/admin/join",
    referrer: "https://example.com",
  };
  const admin: ICommunityPlatformAdmin.IAuthorized = await authorize_admin_join(
    adminConnection,
    { body: adminJoinData },
  );
  // Step 2: Create member connection and authenticate
  const memberConnection: api.IConnection = { host: connection.host };
  const memberJoinPassword = RandomGenerator.alphaNumeric(16);
  const memberJoinData: ICommunityPlatformMember.IJoin = {
    email: typia.random<string & tags.Format<"email">>(),
    password: memberJoinPassword,
    href: "https://example.com/member/join",
    referrer: "https://example.com",
  };
  const member: ICommunityPlatformMember.IAuthorized =
    await authorize_member_join(memberConnection, { body: memberJoinData });
  // Step 3: Generate a UUID to use as the category identifier
  const categoryId = typia.random<string & tags.Format<"uuid">>();
  // Step 4: Create product category using admin connection
  const categoryData: ICommunityPlatformProductCategory.ICreate = {
    name: RandomGenerator.name(),
    description: RandomGenerator.paragraph({ sentences: 2 }),
    parent_id: null, // Using null since we're creating a root category
    status: "active",
  };
  const category: ICommunityPlatformProductCategory =
    await generate_random_community_platform_admin_categories_create(
      adminConnection,
      { body: categoryData },
    );
  // Step 5: Create product using member connection, using the generated UUID as category_id
  const productCode = RandomGenerator.alphaNumeric(10);
  const productData: ICommunityPlatformProduct.ICreate = {
    code: productCode,
    title: RandomGenerator.name(),
    description: RandomGenerator.content({ paragraphs: 2 }),
    category_id: categoryId, // Using the generated UUID
    prices: [
      {
        product_code: productCode,
        currency_code: "KRW",
        amount: typia.random<number & tags.Minimum<0>>(),
        effective_from: new Date().toISOString(),
        quantity_min: 1,
      },
    ],
  };
  const product: ICommunityPlatformProduct =
    await generate_random_community_platform_member_products_create(
      memberConnection,
      { body: productData },
    );
  // Step 6: Create product question as member (this creates the question with timestamp)
  const questionData: ICommunityPlatformProductQuestion.ICreate = {
    productCode: product.productCode,
    questionText: RandomGenerator.paragraph({ sentences: 3 }),
  };
  const question: ICommunityPlatformProductQuestion =
    await generate_random_community_platform_member_products_questions_create(
      memberConnection,
      {
        body: questionData,
        params: { productCode: product.productCode },
      },
    );
  // Step 7: Verify question was created successfully and has a valid timestamp
  typia.assert(question);
  TestValidator.predicate("question created with valid timestamp", () => {
    const createdAt = new Date(question.createdAt);
    return (
      createdAt <= new Date() &&
      createdAt >= new Date(Date.now() - 24 * 60 * 60 * 1000)
    );
  });
  // Step 8: Admin logs in to update the question
  const adminLoginData: ICommunityPlatformAdmin.ILogin = {
    email: adminJoinData.email,
    password: adminJoinPassword,
    href: "https://example.com/admin/login",
    referrer: "https://example.com",
  };
  await authorize_admin_login(adminConnection, { body: adminLoginData });
  // Step 9: Admin updates question with new content - this should succeed
  const updateData: ICommunityPlatformProductQuestion.IUpdate = {
    questionText: "Updated question text after 24 hours",
    answerText: "This is an admin answer providing correction",
  };
  const updatedQuestion: ICommunityPlatformProductQuestion =
    await api.functional.communityPlatform.admin.products.questions.update(
      adminConnection,
      {
        productCode: product.productCode,
        questionId: question.id,
        body: updateData satisfies ICommunityPlatformProductQuestion.IUpdate,
      },
    );
  // Step 10: Validate that the update was successful
  typia.assert(updatedQuestion);
  TestValidator.equals(
    "question text updated",
    updatedQuestion.questionText,
    "Updated question text after 24 hours",
  );
  TestValidator.equals(
    "admin answer provided",
    updatedQuestion.answerText,
    "This is an admin answer providing correction",
  );
}
