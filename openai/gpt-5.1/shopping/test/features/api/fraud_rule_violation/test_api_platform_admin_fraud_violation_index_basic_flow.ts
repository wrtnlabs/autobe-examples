import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallFraudRuleViolation } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallFraudRuleViolation";
import type { IShoppingMallBrand } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallBrand";
import type { IShoppingMallCategoryTree } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategoryTree";
import type { IShoppingMallFraudRuleDefinition } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallFraudRuleDefinition";
import type { IShoppingMallFraudRuleViolation } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallFraudRuleViolation";
import type { IShoppingMallInventoryItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallInventoryItem";
import type { IShoppingMallPaymentMethod } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPaymentMethod";
import type { IShoppingMallPaymentTransaction } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPaymentTransaction";
import type { IShoppingMallPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPlatformAdmin";
import type { IShoppingMallPlatformAdminJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPlatformAdminJoin";
import type { IShoppingMallPlatformAdminLogin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPlatformAdminLogin";
import type { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import type { IShoppingMallProductOptionType } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductOptionType";
import type { IShoppingMallProductOptionValue } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductOptionValue";
import type { IShoppingMallProductSku } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductSku";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import type { IShoppingMallSellerJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerJoin";
import type { IShoppingMallSellerLogin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerLogin";

export async function test_api_platform_admin_fraud_violation_index_basic_flow(
  connection: api.IConnection,
) {
  // 1. Register platform admin
  const adminJoinBody = {
    email: `${RandomGenerator.alphabets(8)}@admin.test.com`,
    name: RandomGenerator.name(),
    password: RandomGenerator.alphaNumeric(12),
    ip: null,
    href: "https://admin.test.com/join",
    referrer: "https://admin.test.com/",
  } satisfies IShoppingMallPlatformAdminJoin.IRequest;

  const adminAuthorized: IShoppingMallPlatformAdmin.IAuthorized =
    await api.functional.auth.platformAdmin.join(connection, {
      body: adminJoinBody,
    });
  typia.assert(adminAuthorized);

  const adminEmail = adminAuthorized.email;
  const adminPassword = adminJoinBody.password;

  // 2. Login as platform admin again to ensure header/session is valid
  const adminLoginBody = {
    email: adminEmail,
    password: adminPassword,
    ip: null,
    href: "https://admin.test.com/login",
    referrer: "https://admin.test.com/",
  } satisfies IShoppingMallPlatformAdminLogin.IRequest;

  const adminLogin: IShoppingMallPlatformAdmin.IAuthorized =
    await api.functional.auth.platformAdmin.login(connection, {
      body: adminLoginBody,
    });
  typia.assert(adminLogin);

  // 3. Create category tree
  const categoryTreeCode = `tree-${RandomGenerator.alphaNumeric(8)}`;
  const categoryTreeBody = {
    code: categoryTreeCode,
    name: "Main Catalog Tree",
    description: "Primary category tree for fraud tests",
    active: true,
    defaultLocale: "en-US",
  } satisfies IShoppingMallCategoryTree.ICreate;

  const categoryTree: IShoppingMallCategoryTree =
    await api.functional.shoppingMall.platformAdmin.categoryTrees.create(
      connection,
      { body: categoryTreeBody },
    );
  typia.assert(categoryTree);

  // 4. Create brand
  const brandSlug = `brand-${RandomGenerator.alphaNumeric(8)}`;
  const brandBody = {
    name: "Fraud Test Brand",
    slug: brandSlug,
    description: "Brand for fraud violation index test",
    logo_uri: undefined,
  } satisfies IShoppingMallBrand.ICreate;

  const brand: IShoppingMallBrand =
    await api.functional.shoppingMall.platformAdmin.brands.create(connection, {
      body: brandBody,
    });
  typia.assert(brand);

  // 5. Create a seller and seller-owned product
  const sellerJoinBody = {
    email: `${RandomGenerator.alphabets(8)}@seller.test.com`,
    password: RandomGenerator.alphaNumeric(12),
    storeName: `Store-${RandomGenerator.alphabets(6)}`,
    contactPhone: RandomGenerator.mobile(),
  } satisfies IShoppingMallSellerJoin.IRequest;

  const sellerAuthorized: IShoppingMallSeller.IAuthorized =
    await api.functional.auth.seller.join(connection, {
      body: sellerJoinBody,
    });
  typia.assert(sellerAuthorized);

  const sellerEmail = sellerAuthorized.email;
  const sellerPassword = sellerJoinBody.password;

  // Ensure seller session via login
  const sellerLoginBody = {
    email: sellerEmail,
    password: sellerPassword,
    ip: null,
    href: "https://seller.test.com/login",
    referrer: "https://seller.test.com/",
  } satisfies IShoppingMallSellerLogin.IRequest;

  const sellerLogin: IShoppingMallSeller.IAuthorized =
    await api.functional.auth.seller.login(connection, {
      body: sellerLoginBody,
    });
  typia.assert(sellerLogin);

  // Seller product
  const sellerProductCode = `seller-prod-${RandomGenerator.alphaNumeric(8)}`;
  const sellerProductBody = {
    shopping_mall_seller_id: sellerAuthorized.id,
    shopping_mall_brand_id: brand.id,
    code: sellerProductCode,
    name: "Seller Test Product",
    short_description: "Seller product for fraud testing",
    description: RandomGenerator.content({ paragraphs: 2 }),
    status: "active",
    is_multi_sku: true,
    primary_image_uri: undefined,
    additional_data: null,
  } satisfies IShoppingMallProduct.ICreate;

  const sellerProduct: IShoppingMallProduct =
    await api.functional.shoppingMall.seller.products.create(connection, {
      body: sellerProductBody,
    });
  typia.assert(sellerProduct);

  // 6. Platform-admin product (using seller id from created seller)
  const adminProductCode = `admin-prod-${RandomGenerator.alphaNumeric(8)}`;
  const adminProductBody = {
    shopping_mall_seller_id: sellerAuthorized.id,
    shopping_mall_brand_id: brand.id,
    code: adminProductCode,
    name: "Admin Test Product",
    short_description: "Admin product for fraud testing",
    description: RandomGenerator.content({ paragraphs: 2 }),
    status: "active",
    is_multi_sku: true,
    primary_image_uri: undefined,
    additional_data: null,
  } satisfies IShoppingMallProduct.ICreate;

  const adminProduct: IShoppingMallProduct =
    await api.functional.shoppingMall.platformAdmin.products.create(
      connection,
      { body: adminProductBody },
    );
  typia.assert(adminProduct);

  // 7. Seller option type and value for the seller product
  const optionTypeBody = {
    name: "Size",
    display_name: "Size",
    display_order: 0 as number & tags.Type<"int32"> & tags.Minimum<0>,
  } satisfies IShoppingMallProductOptionType.ICreate;

  const optionType: IShoppingMallProductOptionType =
    await api.functional.shoppingMall.seller.products.optionTypes.create(
      connection,
      {
        productCode: sellerProduct.code,
        body: optionTypeBody,
      },
    );
  typia.assert(optionType);

  const optionValueBody = {
    value: "M",
    display_name: "Medium",
    display_order: 0 as number & tags.Type<"int32">,
    is_active: true,
  } satisfies IShoppingMallProductOptionValue.ICreate;

  const optionValue: IShoppingMallProductOptionValue =
    await api.functional.shoppingMall.seller.products.optionTypes.values.create(
      connection,
      {
        productCode: sellerProduct.code,
        productOptionTypeId: optionType.id,
        body: optionValueBody,
      },
    );
  typia.assert(optionValue);

  // 8. Seller SKU and inventory item
  const sellerSkuCode = `sku-${RandomGenerator.alphaNumeric(8)}`;
  const sellerSkuBody = {
    code: sellerSkuCode,
    name: "Seller SKU",
    listPrice: 100,
    salePrice: 90,
    currency: "USD",
    isActive: true,
    isPurchasable: true,
  } satisfies IShoppingMallProductSku.ICreate;

  const sellerSku: IShoppingMallProductSku =
    await api.functional.shoppingMall.seller.products.skus.create(connection, {
      productCode: sellerProduct.code,
      body: sellerSkuBody,
    });
  typia.assert(sellerSku);

  const inventoryBody = {
    product_sku_id: sellerSku.id,
    on_hand_quantity: 10 as number & tags.Type<"int32"> & tags.Minimum<0>,
    low_stock_threshold: 2 as number & tags.Type<"int32"> & tags.Minimum<0>,
    backorder_enabled: false,
    preorder_enabled: false,
  } satisfies IShoppingMallInventoryItem.ICreate;

  const inventoryItem: IShoppingMallInventoryItem =
    await api.functional.shoppingMall.seller.inventoryItems.create(connection, {
      body: inventoryBody,
    });
  typia.assert(inventoryItem);

  // 9. Admin SKU under admin product
  const adminSkuCode = `admin-sku-${RandomGenerator.alphaNumeric(8)}`;
  const adminSkuBody = {
    code: adminSkuCode,
    name: "Admin SKU",
    listPrice: 120,
    salePrice: 100,
    currency: "USD",
    isActive: true,
    isPurchasable: true,
  } satisfies IShoppingMallProductSku.ICreate;

  const adminSku: IShoppingMallProductSku =
    await api.functional.shoppingMall.platformAdmin.products.skus.create(
      connection,
      {
        productCode: adminProduct.code,
        body: adminSkuBody,
      },
    );
  typia.assert(adminSku);

  // 10. Payment method
  const now = new Date();
  const startsAt = new Date(now.getTime() - 5 * 60 * 1000).toISOString();
  const endsAt = new Date(now.getTime() + 60 * 60 * 1000).toISOString();

  const paymentMethodBody = {
    code: `pm-${RandomGenerator.alphaNumeric(6)}`,
    display_name: "Test Card",
    description: "Payment method for fraud test",
    provider_key: "test-provider",
    method_type: "card",
    currency_restriction: null,
    min_amount: null,
    max_amount: null,
    priority: 1 as number & tags.Type<"int32">,
    is_active: true,
    starts_at: startsAt,
    ends_at: endsAt,
  } satisfies IShoppingMallPaymentMethod.ICreate;

  const paymentMethod: IShoppingMallPaymentMethod =
    await api.functional.shoppingMall.platformAdmin.paymentMethods.create(
      connection,
      { body: paymentMethodBody },
    );
  typia.assert(paymentMethod);

  // 11. Fraud rule definition
  const fraudRuleCode = `RULE_${RandomGenerator.alphaNumeric(10)}`;
  const fraudRuleBody = {
    ruleCode: fraudRuleCode,
    name: "High Risk Payment Test Rule",
    description: "Flags test payments for fraud index validation",
    scope: "payment",
    severity: "high",
    ruleExpression: "true == true",
    isEnabled: true,
  } satisfies IShoppingMallFraudRuleDefinition.ICreate;

  const fraudRule: IShoppingMallFraudRuleDefinition =
    await api.functional.shoppingMall.platformAdmin.fraudRuleDefinitions.create(
      connection,
      { body: fraudRuleBody },
    );
  typia.assert(fraudRule);

  // 12. Payment transaction tied to the payment method
  const orderId = typia.random<string & tags.Format<"uuid">>();

  const paymentTxBody = {
    orderId,
    customerId: null,
    paymentMethodId: paymentMethod.id,
    paymentIntentKey: null,
    providerName: paymentMethod.provider_key ?? "test-provider",
    providerTransactionId: null,
    currency: "USD" as string & tags.MinLength<3> & tags.MaxLength<3>,
    authorizedAmount: 90,
    capturedAmount: null,
    paymentStatus: "payment_pending",
    providerStatus: null,
    failureReasonCode: null,
    failureReasonMessage: null,
    requiresManualReview: false,
    metadataJson: null,
  } satisfies IShoppingMallPaymentTransaction.ICreate;

  const paymentTx: IShoppingMallPaymentTransaction =
    await api.functional.shoppingMall.platformAdmin.paymentTransactions.create(
      connection,
      { body: paymentTxBody },
    );
  typia.assert(paymentTx);

  // 13. Index fraud rule violations with filters
  const createdFrom = new Date(
    now.getTime() - 24 * 60 * 60 * 1000,
  ).toISOString();
  const createdTo = new Date(now.getTime() + 24 * 60 * 60 * 1000).toISOString();

  const requestBody = {
    page: 1 as number & tags.Type<"int32"> & tags.Minimum<1>,
    limit: 20 as number &
      tags.Type<"int32"> &
      tags.Minimum<1> &
      tags.Maximum<200>,
    sortBy: "occurred_at",
    sortOrder: "desc",
    ruleCodes: [fraudRule.ruleCode],
    excludeRuleCodes: undefined,
    entityTypes: undefined,
    entityIds: undefined,
    minSeverity: undefined,
    maxSeverity: undefined,
    status: undefined,
    decisionOutcomes: undefined,
    createdFrom,
    createdTo,
    updatedFrom: undefined,
    updatedTo: undefined,
    search: undefined,
  } satisfies IShoppingMallFraudRuleViolation.IRequest;

  const pageResult: IPageIShoppingMallFraudRuleViolation.ISummary =
    await api.functional.shoppingMall.platformAdmin.fraudRuleViolations.index(
      connection,
      { body: requestBody },
    );
  typia.assert(pageResult);

  // 14. Basic pagination assertions
  const pagination = pageResult.pagination;
  TestValidator.predicate(
    "pagination.current is non-negative",
    pagination.current >= 0,
  );
  TestValidator.predicate(
    "pagination.limit is non-negative",
    pagination.limit >= 0,
  );
  TestValidator.predicate(
    "pagination.records >= returned data length",
    pagination.records >= pageResult.data.length,
  );
  if (pagination.limit > 0) {
    const expectedPages =
      pagination.records === 0
        ? 0
        : Math.ceil(pagination.records / pagination.limit);
    TestValidator.equals(
      "pagination.pages matches records/limit",
      pagination.pages,
      expectedPages,
    );
  }

  // 15. Business assertions when violations exist
  if (pageResult.data.length > 0) {
    for (const violation of pageResult.data) {
      // Ensure rule definition code matches filter
      TestValidator.predicate(
        "violation rule code is one of requested ruleCodes",
        requestBody.ruleCodes !== undefined &&
          requestBody.ruleCodes.includes(violation.rule_definition.rule_code),
      );

      // Severity is non-empty
      TestValidator.predicate(
        "violation severity is non-empty",
        violation.severity.length > 0,
      );

      // occurred_at within requested range
      const occurred = new Date(violation.occurred_at).getTime();
      const from = new Date(requestBody.createdFrom ?? createdFrom).getTime();
      const to = new Date(requestBody.createdTo ?? createdTo).getTime();

      TestValidator.predicate(
        "violation occurred_at is within requested range",
        occurred >= from && occurred <= to,
      );
    }
  }
}
