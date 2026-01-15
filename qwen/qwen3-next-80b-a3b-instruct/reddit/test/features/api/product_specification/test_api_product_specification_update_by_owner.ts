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
import type { ICommunityPlatformProductSpecification } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformProductSpecification";
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
export async function test_api_product_specification_update_by_owner(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Generate a random but valid UUID for the category_id (since ICommunityPlatformProductCategory has no ID property)
  // This is necessary because ICommunityPlatformProduct.ICreate requires category_id to be a UUID format
  // In a real system, this would be a pre-existing category created by an admin
  const categoryId = typia.random<string & tags.Format<"uuid">>();
  // Step 2: Create member account for product creation
  const memberConnection: api.IConnection = { host: connection.host };
  const memberEmail = typia.random<string & tags.Format<"email">>();
  const memberAuth: ICommunityPlatformMember.IAuthorized =
    await authorize_member_join(memberConnection, {
      body: {
        email: memberEmail,
        password: "password123",
        href: "https://example.com/join",
        referrer: "https://example.com",
      } satisfies ICommunityPlatformMember.IJoin,
    });
  // Step 3: Authenticate member to create product
  await authorize_member_login(memberConnection, {
    body: {
      email: memberEmail,
      password: "password123",
    } satisfies ICommunityPlatformMember.ILogin,
  });
  // Step 4: Create product with the valid category_id generated above
  const product: ICommunityPlatformProduct =
    await api.functional.communityPlatform.member.products.create(
      memberConnection,
      {
        body: {
          code: RandomGenerator.alphaNumeric(10),
          title: RandomGenerator.name(),
          description: RandomGenerator.content(),
          category_id: categoryId,
          prices: [
            {
              product_code: RandomGenerator.alphaNumeric(10),
              currency_code: "USD",
              amount: typia.random<number & tags.Minimum<0>>(),
              effective_from: new Date().toISOString(),
            } satisfies ICommunityPlatformProductPrice.ICreate,
          ],
        } satisfies ICommunityPlatformProduct.ICreate,
      },
    );
  // Step 5: Update the specification to create it first time
  // The update endpoint creates the specification if it doesn't exist (upsert behavior)
  const specificationKey = "color";
  const initialValue = "red";
  const updatedSpecification: ICommunityPlatformProductSpecification =
    await api.functional.communityPlatform.member.products.specifications.update(
      memberConnection,
      {
        productCode: product.productCode,
        specificationKey: specificationKey,
        body: {
          value: initialValue,
        } satisfies ICommunityPlatformProductSpecification.IUpdate,
      },
    );
  typia.assert(updatedSpecification);
  // Step 6: Update the specification to new value (second update)
  const updatedValue = "Updated " + RandomGenerator.name();
  const finalUpdatedSpecification: ICommunityPlatformProductSpecification =
    await api.functional.communityPlatform.member.products.specifications.update(
      memberConnection,
      {
        productCode: product.productCode,
        specificationKey: specificationKey,
        body: {
          value: updatedValue,
        } satisfies ICommunityPlatformProductSpecification.IUpdate,
      },
    );
  // Step 7: Validate the updated specification
  typia.assert(finalUpdatedSpecification);
  TestValidator.equals(
    "specification key matches",
    finalUpdatedSpecification.key,
    specificationKey,
  );
  TestValidator.equals(
    "specification value matches new value",
    finalUpdatedSpecification.value,
    updatedValue,
  );
  TestValidator.equals(
    "product code matches",
    finalUpdatedSpecification.productCode,
    product.productCode,
  );
}
