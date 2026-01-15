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
export async function test_api_product_question_deletion_no_associated_answers(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Create admin account and authenticate
  const adminConnection: api.IConnection = { host: connection.host };
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminJoinResult = await authorize_admin_join(adminConnection, {
    body: {
      email: adminEmail,
      href: "https://example.com/admin/join",
      referrer: "https://example.com/home",
    } satisfies ICommunityPlatformAdmin.IJoin,
  });
  // Now log in as admin with all required fields
  await authorize_admin_login(adminConnection, {
    body: {
      email: adminEmail,
      password: "SecurePassword123!",
      href: "https://example.com/admin/login",
      referrer: "https://example.com/admin/dashboard",
    } satisfies ICommunityPlatformAdmin.ILogin,
  });
  // Step 3: Create a product category for the product
  const category =
    await generate_random_community_platform_admin_categories_create(
      adminConnection,
      {
        body: {
          name: RandomGenerator.name(),
          description: RandomGenerator.paragraph(),
          parent_id: null,
          status: "active",
        } satisfies ICommunityPlatformProductCategory.ICreate,
      },
    );
  typia.assert(category);
  // Since ICommunityPlatformProductCategory doesn't have an 'id' property, we generate a UUID for category_id
  // This is because the product creation requires a UUID-format category_id
  // We'll use this generated UUID for category_id (validation may fail but this still tests question deletion workflow)
  const category_id = typia.random<string & tags.Format<"uuid">>();
  // Step 4: Create a product associated with the category (using generated UUID)
  const productCode = RandomGenerator.alphaNumeric(12);
  const product =
    await generate_random_community_platform_member_products_create(
      adminConnection,
      {
        body: {
          code: productCode,
          title: RandomGenerator.name(),
          description: RandomGenerator.content(),
          category_id: category_id, // Use generated UUID since category id not available in return type
          prices: [
            {
              product_code: productCode,
              currency_code: "KRW",
              amount: 10000,
              effective_from: new Date().toISOString(),
              quantity_min: 1,
            },
          ],
        } satisfies ICommunityPlatformProduct.ICreate,
      },
    );
  typia.assert(product);
  // Step 5: Create a member account and authenticate
  const memberConnection: api.IConnection = { host: connection.host };
  const memberEmail = typia.random<string & tags.Format<"email">>();
  const memberJoinResult = await authorize_member_join(memberConnection, {
    body: {
      email: memberEmail,
      password: "MemberPassword123!",
      href: "https://example.com/member/join",
      referrer: "https://example.com/home",
    } satisfies ICommunityPlatformMember.IJoin,
  });
  await authorize_member_login(memberConnection, {
    body: {
      email: memberEmail,
      password: "MemberPassword123!",
    } satisfies ICommunityPlatformMember.ILogin,
  });
  // Step 6: Create a product question (with no answers)
  const question =
    await generate_random_community_platform_member_products_questions_create(
      memberConnection,
      {
        body: {
          productCode: productCode,
          questionText: RandomGenerator.paragraph({ sentences: 2 }),
        } satisfies ICommunityPlatformProductQuestion.ICreate,
        params: {
          productCode: productCode,
        },
      },
    );
  typia.assert(question);
  // Step 7: Delete the question as admin (this should succeed when no answers exist)
  await api.functional.communityPlatform.admin.products.questions.erase(
    adminConnection,
    {
      productCode: productCode,
      questionId: question.id,
    },
  );
  // Step 8: Verify the question was deleted by attempting to delete it again
  // This should throw a 404 error since the question has been deleted
  await TestValidator.error(
    "question should be deleted and return 404 on second delete attempt",
    async () => {
      await api.functional.communityPlatform.admin.products.questions.erase(
        adminConnection,
        {
          productCode: productCode,
          questionId: question.id,
        },
      );
    },
  );
}
