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
import { prepare_random_community_platform_product_question_answer } from "../../../prepare/prepare_random_community_platform_product_question_answer";
import { prepare_random_community_platform_product } from "../../../prepare/prepare_random_community_platform_product";
import { generate_random_community_platform_member_products_create } from "../../../generate/generate_random_community_platform_member_products_create";
import { generate_random_community_platform_admin_categories_create } from "../../../generate/generate_random_community_platform_admin_categories_create";
import { generate_random_community_platform_member_products_questions_create } from "../../../generate/generate_random_community_platform_member_products_questions_create";
import { generate_random_community_platform_member_products_questions_answers_create } from "../../../generate/generate_random_community_platform_member_products_questions_answers_create";
import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";
export async function test_api_product_question_answers_filtered_by_partial_search(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Create admin connection and authenticate
  const adminConnection: api.IConnection = { host: connection.host };
  const adminResponse = await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      href: "https://example.com/join",
      referrer: "https://example.com",
    } satisfies ICommunityPlatformAdmin.IJoin,
  });
  // Step 2: Create member connection and authenticate
  const memberConnection: api.IConnection = { host: connection.host };
  const memberResponse = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16), // Required field in IJoin
      href: "https://example.com/join",
      referrer: "https://example.com",
    } satisfies ICommunityPlatformMember.IJoin,
  });
  // Step 3: Create product category using admin
  const categoryResponse =
    await generate_random_community_platform_admin_categories_create(
      adminConnection,
      {
        body: {
          name: RandomGenerator.name(),
          description: RandomGenerator.content(),
          parent_id: null,
          status: "active",
        } satisfies ICommunityPlatformProductCategory.ICreate,
      },
    );
  // Extract the category id from the response using safe type assertion
  // The API returns an id property even though it's not in the provided DTO definition
  // This is based on REST API patterns and the requirement that product category_id is a UUID
  const categoryId = (
    categoryResponse as ICommunityPlatformProductCategory & {
      id: string;
    }
  ).id;
  // Step 4: Create product using member
  // Create product code first, to use in product creation and price
  const productCode = RandomGenerator.alphaNumeric(12);
  const productResponse =
    await generate_random_community_platform_member_products_create(
      memberConnection,
      {
        body: {
          code: productCode, // Use productCode here
          title: RandomGenerator.name(),
          description: RandomGenerator.content(),
          category_id: categoryId,
          prices: [
            {
              product_code: productCode, // Use productCode here, not productResponse.code (which doesn't exist yet)
              currency_code: "KRW" satisfies string &
                tags.Pattern<"^[A-Z]{3}$">,
              amount: typia.random<number & tags.Minimum<0>>(),
              effective_from: new Date().toISOString(),
              effective_to: null,
              quantity_min: 0,
              quantity_max: null,
              notes: undefined,
              source: "manual",
              region: undefined,
              price_type: "retail",
              tax_rate: undefined,
              unit: undefined,
            },
          ],
        } satisfies ICommunityPlatformProduct.ICreate,
      },
    );
  // Get the actual product after creation
  const product: ICommunityPlatformProduct = productResponse;
  // Step 5: Create product question using member
  const question =
    await generate_random_community_platform_member_products_questions_create(
      memberConnection,
      {
        body: {
          productCode: product.productCode, // Use productCode, the correct property
          questionText: RandomGenerator.paragraph({ sentences: 2 }),
        } satisfies ICommunityPlatformProductQuestion.ICreate,
        params: { productCode: product.productCode }, // Use productCode in params
      },
    );
  // Step 6: Create multiple answers with varying content for search testing
  const answer1 =
    await generate_random_community_platform_member_products_questions_answers_create(
      memberConnection,
      {
        body: {
          content: "This product is amazing!",
        } satisfies ICommunityPlatformProductQuestionAnswer.ICreate,
        params: {
          productCode: product.productCode,
          questionId: question.id satisfies string as string,
        },
      },
    );
  const answer2 =
    await generate_random_community_platform_member_products_questions_answers_create(
      memberConnection,
      {
        body: {
          content: "I love how <strong>amazing</strong> it is!",
        } satisfies ICommunityPlatformProductQuestionAnswer.ICreate,
        params: {
          productCode: product.productCode,
          questionId: question.id satisfies string as string,
        },
      },
    );
  const answer3 =
    await generate_random_community_platform_member_products_questions_answers_create(
      memberConnection,
      {
        body: {
          content: "Not a great product at all.",
        } satisfies ICommunityPlatformProductQuestionAnswer.ICreate,
        params: {
          productCode: product.productCode,
          questionId: question.id satisfies string as string,
        },
      },
    );
  // Step 7: Search for answers containing "amazing" (case-insensitive)
  const searchResult =
    await api.functional.communityPlatform.products.questions.answers.index(
      memberConnection,
      {
        productCode: product.productCode, // Use productCode in request
        questionId: question.id satisfies string as string,
        body: {
          page: 1,
          limit: 10,
          search: "amazing",
          order: "asc",
        } satisfies ICommunityPlatformProductQuestionAnswer.IRequest,
      },
    );
  typia.assert(searchResult);
  // Step 8: Validate search results contain only answers with the search term
  const matchedAnswers = searchResult.data.filter((answer) =>
    answer.content.toLowerCase().includes("amazing"),
  );
  TestValidator.equals(
    "search results contain exactly 2 matching answers",
    matchedAnswers.length,
    2,
  );
  // Step 9: Verify each matching answer contains the search term
  matchedAnswers.forEach((answer) => {
    TestValidator.predicate(
      "answer contains search term",
      answer.content.toLowerCase().includes("amazing"),
    );
  });
  // Step 10: Verify non-matching answer is not included
  const nonMatchingAnswer = searchResult.data.find(
    (answer) => !answer.content.toLowerCase().includes("amazing"),
  );
  TestValidator.equals(
    "non-matching answer not in results",
    nonMatchingAnswer,
    undefined,
  );
}
