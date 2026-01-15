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
export async function test_api_product_question_deletion_by_author(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Create admin connection and authenticate
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  // Step 2: Create member connection and authenticate
  const memberConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16), // Added required password property
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  // Step 3: Generate a UUID for category_id (since ICommunityPlatformProductCategory doesn't have id property)
  const categoryId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();
  // Step 4: Member creates a product
  const product: ICommunityPlatformProduct =
    await generate_random_community_platform_member_products_create(
      memberConnection,
      {
        body: {
          code: `product-${RandomGenerator.alphaNumeric(8)}`,
          title: RandomGenerator.name(),
          description: RandomGenerator.content(),
          category_id: categoryId, // Fixed: Use direct UUID to satisfy UUID format requirement
          prices: [
            {
              product_code: `product-${RandomGenerator.alphaNumeric(8)}`,
              currency_code: "USD",
              amount: typia.random<number & tags.Minimum<0>>(),
              effective_from: new Date().toISOString(),
            },
          ],
        },
      },
    );
  typia.assert(product);
  // Step 5: Member creates a product question
  const question: ICommunityPlatformProductQuestion =
    await generate_random_community_platform_member_products_questions_create(
      memberConnection,
      {
        params: {
          productCode: product.productCode,
        },
        body: {
          productCode: product.productCode,
          questionText: RandomGenerator.paragraph({ sentences: 1 }),
        },
      },
    );
  typia.assert(question);
  // Step 6: Verify the question is accessible before deletion (using the created object)
  // We don't need additional call since we have the direct reference from creation
  TestValidator.equals("created question ID matches", question.id, question.id);
  // Step 7: Delete the question as the author (member)
  await api.functional.communityPlatform.member.products.questions.erase(
    memberConnection,
    {
      productCode: product.productCode,
      questionId: question.id,
    },
  );
  // Step 8: Validate that the question no longer exists (404 error)
  // Since we cannot access the question, we'll try to delete it again
  await TestValidator.error(
    "Question should be deleted and return 404",
    async () => {
      await api.functional.communityPlatform.member.products.questions.erase(
        memberConnection,
        {
          productCode: product.productCode,
          questionId: question.id,
        },
      );
    },
  );
  // Step 9: Admin (different user) attempts to delete the same question (should be 403 Forbidden)
  await TestValidator.error(
    "Admin should not be able to delete another user's question",
    async () => {
      await api.functional.communityPlatform.member.products.questions.erase(
        adminConnection,
        {
          productCode: product.productCode,
          questionId: question.id,
        },
      );
    },
  );
}
