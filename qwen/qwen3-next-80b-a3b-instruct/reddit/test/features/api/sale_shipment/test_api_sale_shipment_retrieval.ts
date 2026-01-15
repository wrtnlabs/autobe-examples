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
import type { ICommunityPlatformSale } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformSale";
import type { ICommunityPlatformSaleShipment } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformSaleShipment";
import type { ICommunityPlatformSection } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformSection";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageICommunityPlatformSaleShipment } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformSaleShipment";
import { prepare_random_community_platform_section } from "../../../prepare/prepare_random_community_platform_section";
import { prepare_random_community_platform_product_image } from "../../../prepare/prepare_random_community_platform_product_image";
import { prepare_random_community_platform_product_category } from "../../../prepare/prepare_random_community_platform_product_category";
import { prepare_random_community_platform_product_price } from "../../../prepare/prepare_random_community_platform_product_price";
import { prepare_random_community_platform_product } from "../../../prepare/prepare_random_community_platform_product";
import { prepare_random_community_platform_sale } from "../../../prepare/prepare_random_community_platform_sale";
import { generate_random_community_platform_admin_sections_create } from "../../../generate/generate_random_community_platform_admin_sections_create";
import { generate_random_community_platform_member_products_create } from "../../../generate/generate_random_community_platform_member_products_create";
import { generate_random_community_platform_admin_categories_create } from "../../../generate/generate_random_community_platform_admin_categories_create";
import { generate_random_community_platform_member_sales_create } from "../../../generate/generate_random_community_platform_member_sales_create";
import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";
export async function test_api_sale_shipment_retrieval(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Create admin connection and authenticate
  const adminConnection: api.IConnection = { host: connection.host };
  const adminEmail = typia.random<string & tags.Format<"email">>();
  await authorize_admin_join(adminConnection, {
    body: {
      email: adminEmail,
      href: "https://example.com/join",
      referrer: "https://example.com",
    } satisfies ICommunityPlatformAdmin.IJoin,
  });
  // Step 2: Create admin connection and authenticate with login
  const adminLoginConnection: api.IConnection = { host: connection.host };
  await authorize_admin_login(adminLoginConnection, {
    body: {
      email: adminEmail,
      password: RandomGenerator.alphaNumeric(16),
      href: "https://example.com/login",
      referrer: "https://example.com",
    } satisfies ICommunityPlatformAdmin.ILogin,
  });
  // Step 3: Create product category
  const categoryRaw =
    await generate_random_community_platform_admin_categories_create(
      adminLoginConnection,
      {
        body: {
          name: RandomGenerator.name(),
          description: RandomGenerator.paragraph(),
          parent_id: null,
          status: "active",
        } satisfies ICommunityPlatformProductCategory.ICreate,
      },
    );
  // Extract id from categoryRaw
  const category: ICommunityPlatformProductCategory =
    typia.assert<ICommunityPlatformProductCategory>(categoryRaw);
  const categoryId = (category as any).id as string;
  // Step 4: Create section
  const sectionRaw =
    await generate_random_community_platform_admin_sections_create(
      adminLoginConnection,
      {
        body: {
          name: RandomGenerator.name(),
          description: RandomGenerator.paragraph(),
          parent_section_id: undefined,
          visibility_level: "public",
        } satisfies ICommunityPlatformSection.ICreate,
      },
    );
  const section: ICommunityPlatformSection =
    typia.assert<ICommunityPlatformSection>(sectionRaw);
  // Step 5: Create member connection and authenticate
  const memberConnection: api.IConnection = { host: connection.host };
  const memberEmail = typia.random<string & tags.Format<"email">>();
  const memberPassword = RandomGenerator.alphaNumeric(16);
  await authorize_member_join(memberConnection, {
    body: {
      email: memberEmail,
      password: memberPassword,
      href: "https://example.com/join",
      referrer: "https://example.com",
    } satisfies ICommunityPlatformMember.IJoin,
  });
  // Step 6: Create member connection with login (auth)
  const memberLoginConnection: api.IConnection = { host: connection.host };
  await authorize_member_login(memberLoginConnection, {
    body: {
      email: memberEmail,
      password: memberPassword,
    } satisfies ICommunityPlatformMember.ILogin,
  });
  // Step 7: Create product
  const productRaw =
    await generate_random_community_platform_member_products_create(
      memberLoginConnection,
      {
        body: {
          code: RandomGenerator.alphaNumeric(10), // Fixed: use 'code' instead of 'productCode'
          title: RandomGenerator.name(),
          description: RandomGenerator.content(),
          category_id: categoryId, // Fixed: use categoryId from category
          prices: [
            {
              product_code: RandomGenerator.alphaNumeric(10),
              currency_code: "USD",
              amount: typia.random<number & tags.Minimum<0>>(),
              effective_from: new Date().toISOString(),
              effective_to: null,
            },
          ],
          images: [],
        } satisfies ICommunityPlatformProduct.ICreate,
      },
    );
  const product: ICommunityPlatformProduct =
    typia.assert<ICommunityPlatformProduct>(productRaw);
  // Step 8: Create sale
  const saleRaw = await generate_random_community_platform_member_sales_create(
    memberLoginConnection,
    {
      body: {
        product_id: product.id,
        price: typia.random<number & tags.Minimum<0>>(),
        currency_code: "USD",
        stock_quantity: 5,
        title: RandomGenerator.name(),
        description: RandomGenerator.paragraph(),
        section_id: sectionRaw, // Fixed: section is a string, use sectionRaw directly
      } satisfies ICommunityPlatformSale.ICreate,
    },
  );
  const sale: ICommunityPlatformSale =
    typia.assert<ICommunityPlatformSale>(saleRaw);
  // Step 9: Retrieve shipment records for the sale
  // The shipment endpoint expects saleCode which is the sale's id
  const shipments =
    await api.functional.communityPlatform.member.sales.shipments.index(
      memberLoginConnection,
      {
        saleCode: sale.id, // Use sale.id as saleCode
      },
    );
  // Step 10: Validate response type
  typia.assert<IPageICommunityPlatformSaleShipment>(shipments);
  // Step 11: Validate pagination data
  TestValidator.equals(
    "pagination current page",
    shipments.pagination.current,
    0,
  );
  TestValidator.equals("pagination limit", shipments.pagination.limit, 10);
  TestValidator.predicate(
    "pagination records == 0 unless shipments exist",
    shipments.pagination.records === 0,
  );
  TestValidator.predicate(
    "pagination pages == 0 unless shipments exist",
    shipments.pagination.pages === 0,
  );
  // Step 12: Validate shipment records are empty
  TestValidator.equals("shipments array length", shipments.data.length, 0);
}
