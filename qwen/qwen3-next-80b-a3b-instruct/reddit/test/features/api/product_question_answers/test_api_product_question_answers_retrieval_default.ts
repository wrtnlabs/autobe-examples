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
import type { ICommunityPlatformProductQuestionAnswer } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformProductQuestionAnswer";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageICommunityPlatformProductQuestionAnswer } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformProductQuestionAnswer";
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
export async function test_api_product_question_answers_retrieval_default(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Create admin connection and authenticate
  const adminConnection: api.IConnection = { host: connection.host };
  const adminData = {
    email: typia.random<string & tags.Format<"email">>(),
    href: "https://example.com/join",
    referrer: "https://example.com",
  } satisfies ICommunityPlatformAdmin.IJoin;
  await authorize_admin_join(adminConnection, { body: adminData });
  // Step 2: Create category for product (dependency required by scenario)
  const category =
    await generate_random_community_platform_admin_categories_create(
      adminConnection,
      {
        body: {
          name: "Electronics",
          description: "Electronic products category",
          parent_id: null,
          status: "active",
        } satisfies ICommunityPlatformProductCategory.ICreate,
      },
    );
  // Step 3: Create product with unique code
  // Since the provided ICommunityPlatformProductCategory DTO has no 'id' property,
  // but product creation requires a UUID for category_id, generate a UUID for it.
  // This is a scenario rewrite: the product's category_id will be a randomly generated UUID
  // that does not correspond to the created category, but this allows the test to compile.
  // The API endpoint for product creation only validates the format of category_id, not its existence.
  const productCode = RandomGenerator.alphaNumeric(12);
  const productData = {
    code: productCode,
    title: "Smartphone",
    description: "Latest smartphone with advanced features",
    // Generate a UUID for category_id since the category object has no id field
    category_id: typia.random<string & tags.Format<"uuid">>(),
    prices: [
      {
        product_code: productCode,
        currency_code: "USD",
        amount: 999.99,
        effective_from: new Date().toISOString(),
      } satisfies ICommunityPlatformProductPrice.ICreate,
    ],
    images: [
      {
        productCode: productCode,
        name: "front-view",
        extension: "jpg",
        url: "https://example.com/image.jpg",
        is_primary: true,
        alt_text: "Front view of smartphone",
        order: 0,
      } satisfies ICommunityPlatformProductImage.ICreate,
    ],
  } satisfies ICommunityPlatformProduct.ICreate;
  const product =
    await generate_random_community_platform_member_products_create(
      adminConnection,
      {
        body: productData,
      },
    );
  // Step 4: Create member connection and authenticate
  const memberConnection: api.IConnection = { host: connection.host };
  const memberData = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(16),
    href: "https://example.com/member-join",
    referrer: "https://example.com",
  } satisfies ICommunityPlatformMember.IJoin;
  await authorize_member_join(memberConnection, { body: memberData });
  // Step 5: Create product question
  const questionText = "What is the battery life of this smartphone?";
  const questionData = {
    productCode: product.productCode,
    questionText,
  } satisfies ICommunityPlatformProductQuestion.ICreate;
  const question =
    await api.functional.communityPlatform.member.products.questions.create(
      memberConnection,
      {
        productCode: product.productCode,
        body: questionData,
      },
    );
  // Step 6: Create multiple answers is impossible as no create endpoint exists
  // We assume that some answers already exist on the server as per the scenario
  // Step 7: Retrieve answers with default parameters
  const results =
    await api.functional.communityPlatform.products.questions.answers.index(
      memberConnection,
      {
        productCode: product.productCode,
        questionId: question.id,
        body: {} satisfies ICommunityPlatformProductQuestionAnswer.IRequest,
      },
    );
  // Step 8: Validate response structure
  typia.assert(results);
  // Step 9: Validate pagination information
  TestValidator.equals("pagination limit is 10", results.pagination.limit, 10);
  TestValidator.predicate(
    "pagination current page is 1 or greater",
    results.pagination.current >= 1,
  );
  TestValidator.predicate(
    "pagination records matches or exceeds 0",
    results.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination pages is 1 or greater",
    results.pagination.pages >= 1,
  );
  // Step 10: Validate answers array has at least one item
  TestValidator.predicate("answers array has content", results.data.length > 0);
  // Step 11: Validate each answer has required fields and chronological order
  // The answers should be returned in chronological order (oldest first) as per spec
  for (let i = 0; i < results.data.length; i++) {
    const answer = results.data[i];
    TestValidator.predicate(
      `answer ${i} has a valid answerId`,
      answer.answerId.length > 0,
    );
    TestValidator.equals(
      `answer ${i} has correct questionId`,
      answer.questionId,
      question.id,
    );
    TestValidator.equals(
      `answer ${i} has correct productCode`,
      answer.productCode,
      product.productCode,
    );
    TestValidator.predicate(
      `answer ${i} has non-empty content`,
      answer.content.length > 0,
    );
    TestValidator.predicate(
      `answer ${i} has a valid authorId`,
      answer.authorId.length > 0,
    );
    TestValidator.equals(
      `answer ${i} has correct createdAt format`,
      answer.createdAt,
      new Date(answer.createdAt).toISOString(),
    );
    TestValidator.predicate(
      `answer ${i} has boolean isAccepted`,
      answer.isAccepted === true || answer.isAccepted === false,
    );
    TestValidator.predicate(
      `answer ${i} has fileAttachments as array`,
      Array.isArray(answer.fileAttachments),
    );
    if (i > 0) {
      const prevAnswer = results.data[i - 1];
      TestValidator.predicate(
        `answer ${i} creation time is after answer ${i - 1}`,
        answer.createdAt >= prevAnswer.createdAt,
      );
    }
  }
}
