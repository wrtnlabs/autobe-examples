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
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageICommunityPlatformProductQuestion } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformProductQuestion";
import { prepare_random_community_platform_product_image } from "../../../prepare/prepare_random_community_platform_product_image";
import { prepare_random_community_platform_product_category } from "../../../prepare/prepare_random_community_platform_product_category";
import { prepare_random_community_platform_product_price } from "../../../prepare/prepare_random_community_platform_product_price";
import { prepare_random_community_platform_product } from "../../../prepare/prepare_random_community_platform_product";
import { generate_random_community_platform_member_products_create } from "../../../generate/generate_random_community_platform_member_products_create";
import { generate_random_community_platform_admin_categories_create } from "../../../generate/generate_random_community_platform_admin_categories_create";
import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";
export async function test_api_product_questions_retrieval_by_member(
  connection: api.IConnection,
): Promise<void> {
  const adminConnection: api.IConnection = { host: connection.host };
  const adminJoinEmail = typia.random<string & tags.Format<"email">>();
  await authorize_admin_join(adminConnection, {
    body: {
      email: adminJoinEmail,
      href: "https://example.com/join",
      referrer: "https://example.com",
      ip: null,
    } satisfies ICommunityPlatformAdmin.IJoin,
  });
  const adminLoginConnection: api.IConnection = { host: connection.host };
  await authorize_admin_login(adminLoginConnection, {
    body: {
      email: adminJoinEmail,
      password: "password123",
      href: "https://example.com/login",
      referrer: "https://example.com/home",
      ip: undefined,
    } satisfies ICommunityPlatformAdmin.ILogin,
  });
  const memberConnection: api.IConnection = { host: connection.host };
  const memberJoinEmail = typia.random<string & tags.Format<"email">>();
  await authorize_member_join(memberConnection, {
    body: {
      email: memberJoinEmail,
      password: RandomGenerator.alphaNumeric(16),
      href: "https://example.com/join",
      referrer: "https://example.com",
    } satisfies ICommunityPlatformMember.IJoin,
  });
  const memberLoginConnection: api.IConnection = { host: connection.host };
  await authorize_member_login(memberLoginConnection, {
    body: {
      email: memberJoinEmail,
      password: "password123",
    } satisfies ICommunityPlatformMember.ILogin,
  });
  const category =
    await generate_random_community_platform_admin_categories_create(
      adminLoginConnection,
      {
        body: {
          name: RandomGenerator.name(),
          description: RandomGenerator.paragraph({ sentences: 2 }),
          parent_id: null,
          status: "active",
        } satisfies ICommunityPlatformProductCategory.ICreate,
      },
    );
  // WORKAROUND: The type ICommunityPlatformProductCategory doesn't have 'id' property,
  // but product creation requires a UUID category_id. We assume the system returns an id
  // internally, even if it's not exposed in the type. We use typia.assertGuard to access it.
  typia.assertGuard<
    ICommunityPlatformProductCategory & {
      id: string & tags.Format<"uuid">;
    }
  >(category);
  const product =
    await generate_random_community_platform_member_products_create(
      memberLoginConnection,
      {
        body: {
          code: RandomGenerator.alphaNumeric(8),
          title: RandomGenerator.paragraph({ sentences: 2 }),
          description: RandomGenerator.content(),
          category_id: category.id, // Now type assertion confirms 'id' exists
          prices: [
            {
              product_code: RandomGenerator.alphaNumeric(8),
              currency_code: "USD",
              amount: typia.random<number & tags.Minimum<0>>(),
              effective_from: new Date().toISOString(),
              quantity_min: 1,
            },
          ] satisfies ICommunityPlatformProductPrice.ICreate[],
        } satisfies ICommunityPlatformProduct.ICreate,
      },
    );
  // Retrieve product questions
  const questionsResponse =
    await api.functional.communityPlatform.member.products.questions.index(
      memberLoginConnection,
      {
        productCode: product.productCode,
        body: {
          sortBy: "createdAt",
          order: "desc",
          page: 1,
          limit: 10,
        } satisfies ICommunityPlatformProductQuestion.IRequest,
      },
    );
  typia.assert<IPageICommunityPlatformProductQuestion>(questionsResponse);
  // Validate pagination metadata
  TestValidator.equals(
    "pagination: current page should be 1",
    questionsResponse.pagination.current,
    1,
  );
  TestValidator.equals(
    "pagination: limit should be 10",
    questionsResponse.pagination.limit,
    10,
  );
  TestValidator.predicate(
    "pagination: records should be >= 0",
    questionsResponse.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination: pages should be >= 0",
    questionsResponse.pagination.pages >= 0,
  );
  // Validate data ordering if questions exist (newest first)
  if (questionsResponse.data.length > 1) {
    TestValidator.predicate(
      "questions ordered by createdAt desc",
      questionsResponse.data[0].createdAt >=
        questionsResponse.data[1].createdAt,
    );
  }
  // Validate data structure for any questions returned
  for (const question of questionsResponse.data) {
    // Validate UUID format for id
    TestValidator.predicate(
      "question id has valid uuid format",
      /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
        question.id,
      ),
    );
    TestValidator.equals(
      "question has correct productCode",
      question.productCode,
      product.productCode,
    );
    TestValidator.predicate(
      "question has question text (non-empty string)",
      question.questionText.length > 0,
    );
    TestValidator.predicate(
      "question has createdAt in ISO format",
      /\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/.test(question.createdAt),
    );
    // According to schema, answerText is string (nullable), so check for string type and length
    TestValidator.predicate(
      "question answerText is a string",
      typeof question.answerText === "string",
    );
    TestValidator.predicate(
      "question answerText length <= 2000",
      question.answerText.length <= 2000,
    );
    TestValidator.predicate(
      "question has isVisible boolean",
      typeof question.isVisible === "boolean",
    );
  }
}
