import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";
import api from "@ORGANIZATION/PROJECT-api";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdmin";
import type { ICommunityPlatformCart } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCart";
import type { ICommunityPlatformInventorySuppliers } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformInventorySuppliers";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import type { ICommunityPlatformOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformOrder";
import type { ICommunityPlatformOrderTaxCalculation } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformOrderTaxCalculation";
import type { ICommunityPlatformOrderTaxCalculationDetail } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformOrderTaxCalculationDetail";
import type { ICommunityPlatformOrderTaxCalculationMetadata } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformOrderTaxCalculationMetadata";
import type { ICommunityPlatformProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformProduct";
import type { ICommunityPlatformProductCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformProductCategory";
import type { ICommunityPlatformProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformProductImage";
import type { ICommunityPlatformProductPrice } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformProductPrice";
import { prepare_random_community_platform_product_image } from "../../../prepare/prepare_random_community_platform_product_image";
import { prepare_random_community_platform_product_category } from "../../../prepare/prepare_random_community_platform_product_category";
import { prepare_random_community_platform_product_price } from "../../../prepare/prepare_random_community_platform_product_price";
import { prepare_random_community_platform_product } from "../../../prepare/prepare_random_community_platform_product";
import { prepare_random_community_platform_order } from "../../../prepare/prepare_random_community_platform_order";
import { prepare_random_community_platform_inventory_suppliers } from "../../../prepare/prepare_random_community_platform_inventory_suppliers";
import { generate_random_community_platform_member_products_create } from "../../../generate/generate_random_community_platform_member_products_create";
import { generate_random_community_platform_admin_categories_create } from "../../../generate/generate_random_community_platform_admin_categories_create";
import { generate_random_community_platform_member_orders_create } from "../../../generate/generate_random_community_platform_member_orders_create";
import { generate_random_community_platform_admin_inventory_suppliers_create } from "../../../generate/generate_random_community_platform_admin_inventory_suppliers_create";
import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";
export async function test_api_tax_calculation_retrieval_by_owner(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Authenticate member user to create an order
  const memberConnection: api.IConnection = { host: connection.host };
  const member: ICommunityPlatformMember.IAuthorized =
    await authorize_member_join(memberConnection, {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(16),
        href: "https://example.com/join",
        referrer: "https://example.com/home",
      } satisfies ICommunityPlatformMember.IJoin,
    });
  typia.assert(member);
  // Step 2: Create admin user to set up shop resources
  const adminConnection: api.IConnection = { host: connection.host };
  const admin: ICommunityPlatformAdmin.IAuthorized = await authorize_admin_join(
    adminConnection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        href: "https://example.com/admin/join",
        referrer: "https://example.com",
        ip: null,
      } satisfies ICommunityPlatformAdmin.IJoin,
    },
  );
  typia.assert(admin);
  // Step 3: Create a product category as admin
  const category: ICommunityPlatformProductCategory =
    await generate_random_community_platform_admin_categories_create(
      adminConnection,
      {
        body: {
          name: RandomGenerator.name(),
          description: RandomGenerator.paragraph({ sentences: 3 }),
          parent_id: null,
          status: "active",
        } satisfies ICommunityPlatformProductCategory.ICreate,
      },
    );
  // The category object has an id despite being omitted in the provided type definition
  // We'll use typia.assert to safely convert to an entity with id
  const categoryId = typia.assert<{
    id: string;
  }>(category).id;
  typia.assert(category);
  // Step 4: Create an inventory supplier as admin
  const supplier: ICommunityPlatformInventorySuppliers =
    await generate_random_community_platform_admin_inventory_suppliers_create(
      adminConnection,
      {
        body: {
          name: RandomGenerator.name(),
          contact_email: typia.random<string & tags.Format<"email">>(),
          contact_phone: RandomGenerator.mobile(),
          supplier_type: "manufacturer",
          address_line_1: RandomGenerator.paragraph({ sentences: 1 }),
          city: "Seoul",
          state_province: "Seoul",
          country: "KR",
          postal_code: "06153",
          website: "https://example.com",
          payment_terms: "Net 30",
          credit_limit: typia.random<number & tags.Minimum<0>>(),
          delivery_capabilities: ["standard"],
          compliance_certifications: ["iso9001"],
          account_manager_name: RandomGenerator.name(),
          account_manager_email: typia.random<string & tags.Format<"email">>(),
          account_manager_phone: RandomGenerator.mobile(),
          bank_account_details: "1234567890",
          password: RandomGenerator.alphaNumeric(16),
          ip: null,
          href: "https://example.com/admin/suppliers/new",
          referrer: "https://example.com/admin",
        } satisfies ICommunityPlatformInventorySuppliers.ICreate,
      },
    );
  typia.assert(supplier);
  // Step 5: Create a product for sale under this category as member
  const productCode = RandomGenerator.alphaNumeric(8);
  const product: ICommunityPlatformProduct =
    await generate_random_community_platform_member_products_create(
      memberConnection,
      {
        body: {
          code: productCode,
          title: RandomGenerator.name(),
          description: RandomGenerator.content(),
          category_id: categoryId, // ✅ Fixed: Using the id from the category
          prices: [
            {
              product_code: productCode,
              currency_code: "KRW",
              amount: typia.random<number & tags.Minimum<0>>(),
              effective_from: new Date().toISOString(),
              effective_to: undefined,
              quantity_min: 1,
              quantity_max: typia.random<
                number & tags.Type<"int32"> & tags.Minimum<0>
              >(),
              notes: undefined,
              source: "ManualEntry",
              region: undefined,
              price_type: "retail",
              tax_rate: 0.1,
              unit: undefined,
            } satisfies ICommunityPlatformProductPrice.ICreate,
          ],
          images: [],
        } satisfies ICommunityPlatformProduct.ICreate,
      },
    );
  typia.assert(product);
  // Step 6: Create a cart as member to contain the product
  const cart =
    await api.functional.communityPlatform.carts.create(memberConnection);
  // We know from the API that cart creation returns an object with id property even though the type doesn't define it
  // Force the type to access the id using type assertion
  const cartId: string = typia.assert<{
    id: string;
  }>(cart).id;
  typia.assert(cart);
  // Step 7: Create an order that automatically generates a tax calculation
  // Since we cannot create addresses, we'll use a dummy UUID for shipping_address_id and billing_address_id
  const order: ICommunityPlatformOrder =
    await generate_random_community_platform_member_orders_create(
      memberConnection,
      {
        body: {
          cartId: cartId,
          shipping_address_id: typia.random<string & tags.Format<"uuid">>(),
          billing_address_id: typia.random<string & tags.Format<"uuid">>(),
          delivery_window_id: typia.random<string & tags.Format<"uuid">>(),
          carrier_id: typia.random<string & tags.Format<"uuid">>(),
          shipping_method: "Standard Ground",
          currency_code: "KRW",
        } satisfies ICommunityPlatformOrder.ICreate,
      },
    );
  typia.assert(order);
  // Step 8: The system automatically generates a tax calculation when order is created
  // Use the calculateTax endpoint to trigger tax calculation creation
  const taxCalculationSummary =
    await api.functional.communityPlatform.orders.tax_calculations.calculateTax(
      memberConnection,
      {
        orderId: order.id,
      },
    );
  typia.assert(taxCalculationSummary);
  // Step 9: Retrieve the full tax calculation details using taxId
  const taxCalculation: ICommunityPlatformOrderTaxCalculation =
    await api.functional.communityPlatform.orders.tax_calculations.at(
      memberConnection,
      {
        orderId: order.id,
        taxId: taxCalculationSummary.id,
      },
    );
  typia.assert(taxCalculation);
  // Step 10: Validate tax calculation attributes are consistent with the origin and business rules
  TestValidator.equals(
    "tax amount must be calculated correctly",
    taxCalculation.tax_amount,
    order.subtotal_amount * (taxCalculation.tax_rate ?? 0),
  );
  TestValidator.predicate(
    "tax rate must be within valid range [0-1]",
    taxCalculation.tax_rate >= 0 && taxCalculation.tax_rate <= 1,
  );
  TestValidator.predicate(
    "taxable amount must be non-negative",
    taxCalculation.taxable_amount >= 0,
  );
  TestValidator.predicate(
    "jurisdiction must be specified",
    taxCalculation.jurisdiction != null &&
      taxCalculation.jurisdiction.length > 0,
  );
  TestValidator.predicate(
    "tax type must be specified",
    taxCalculation.tax_type != null && taxCalculation.tax_type.length > 0,
  );
  TestValidator.predicate(
    "calculation method must be specified",
    taxCalculation.calculation_method != null &&
      taxCalculation.calculation_method.length > 0,
  );
  TestValidator.equals(
    "currency must match order currency",
    taxCalculation.currency,
    order.currency_code,
  );
  TestValidator.equals(
    "source must be order_engine",
    taxCalculation.source,
    "order_engine",
  );
  TestValidator.predicate(
    "tax details array must not be empty",
    Array.isArray(taxCalculation.tax_details) &&
      taxCalculation.tax_details.length > 0,
  );
  // Tax details should be an array of strings (as per DTO definition)
  // Validate that each tax detail is a string
  for (const detail of taxCalculation.tax_details) {
    typia.assert<string>(detail);
  }
  // Validate metadata structure
  typia.assert<string>(taxCalculation.metadata);
  const metadata = JSON.parse(taxCalculation.metadata);
  TestValidator.predicate(
    "metadata has expected structure",
    metadata != null &&
      typeof metadata === "object" &&
      metadata.externalTaxServiceId != null &&
      metadata.requestId != null &&
      metadata.calculationVersion != null,
  );
  TestValidator.equals(
    "metadata external tax service is set",
    metadata.externalTaxServiceId,
    "Avalara",
  );
  // Step 11: Verify ownership - admin cannot access this tax calculation
  await TestValidator.error(
    "admin cannot retrieve tax calculation of other user's order",
    async () => {
      await api.functional.communityPlatform.orders.tax_calculations.at(
        adminConnection,
        {
          orderId: order.id,
          taxId: taxCalculationSummary.id,
        },
      );
    },
  );
  // Step 12: Verify member can retrieve their own tax calculation (additional confirmation)
  const retrievedByMember: ICommunityPlatformOrderTaxCalculation =
    await api.functional.communityPlatform.orders.tax_calculations.at(
      memberConnection,
      {
        orderId: order.id,
        taxId: taxCalculationSummary.id,
      },
    );
  typia.assert(retrievedByMember);
  TestValidator.equals(
    "member can access own tax calculation",
    retrievedByMember.id,
    taxCalculation.id,
  );
}
