import { Module } from "@nestjs/common";

import { EcommerceAdminAdminsController } from "./controllers/ecommerce/admin/admins/EcommerceAdminAdminsController";
import { EcommerceAdminAnalyticsSalesController } from "./controllers/ecommerce/admin/analytics/sales/EcommerceAdminAnalyticsSalesController";
import { EcommerceAdminConfigsAnalyticsController } from "./controllers/ecommerce/admin/configs/analytics/EcommerceAdminConfigsAnalyticsController";
import { EcommerceAdminDashboardsController } from "./controllers/ecommerce/admin/dashboards/EcommerceAdminDashboardsController";
import { EcommerceAdminOrdersCancellation_requestsController } from "./controllers/ecommerce/admin/orders/cancellation-requests/EcommerceAdminOrdersCancellation_requestsController";
import { EcommerceAdminOrdersItemsController } from "./controllers/ecommerce/admin/orders/items/EcommerceAdminOrdersItemsController";
import { EcommerceAdminOrdersRefund_requestsController } from "./controllers/ecommerce/admin/orders/refund-requests/EcommerceAdminOrdersRefund_requestsController";
import { EcommerceAdminOrdersShipmentsController } from "./controllers/ecommerce/admin/orders/shipments/EcommerceAdminOrdersShipmentsController";
import { EcommerceAdminSnapshotsController } from "./controllers/ecommerce/admin/snapshots/EcommerceAdminSnapshotsController";
import { EcommerceAdminController } from "./controllers/ecommerce/admin/statistics/EcommerceAdminController";
import { EcommerceAdminStatus_distributionController } from "./controllers/ecommerce/admin/status-distribution/EcommerceAdminStatus_distributionController";
import { EcommerceAdminStatusesDashboardController } from "./controllers/ecommerce/admin/statuses/dashboard/EcommerceAdminStatusesDashboardController";
import { EcommerceAdminSystem_configsController } from "./controllers/ecommerce/admin/system-configs/EcommerceAdminSystem_configsController";
import { EcommerceAdminSystem_statusesController } from "./controllers/ecommerce/admin/system-statuses/EcommerceAdminSystem_statusesController";
import { EcommerceAuthAdminController } from "./controllers/ecommerce/auth/admin/EcommerceAuthAdminController";
import { EcommerceAuthCustomerController } from "./controllers/ecommerce/auth/customer/EcommerceAuthCustomerController";
import { EcommerceAuthSellerController } from "./controllers/ecommerce/auth/seller/EcommerceAuthSellerController";
import { EcommerceCategoriesController } from "./controllers/ecommerce/categories/EcommerceCategoriesController";
import { EcommerceCustomerAddressesController } from "./controllers/ecommerce/customer/addresses/EcommerceCustomerAddressesController";
import { EcommerceCustomerCartsController } from "./controllers/ecommerce/customer/carts/EcommerceCustomerCartsController";
import { EcommerceCustomerCartsItemsController } from "./controllers/ecommerce/customer/carts/items/EcommerceCustomerCartsItemsController";
import { EcommerceCustomerCartsSnapshotsController } from "./controllers/ecommerce/customer/carts/snapshots/EcommerceCustomerCartsSnapshotsController";
import { EcommerceCustomerDefault_addressesController } from "./controllers/ecommerce/customer/default-addresses/EcommerceCustomerDefault_addressesController";
import { EcommerceCustomerEmail_verificationsController } from "./controllers/ecommerce/customer/email-verifications/EcommerceCustomerEmail_verificationsController";
import { EcommerceCustomerOrdersController } from "./controllers/ecommerce/customer/orders/EcommerceCustomerOrdersController";
import { EcommerceCustomerOrdersCancellation_requestsController } from "./controllers/ecommerce/customer/orders/cancellation-requests/EcommerceCustomerOrdersCancellation_requestsController";
import { EcommerceCustomerOrdersItemsController } from "./controllers/ecommerce/customer/orders/items/EcommerceCustomerOrdersItemsController";
import { EcommerceCustomerOrdersRefund_requestsController } from "./controllers/ecommerce/customer/orders/refund-requests/EcommerceCustomerOrdersRefund_requestsController";
import { EcommerceCustomerOrdersShipmentsController } from "./controllers/ecommerce/customer/orders/shipments/EcommerceCustomerOrdersShipmentsController";
import { EcommerceCustomerPassword_resetsController } from "./controllers/ecommerce/customer/password-resets/EcommerceCustomerPassword_resetsController";
import { EcommerceCustomerProductsController } from "./controllers/ecommerce/customer/products/EcommerceCustomerProductsController";
import { EcommerceCustomerProductsReviewsController } from "./controllers/ecommerce/customer/products/reviews/EcommerceCustomerProductsReviewsController";
import { EcommerceCustomerProductsReviewsSnapshotsController } from "./controllers/ecommerce/customer/products/reviews/snapshots/EcommerceCustomerProductsReviewsSnapshotsController";
import { EcommerceCustomerProductsSearchController } from "./controllers/ecommerce/customer/products/search/EcommerceCustomerProductsSearchController";
import { EcommerceCustomerProfileController } from "./controllers/ecommerce/customer/profile/EcommerceCustomerProfileController";
import { EcommerceCustomerSessionsController } from "./controllers/ecommerce/customer/sessions/EcommerceCustomerSessionsController";
import { EcommerceCustomerWishlist_itemsController } from "./controllers/ecommerce/customer/wishlist-items/EcommerceCustomerWishlist_itemsController";
import { EcommerceCustomersController } from "./controllers/ecommerce/customers/EcommerceCustomersController";
import { EcommerceProductsController } from "./controllers/ecommerce/products/EcommerceProductsController";
import { EcommerceProductsImagesController } from "./controllers/ecommerce/products/images/EcommerceProductsImagesController";
import { EcommerceProductsVariantsController } from "./controllers/ecommerce/products/variants/EcommerceProductsVariantsController";
import { EcommerceProductsVariantsInventoriesController } from "./controllers/ecommerce/products/variants/inventories/EcommerceProductsVariantsInventoriesController";
import { EcommerceProductsVariantsOptionsController } from "./controllers/ecommerce/products/variants/options/EcommerceProductsVariantsOptionsController";
import { EcommerceSeller_profilesController } from "./controllers/ecommerce/seller-profiles/EcommerceSeller_profilesController";
import { EcommerceSellerDashboardController } from "./controllers/ecommerce/seller/dashboard/EcommerceSellerDashboardController";
import { EcommerceSellerSeller_email_verificationsController } from "./controllers/ecommerce/seller/seller-email-verifications/EcommerceSellerSeller_email_verificationsController";
import { EcommerceSellerSeller_password_resetsController } from "./controllers/ecommerce/seller/seller-password-resets/EcommerceSellerSeller_password_resetsController";
import { EcommerceSellerSeller_sessionsController } from "./controllers/ecommerce/seller/seller-sessions/EcommerceSellerSeller_sessionsController";
import { EcommerceSellersController } from "./controllers/ecommerce/sellers/EcommerceSellersController";
import { EcommerceSellersProfileController } from "./controllers/ecommerce/sellers/profile/EcommerceSellersProfileController";
import { EcommerceSellersSeller_profile_snapshotsController } from "./controllers/ecommerce/sellers/seller-profile-snapshots/EcommerceSellersSeller_profile_snapshotsController";

@Module({
  controllers: [
    EcommerceAuthCustomerController,
    EcommerceAuthSellerController,
    EcommerceAuthAdminController,
    EcommerceCustomersController,
    EcommerceCustomerProfileController,
    EcommerceCustomerSessionsController,
    EcommerceCustomerPassword_resetsController,
    EcommerceCustomerEmail_verificationsController,
    EcommerceCustomerAddressesController,
    EcommerceCustomerDefault_addressesController,
    EcommerceSellersController,
    EcommerceSeller_profilesController,
    EcommerceSellersProfileController,
    EcommerceSellerSeller_sessionsController,
    EcommerceSellerSeller_password_resetsController,
    EcommerceSellerSeller_email_verificationsController,
    EcommerceSellersSeller_profile_snapshotsController,
    EcommerceAdminAdminsController,
    EcommerceCategoriesController,
    EcommerceProductsController,
    EcommerceProductsImagesController,
    EcommerceProductsVariantsController,
    EcommerceProductsVariantsInventoriesController,
    EcommerceProductsVariantsOptionsController,
    EcommerceCustomerOrdersController,
    EcommerceCustomerOrdersItemsController,
    EcommerceAdminOrdersItemsController,
    EcommerceCustomerOrdersShipmentsController,
    EcommerceAdminOrdersShipmentsController,
    EcommerceAdminOrdersCancellation_requestsController,
    EcommerceCustomerOrdersCancellation_requestsController,
    EcommerceAdminOrdersRefund_requestsController,
    EcommerceCustomerOrdersRefund_requestsController,
    EcommerceCustomerCartsController,
    EcommerceCustomerCartsItemsController,
    EcommerceCustomerCartsSnapshotsController,
    EcommerceCustomerWishlist_itemsController,
    EcommerceCustomerProductsController,
    EcommerceCustomerProductsReviewsController,
    EcommerceCustomerProductsReviewsSnapshotsController,
    EcommerceAdminSystem_configsController,
    EcommerceAdminSystem_statusesController,
    EcommerceAdminSnapshotsController,
    EcommerceAdminDashboardsController,
    EcommerceCustomerProductsSearchController,
    EcommerceAdminAnalyticsSalesController,
    EcommerceSellerDashboardController,
    EcommerceAdminController,
    EcommerceAdminStatus_distributionController,
    EcommerceAdminStatusesDashboardController,
    EcommerceAdminConfigsAnalyticsController,
  ],
})
export class MyModule {}
