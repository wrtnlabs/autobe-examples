import { Module } from "@nestjs/common";

import { EcommerceAdminAdminsController } from "./controllers/ecommerce/admin/admins/EcommerceAdminAdminsController";
import { EcommerceAdminAudit_logsController } from "./controllers/ecommerce/admin/audit-logs/EcommerceAdminAudit_logsController";
import { EcommerceAdminCustomersController } from "./controllers/ecommerce/admin/customers/EcommerceAdminCustomersController";
import { EcommerceAdminOrdersSnapshotsController } from "./controllers/ecommerce/admin/orders/snapshots/EcommerceAdminOrdersSnapshotsController";
import { EcommerceAdminSellersController } from "./controllers/ecommerce/admin/sellers/EcommerceAdminSellersController";
import { EcommerceAuthAdminController } from "./controllers/ecommerce/auth/admin/EcommerceAuthAdminController";
import { EcommerceAuthCustomerController } from "./controllers/ecommerce/auth/customer/EcommerceAuthCustomerController";
import { EcommerceAuthSellerController } from "./controllers/ecommerce/auth/seller/EcommerceAuthSellerController";
import { EcommerceCustomerAddressesController } from "./controllers/ecommerce/customer/addresses/EcommerceCustomerAddressesController";
import { EcommerceCustomerAnalyticsTop_productsController } from "./controllers/ecommerce/customer/analytics/top-products/EcommerceCustomerAnalyticsTop_productsController";
import { EcommerceCustomerCartsController } from "./controllers/ecommerce/customer/carts/EcommerceCustomerCartsController";
import { EcommerceCustomerMeAddressesController } from "./controllers/ecommerce/customer/me/addresses/EcommerceCustomerMeAddressesController";
import { EcommerceCustomerMeAddresses_defaultController } from "./controllers/ecommerce/customer/me/addresses/default/EcommerceCustomerMeAddresses_defaultController";
import { EcommerceCustomerMeProfileController } from "./controllers/ecommerce/customer/me/profile/EcommerceCustomerMeProfileController";
import { EcommerceCustomerOrdersController } from "./controllers/ecommerce/customer/orders/EcommerceCustomerOrdersController";
import { EcommerceCustomerOrdersCancellation_requestsController } from "./controllers/ecommerce/customer/orders/cancellation-requests/EcommerceCustomerOrdersCancellation_requestsController";
import { EcommerceCustomerOrdersItemsController } from "./controllers/ecommerce/customer/orders/items/EcommerceCustomerOrdersItemsController";
import { EcommerceCustomerOrdersRefund_requestsController } from "./controllers/ecommerce/customer/orders/refund-requests/EcommerceCustomerOrdersRefund_requestsController";
import { EcommerceCustomerOrdersShipmentsController } from "./controllers/ecommerce/customer/orders/shipments/EcommerceCustomerOrdersShipmentsController";
import { EcommerceCustomerOrdersSnapshotsController } from "./controllers/ecommerce/customer/orders/snapshots/EcommerceCustomerOrdersSnapshotsController";
import { EcommerceCustomerProfileController } from "./controllers/ecommerce/customer/profile/EcommerceCustomerProfileController";
import { EcommerceCustomerSessionsController } from "./controllers/ecommerce/customer/sessions/EcommerceCustomerSessionsController";
import { EcommerceController } from "./controllers/ecommerce/noop/EcommerceController";
import { EcommerceProductsCategoriesController } from "./controllers/ecommerce/products/categories/EcommerceProductsCategoriesController";
import { EcommerceProductsSnapshotsController } from "./controllers/ecommerce/products/snapshots/EcommerceProductsSnapshotsController";
import { EcommerceSellerAnalyticsInventoriesController } from "./controllers/ecommerce/seller/analytics/inventories/EcommerceSellerAnalyticsInventoriesController";
import { EcommerceSellerOrdersCancellation_requestsController } from "./controllers/ecommerce/seller/orders/cancellation-requests/EcommerceSellerOrdersCancellation_requestsController";
import { EcommerceSellerOrdersItemsController } from "./controllers/ecommerce/seller/orders/items/EcommerceSellerOrdersItemsController";
import { EcommerceSellerOrdersRefund_requestsController } from "./controllers/ecommerce/seller/orders/refund-requests/EcommerceSellerOrdersRefund_requestsController";
import { EcommerceSellerOrdersShipmentsController } from "./controllers/ecommerce/seller/orders/shipments/EcommerceSellerOrdersShipmentsController";
import { EcommerceSellerOrdersSnapshotsController } from "./controllers/ecommerce/seller/orders/snapshots/EcommerceSellerOrdersSnapshotsController";
import { EcommerceSellerProductsController } from "./controllers/ecommerce/seller/products/EcommerceSellerProductsController";
import { EcommerceSellerProductsImagesController } from "./controllers/ecommerce/seller/products/images/EcommerceSellerProductsImagesController";
import { EcommerceSellerProductsVariantsController } from "./controllers/ecommerce/seller/products/variants/EcommerceSellerProductsVariantsController";
import { EcommerceSellerProfileController } from "./controllers/ecommerce/seller/profile/EcommerceSellerProfileController";
import { EcommerceSellerProfileSnapshotsController } from "./controllers/ecommerce/seller/profile/snapshots/EcommerceSellerProfileSnapshotsController";

@Module({
  controllers: [
    EcommerceAuthCustomerController,
    EcommerceAuthSellerController,
    EcommerceAuthAdminController,
    EcommerceAdminCustomersController,
    EcommerceAdminSellersController,
    EcommerceAdminAdminsController,
    EcommerceCustomerMeProfileController,
    EcommerceCustomerSessionsController,
    EcommerceAdminAudit_logsController,
    EcommerceCustomerProfileController,
    EcommerceCustomerAddressesController,
    EcommerceCustomerMeAddressesController,
    EcommerceCustomerMeAddresses_defaultController,
    EcommerceSellerProfileController,
    EcommerceSellerProfileSnapshotsController,
    EcommerceSellerProductsController,
    EcommerceSellerProductsVariantsController,
    EcommerceSellerProductsImagesController,
    EcommerceProductsSnapshotsController,
    EcommerceProductsCategoriesController,
    EcommerceCustomerOrdersItemsController,
    EcommerceSellerOrdersItemsController,
    EcommerceCustomerOrdersShipmentsController,
    EcommerceSellerOrdersShipmentsController,
    EcommerceCustomerOrdersSnapshotsController,
    EcommerceSellerOrdersSnapshotsController,
    EcommerceAdminOrdersSnapshotsController,
    EcommerceCustomerOrdersCancellation_requestsController,
    EcommerceSellerOrdersCancellation_requestsController,
    EcommerceCustomerOrdersRefund_requestsController,
    EcommerceSellerOrdersRefund_requestsController,
    EcommerceCustomerOrdersController,
    EcommerceCustomerCartsController,
    EcommerceCustomerAnalyticsTop_productsController,
    EcommerceSellerAnalyticsInventoriesController,
    EcommerceController,
  ],
})
export class MyModule {}
