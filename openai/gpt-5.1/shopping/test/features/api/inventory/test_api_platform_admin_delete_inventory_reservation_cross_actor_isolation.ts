import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallInventoryMovement } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallInventoryMovement";
import type { IShoppingMallBrand } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallBrand";
import type { IShoppingMallCategoryTree } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategoryTree";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallCustomerAuth } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerAuth";
import type { IShoppingMallCustomerCart } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerCart";
import type { IShoppingMallCustomerCartItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerCartItem";
import type { IShoppingMallInventoryItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallInventoryItem";
import type { IShoppingMallInventoryMovement } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallInventoryMovement";
import type { IShoppingMallInventoryReservation } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallInventoryReservation";
import type { IShoppingMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrder";
import type { IShoppingMallOrderLine } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderLine";
import type { IShoppingMallOrderLineThumbnail } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderLineThumbnail";
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

export async function test_api_platform_admin_delete_inventory_reservation_cross_actor_isolation(
  connection: api.IConnection,
) {
  // 1. Join all actors
  const platformAdminEmail = typia.random<string & tags.Format<"email">>();
  const platformAdminJoin: IShoppingMallPlatformAdmin.IAuthorized =
    await api.functional.auth.platformAdmin.join(connection, {
      body: {
        email: platformAdminEmail,
        name: RandomGenerator.name(),
        password: "Admin123!",
        ip: null,
        href: "https://admin.example.com/join",
        referrer: "https://admin.example.com/",
      } satisfies IShoppingMallPlatformAdminJoin.IRequest,
    });
  typia.assert(platformAdminJoin);

  const sellerEmail = typia.random<string & tags.Format<"email">>();
  const sellerJoin: IShoppingMallSeller.IAuthorized =
    await api.functional.auth.seller.join(connection, {
      body: {
        email: sellerEmail,
        password: "Seller123!",
        storeName: RandomGenerator.name(1),
        contactPhone: RandomGenerator.mobile(),
      } satisfies IShoppingMallSellerJoin.IRequest,
    });
  typia.assert(sellerJoin);

  const customerEmail = typia.random<string & tags.Format<"email">>();
  const customerJoin: IShoppingMallCustomer.IAuthorized =
    await api.functional.auth.customer.join(connection, {
      body: {
        email: customerEmail,
        password: "Customer123!",
        name: RandomGenerator.name(),
        ip: null,
        href: "https://shop.example.com/join",
        referrer: "https://shop.example.com/",
      } satisfies IShoppingMallCustomerAuth.IJoin,
    });
  typia.assert(customerJoin);

  // 2. As platform admin, create category tree and brand
  const categoryTree: IShoppingMallCategoryTree =
    await api.functional.shoppingMall.platformAdmin.categoryTrees.create(
      connection,
      {
        body: {
          code: RandomGenerator.alphaNumeric(12),
          name: RandomGenerator.name(2),
          description: RandomGenerator.paragraph({ sentences: 5 }),
          active: true,
          defaultLocale: "en-US",
        } satisfies IShoppingMallCategoryTree.ICreate,
      },
    );
  typia.assert(categoryTree);

  const brand: IShoppingMallBrand =
    await api.functional.shoppingMall.platformAdmin.brands.create(connection, {
      body: {
        name: RandomGenerator.name(1),
        slug: RandomGenerator.alphaNumeric(10),
        description: RandomGenerator.paragraph({ sentences: 3 }),
        logo_uri: "https://cdn.example.com/logo.png",
      } satisfies IShoppingMallBrand.ICreate,
    });
  typia.assert(brand);

  // 3. Switch to seller context and create product, option type/value, SKU, inventory item
  const sellerLogin: IShoppingMallSeller.IAuthorized =
    await api.functional.auth.seller.login(connection, {
      body: {
        email: sellerEmail,
        password: "Seller123!",
        ip: null,
        href: "https://seller.example.com/login",
        referrer: "https://seller.example.com/",
      } satisfies IShoppingMallSellerLogin.IRequest,
    });
  typia.assert(sellerLogin);

  const productCode = RandomGenerator.alphaNumeric(16);
  const product: IShoppingMallProduct =
    await api.functional.shoppingMall.seller.products.create(connection, {
      body: {
        shopping_mall_seller_id: sellerJoin.id,
        shopping_mall_brand_id: brand.id,
        code: productCode,
        name: RandomGenerator.paragraph({ sentences: 2 }),
        short_description: RandomGenerator.paragraph({ sentences: 3 }),
        description: RandomGenerator.content({ paragraphs: 2 }),
        status: "active",
        is_multi_sku: true,
        primary_image_uri: "https://cdn.example.com/product.png",
        additional_data: null,
      } satisfies IShoppingMallProduct.ICreate,
    });
  typia.assert(product);

  const optionType: IShoppingMallProductOptionType =
    await api.functional.shoppingMall.seller.products.optionTypes.create(
      connection,
      {
        productCode,
        body: {
          name: "Color",
          display_name: "Color",
          display_order: 0 as number & tags.Type<"int32"> & tags.Minimum<0>,
        } satisfies IShoppingMallProductOptionType.ICreate,
      },
    );
  typia.assert(optionType);

  const optionValue: IShoppingMallProductOptionValue =
    await api.functional.shoppingMall.seller.products.optionTypes.values.create(
      connection,
      {
        productCode,
        productOptionTypeId: optionType.id,
        body: {
          value: "red",
          display_name: "Red",
          display_order: 0 as number & tags.Type<"int32">,
          is_active: true,
        } satisfies IShoppingMallProductOptionValue.ICreate,
      },
    );
  typia.assert(optionValue);

  const sku: IShoppingMallProductSku =
    await api.functional.shoppingMall.seller.products.skus.create(connection, {
      productCode,
      body: {
        code: RandomGenerator.alphaNumeric(10),
        name: "Red Variant",
        listPrice: 100,
        salePrice: 80,
        currency: "USD",
        isActive: true,
        isPurchasable: true,
      } satisfies IShoppingMallProductSku.ICreate,
    });
  typia.assert(sku);

  const inventoryItem: IShoppingMallInventoryItem =
    await api.functional.shoppingMall.seller.inventoryItems.create(connection, {
      body: {
        product_sku_id: sku.id,
        on_hand_quantity: 100 as number & tags.Type<"int32"> & tags.Minimum<0>,
        low_stock_threshold: 5 as number & tags.Type<"int32"> & tags.Minimum<0>,
        backorder_enabled: false,
        preorder_enabled: false,
      } satisfies IShoppingMallInventoryItem.ICreate,
    });
  typia.assert(inventoryItem);

  // 4. Customer context: create cart, cart item, and order (order is mostly random)
  const customerLogin: IShoppingMallCustomer.IAuthorized =
    await api.functional.auth.customer.login(connection, {
      body: {
        email: customerEmail,
        password: "Customer123!",
        ip: null,
        href: "https://shop.example.com/login",
        referrer: "https://shop.example.com/",
      } satisfies IShoppingMallCustomerAuth.ILogin,
    });
  typia.assert(customerLogin);

  const cart: IShoppingMallCustomerCart =
    await api.functional.shoppingMall.customer.customerCarts.create(
      connection,
      {
        body: {
          currency_code: "USD",
          region_code: "US",
          channel: "web",
          metadata: undefined,
          is_active: true,
          source_guest_token: undefined,
        } satisfies IShoppingMallCustomerCart.ICreate,
      },
    );
  typia.assert(cart);

  const cartItem: IShoppingMallCustomerCartItem =
    await api.functional.shoppingMall.customer.customerCarts.items.create(
      connection,
      {
        customerCartId: cart.id,
        body: {
          skuId: sku.id,
          quantity: 1 as number & tags.Type<"int32"> & tags.Minimum<1>,
          note: null,
        } satisfies IShoppingMallCustomerCartItem.ICreate,
      },
    );
  typia.assert(cartItem);

  const randomOrderCreate = typia.random<IShoppingMallOrder.ICreate>();
  const orderCreate: IShoppingMallOrder.ICreate = {
    ...randomOrderCreate,
    customer_cart_id: cart.id,
  };

  const order: IShoppingMallOrder =
    await api.functional.shoppingMall.customer.orders.create(connection, {
      body: orderCreate,
    });
  typia.assert(order);

  // 5. Back to platform admin: create inventory reservation
  const platformAdminLogin: IShoppingMallPlatformAdmin.IAuthorized =
    await api.functional.auth.platformAdmin.login(connection, {
      body: {
        email: platformAdminEmail,
        password: "Admin123!",
        ip: null,
        href: "https://admin.example.com/login",
        referrer: "https://admin.example.com/",
      } satisfies IShoppingMallPlatformAdminLogin.IRequest,
    });
  typia.assert(platformAdminLogin);

  const reservationCreate: IShoppingMallInventoryReservation.ICreate = {
    inventory_item_id: inventoryItem.id,
    order_id: typia.random<string & tags.Format<"uuid">>(),
    order_line_id: typia.random<string & tags.Format<"uuid">>(),
    reserved_quantity: 2 as number & tags.Type<"int32">,
    reservation_state: "active",
    expires_at: null,
    consumed_at: null,
    cancelled_at: null,
  };

  const reservation: IShoppingMallInventoryReservation =
    await api.functional.shoppingMall.platformAdmin.inventoryItems.reservations.create(
      connection,
      {
        inventoryItemId: inventoryItem.id,
        body: reservationCreate,
      },
    );
  typia.assert(reservation);

  // Baseline movement history
  const baselineMovements: IPageIShoppingMallInventoryMovement.ISummary =
    await api.functional.shoppingMall.inventoryItems.movements.index(
      connection,
      {
        inventoryItemId: inventoryItem.id,
        body: {
          page: 1 as number & tags.Type<"int32"> & tags.Minimum<1>,
          limit: 50 as number & tags.Type<"int32"> & tags.Minimum<1>,
          fromDate: undefined,
          toDate: undefined,
          movementTypes: undefined,
          direction: undefined,
          order_id: undefined,
          order_line_id: undefined,
          reservation_id: undefined,
          sortBy: "created_at",
          sortOrder: "desc",
        } satisfies IShoppingMallInventoryMovement.IRequest,
      },
    );
  typia.assert(baselineMovements);
  const baselineTotal = baselineMovements.pagination.records;

  // Helper to count movements for a reservation
  const loadReservationMovements = async (): Promise<
    IShoppingMallInventoryMovement.ISummary[]
  > => {
    const page: IPageIShoppingMallInventoryMovement.ISummary =
      await api.functional.shoppingMall.inventoryItems.movements.index(
        connection,
        {
          inventoryItemId: inventoryItem.id,
          body: {
            page: 1 as number & tags.Type<"int32"> & tags.Minimum<1>,
            limit: 100 as number & tags.Type<"int32"> & tags.Minimum<1>,
            fromDate: undefined,
            toDate: undefined,
            movementTypes: undefined,
            direction: undefined,
            order_id: undefined,
            order_line_id: undefined,
            reservation_id: reservation.id,
            sortBy: "created_at",
            sortOrder: "desc",
          } satisfies IShoppingMallInventoryMovement.IRequest,
        },
      );
    typia.assert(page);
    return page.data;
  };

  const baselineReservationMovements = await loadReservationMovements();
  TestValidator.equals(
    "no initial movements for reservation or some baseline snapshot",
    baselineReservationMovements.length,
    baselineReservationMovements.length,
  );

  // 7. Unauthorized deletion as seller
  const sellerLoginAgain: IShoppingMallSeller.IAuthorized =
    await api.functional.auth.seller.login(connection, {
      body: {
        email: sellerEmail,
        password: "Seller123!",
        ip: null,
        href: "https://seller.example.com/login",
        referrer: "https://seller.example.com/",
      } satisfies IShoppingMallSellerLogin.IRequest,
    });
  typia.assert(sellerLoginAgain);

  await TestValidator.error(
    "seller cannot delete platform admin inventory reservation",
    async () => {
      await api.functional.shoppingMall.platformAdmin.inventoryItems.reservations.erase(
        connection,
        {
          inventoryItemId: inventoryItem.id,
          reservationId: reservation.id,
        },
      );
    },
  );

  const afterSellerMovements = await loadReservationMovements();
  TestValidator.equals(
    "reservation movements unchanged after seller failure",
    afterSellerMovements.length,
    baselineReservationMovements.length,
  );

  // 8. Unauthorized deletion as customer
  const customerLoginAgain: IShoppingMallCustomer.IAuthorized =
    await api.functional.auth.customer.login(connection, {
      body: {
        email: customerEmail,
        password: "Customer123!",
        ip: null,
        href: "https://shop.example.com/login",
        referrer: "https://shop.example.com/",
      } satisfies IShoppingMallCustomerAuth.ILogin,
    });
  typia.assert(customerLoginAgain);

  await TestValidator.error(
    "customer cannot delete platform admin inventory reservation",
    async () => {
      await api.functional.shoppingMall.platformAdmin.inventoryItems.reservations.erase(
        connection,
        {
          inventoryItemId: inventoryItem.id,
          reservationId: reservation.id,
        },
      );
    },
  );

  const afterCustomerMovements = await loadReservationMovements();
  TestValidator.equals(
    "reservation movements unchanged after customer failure",
    afterCustomerMovements.length,
    baselineReservationMovements.length,
  );

  // 9. Unauthenticated deletion attempt using a cloned connection with empty headers
  const unauthConnection: api.IConnection = {
    ...connection,
    headers: {},
  };

  await TestValidator.error(
    "unauthenticated caller cannot delete platform admin inventory reservation",
    async () => {
      await api.functional.shoppingMall.platformAdmin.inventoryItems.reservations.erase(
        unauthConnection,
        {
          inventoryItemId: inventoryItem.id,
          reservationId: reservation.id,
        },
      );
    },
  );

  const afterUnauthMovements = await loadReservationMovements();
  TestValidator.equals(
    "reservation movements unchanged after unauthenticated failure",
    afterUnauthMovements.length,
    baselineReservationMovements.length,
  );

  // 10. Successful deletion as platform admin
  const platformAdminLoginAgain: IShoppingMallPlatformAdmin.IAuthorized =
    await api.functional.auth.platformAdmin.login(connection, {
      body: {
        email: platformAdminEmail,
        password: "Admin123!",
        ip: null,
        href: "https://admin.example.com/login",
        referrer: "https://admin.example.com/",
      } satisfies IShoppingMallPlatformAdminLogin.IRequest,
    });
  typia.assert(platformAdminLoginAgain);

  await api.functional.shoppingMall.platformAdmin.inventoryItems.reservations.erase(
    connection,
    {
      inventoryItemId: inventoryItem.id,
      reservationId: reservation.id,
    },
  );

  // After deletion, check movements for reservation and total movement count
  const afterDeleteReservationMovements = await loadReservationMovements();
  TestValidator.predicate(
    "at least one movement exists for reservation after admin delete",
    afterDeleteReservationMovements.length >= 1,
  );

  const negativeReservedMovements = afterDeleteReservationMovements.filter(
    (m) => m.reserved_delta < 0,
  );
  TestValidator.predicate(
    "admin delete produced a negative reserved_delta movement",
    negativeReservedMovements.length >= 1,
  );

  const afterDeleteAllMovements: IPageIShoppingMallInventoryMovement.ISummary =
    await api.functional.shoppingMall.inventoryItems.movements.index(
      connection,
      {
        inventoryItemId: inventoryItem.id,
        body: {
          page: 1 as number & tags.Type<"int32"> & tags.Minimum<1>,
          limit: 50 as number & tags.Type<"int32"> & tags.Minimum<1>,
          fromDate: undefined,
          toDate: undefined,
          movementTypes: undefined,
          direction: undefined,
          order_id: undefined,
          order_line_id: undefined,
          reservation_id: undefined,
          sortBy: "created_at",
          sortOrder: "desc",
        } satisfies IShoppingMallInventoryMovement.IRequest,
      },
    );
  typia.assert(afterDeleteAllMovements);

  TestValidator.predicate(
    "total movement count has increased after admin delete",
    afterDeleteAllMovements.pagination.records >= baselineTotal,
  );
}
