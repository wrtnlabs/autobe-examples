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
import { prepare_random_community_platform_product_specification } from "../../../prepare/prepare_random_community_platform_product_specification";
import { prepare_random_community_platform_product_category } from "../../../prepare/prepare_random_community_platform_product_category";
import { prepare_random_community_platform_product_price } from "../../../prepare/prepare_random_community_platform_product_price";
import { prepare_random_community_platform_product } from "../../../prepare/prepare_random_community_platform_product";
import { generate_random_community_platform_member_products_create } from "../../../generate/generate_random_community_platform_member_products_create";
import { generate_random_community_platform_member_products_specifications_create } from "../../../generate/generate_random_community_platform_member_products_specifications_create";
import { generate_random_community_platform_admin_categories_create } from "../../../generate/generate_random_community_platform_admin_categories_create";
import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";
export async function test_api_product_specification_creation_by_member(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Create member account
  const memberConnection: api.IConnection = { host: connection.host };
  const member = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: "https://example.com/join",
      referrer: "https://example.com/home",
    } satisfies ICommunityPlatformMember.IJoin,
  });
  // Step 2: Generate a valid UUID for category_id (as required by ICommunityPlatformProduct.ICreate)
  const fakeCategoryId = typia.random<string & tags.Format<"uuid">>();
  // Step 3: Create product as member using the generated fake category ID
  const product =
    await generate_random_community_platform_member_products_create(
      memberConnection,
      {
        body: {
          code: RandomGenerator.alphaNumeric(10),
          title: RandomGenerator.name(),
          description: RandomGenerator.content(),
          category_id: fakeCategoryId, // Use random uuid - only requirement is to be uuid format
          prices: [
            {
              product_code: RandomGenerator.alphaNumeric(10),
              currency_code: "USD",
              amount: typia.random<
                number & tags.Minimum<0> & tags.Type<"uint32">
              >(),
              effective_from: new Date().toISOString(),
            },
          ] satisfies ICommunityPlatformProductPrice.ICreate[],
        },
      },
    );
  // Step 4: Create product specification by member
  const specification =
    await generate_random_community_platform_member_products_specifications_create(
      memberConnection,
      {
        params: {
          productCode: product.productCode,
        },
        body: {
          key: "color",
          value: "red",
        } satisfies ICommunityPlatformProductSpecification.ICreate,
      },
    );
  // Step 5: Validate specification was created correctly
  typia.assert(specification);
  TestValidator.equals(
    "specification product code matches",
    specification.productCode,
    product.productCode,
  );
  TestValidator.equals(
    "specification key is color",
    specification.key,
    "color",
  );
  TestValidator.equals(
    "specification value is red",
    specification.value,
    "red",
  );
}
