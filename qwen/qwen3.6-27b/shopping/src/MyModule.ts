import { Module } from "@nestjs/common";

import { EcommerceplatformAdminAdministrator_promotion_requestsController } from "./controllers/ecommercePlatform/admin/administrator-promotion-requests/EcommerceplatformAdminAdministrator_promotion_requestsController";
import { EcommerceplatformAdminAudit_logsController } from "./controllers/ecommercePlatform/admin/audit-logs/EcommerceplatformAdminAudit_logsController";
import { EcommerceplatformAdminCategoriesController } from "./controllers/ecommercePlatform/admin/categories/EcommerceplatformAdminCategoriesController";
import { EcommerceplatformAdminCustomersAddressesController } from "./controllers/ecommercePlatform/admin/customers/addresses/EcommerceplatformAdminCustomersAddressesController";
import { EcommerceplatformAdminCustomersProfilesController } from "./controllers/ecommercePlatform/admin/customers/profiles/EcommerceplatformAdminCustomersProfilesController";
import { EcommerceplatformAdminProductsController } from "./controllers/ecommercePlatform/admin/products/EcommerceplatformAdminProductsController";
import { EcommerceplatformAdminProductsSnapshotsController } from "./controllers/ecommercePlatform/admin/products/snapshots/EcommerceplatformAdminProductsSnapshotsController";
import { EcommerceplatformAdminProductsVariantsInventoryController } from "./controllers/ecommercePlatform/admin/products/variants/inventory/EcommerceplatformAdminProductsVariantsInventoryController";
import { EcommerceplatformAdminProductsVariantsSnapshotsController } from "./controllers/ecommercePlatform/admin/products/variants/snapshots/EcommerceplatformAdminProductsVariantsSnapshotsController";
import { EcommerceplatformAdminProductsVariantsSnapshotsOptionsController } from "./controllers/ecommercePlatform/admin/products/variants/snapshots/options/EcommerceplatformAdminProductsVariantsSnapshotsOptionsController";
import { EcommerceplatformAdminSeller_approval_requestsController } from "./controllers/ecommercePlatform/admin/seller-approval-requests/EcommerceplatformAdminSeller_approval_requestsController";
import { EcommerceplatformAdminSeller_profilesSnapshotsController } from "./controllers/ecommercePlatform/admin/seller-profiles/snapshots/EcommerceplatformAdminSeller_profilesSnapshotsController";
import { EcommerceplatformAdminSellersProfilesController } from "./controllers/ecommercePlatform/admin/sellers/profiles/EcommerceplatformAdminSellersProfilesController";
import { EcommerceplatformAdminSnapshot_reviewsController } from "./controllers/ecommercePlatform/admin/snapshot-reviews/EcommerceplatformAdminSnapshot_reviewsController";
import { EcommerceplatformAdminSnapshotsController } from "./controllers/ecommercePlatform/admin/snapshots/EcommerceplatformAdminSnapshotsController";
import { EcommerceplatformAdminsController } from "./controllers/ecommercePlatform/admins/EcommerceplatformAdminsController";
import { EcommerceplatformAuthAdminController } from "./controllers/ecommercePlatform/auth/admin/EcommerceplatformAuthAdminController";
import { EcommerceplatformAuthCustomerController } from "./controllers/ecommercePlatform/auth/customer/EcommerceplatformAuthCustomerController";
import { EcommerceplatformAuthGuestController } from "./controllers/ecommercePlatform/auth/guest/EcommerceplatformAuthGuestController";
import { EcommerceplatformAuthSellerController } from "./controllers/ecommercePlatform/auth/seller/EcommerceplatformAuthSellerController";
import { EcommerceplatformController } from "./controllers/ecommercePlatform/browsing/EcommerceplatformController";
import { EcommerceplatformCategoriesController } from "./controllers/ecommercePlatform/categories/EcommerceplatformCategoriesController";
import { EcommerceplatformCustomerAddressesController } from "./controllers/ecommercePlatform/customer/addresses/EcommerceplatformCustomerAddressesController";
import { EcommerceplatformCustomerAddresses_defaultController } from "./controllers/ecommercePlatform/customer/addresses/default/EcommerceplatformCustomerAddresses_defaultController";
import { EcommerceplatformCustomerAdministrator_promotion_requestsController } from "./controllers/ecommercePlatform/customer/administrator-promotion-requests/EcommerceplatformCustomerAdministrator_promotion_requestsController";
import { EcommerceplatformCustomerCancellation_requestsController } from "./controllers/ecommercePlatform/customer/cancellation-requests/EcommerceplatformCustomerCancellation_requestsController";
import { EcommerceplatformCustomerCancellation_requestsSnapshotsController } from "./controllers/ecommercePlatform/customer/cancellation-requests/snapshots/EcommerceplatformCustomerCancellation_requestsSnapshotsController";
import { EcommerceplatformCustomerCart_itemsController } from "./controllers/ecommercePlatform/customer/cart-items/EcommerceplatformCustomerCart_itemsController";
import { EcommerceplatformCustomerCartController } from "./controllers/ecommercePlatform/customer/cart/EcommerceplatformCustomerCartController";
import { EcommerceplatformCustomerOrdersController } from "./controllers/ecommercePlatform/customer/orders/EcommerceplatformCustomerOrdersController";
import { EcommerceplatformCustomerOrdersItemsController } from "./controllers/ecommercePlatform/customer/orders/items/EcommerceplatformCustomerOrdersItemsController";
import { EcommerceplatformCustomerOrdersItemsSnapshotsController } from "./controllers/ecommercePlatform/customer/orders/items/snapshots/EcommerceplatformCustomerOrdersItemsSnapshotsController";
import { EcommerceplatformCustomerPassword_resetsController } from "./controllers/ecommercePlatform/customer/password-resets/EcommerceplatformCustomerPassword_resetsController";
import { EcommerceplatformCustomerPasswordController } from "./controllers/ecommercePlatform/customer/password/EcommerceplatformCustomerPasswordController";
import { EcommerceplatformCustomerProfileController } from "./controllers/ecommercePlatform/customer/profile/EcommerceplatformCustomerProfileController";
import { EcommerceplatformCustomerRefund_requestsController } from "./controllers/ecommercePlatform/customer/refund-requests/EcommerceplatformCustomerRefund_requestsController";
import { EcommerceplatformCustomerRefund_requestsSnapshotsController } from "./controllers/ecommercePlatform/customer/refund-requests/snapshots/EcommerceplatformCustomerRefund_requestsSnapshotsController";
import { EcommerceplatformCustomerReviewsController } from "./controllers/ecommercePlatform/customer/reviews/EcommerceplatformCustomerReviewsController";
import { EcommerceplatformCustomerController } from "./controllers/ecommercePlatform/customer/search/EcommerceplatformCustomerController";
import { EcommerceplatformCustomerSessionsActiveRevoke_allController } from "./controllers/ecommercePlatform/customer/sessions/active/revoke-all/EcommerceplatformCustomerSessionsActiveRevoke_allController";
import { EcommerceplatformCustomerShipmentsController } from "./controllers/ecommercePlatform/customer/shipments/confirm/EcommerceplatformCustomerShipmentsController";
import { EcommerceplatformCustomerWishlistController } from "./controllers/ecommercePlatform/customer/wishlist/EcommerceplatformCustomerWishlistController";
import { EcommerceplatformCustomersController } from "./controllers/ecommercePlatform/customers/EcommerceplatformCustomersController";
import { EcommerceplatformGuestReviewsController } from "./controllers/ecommercePlatform/guest/reviews/EcommerceplatformGuestReviewsController";
import { EcommerceplatformGuestSessionsController } from "./controllers/ecommercePlatform/guest/sessions/EcommerceplatformGuestSessionsController";
import { EcommerceplatformGuestsController } from "./controllers/ecommercePlatform/guests/EcommerceplatformGuestsController";
import { EcommerceplatformProductsController } from "./controllers/ecommercePlatform/products/EcommerceplatformProductsController";
import { EcommerceplatformProductsImagesController } from "./controllers/ecommercePlatform/products/images/EcommerceplatformProductsImagesController";
import { EcommerceplatformProductsVariantsController } from "./controllers/ecommercePlatform/products/variants/EcommerceplatformProductsVariantsController";
import { EcommerceplatformProductsVariantsOptionsController } from "./controllers/ecommercePlatform/products/variants/options/EcommerceplatformProductsVariantsOptionsController";
import { EcommerceplatformSellerAdministrator_promotion_requestsController } from "./controllers/ecommercePlatform/seller/administrator-promotion-requests/EcommerceplatformSellerAdministrator_promotion_requestsController";
import { EcommerceplatformSellerAnalyticsStockController } from "./controllers/ecommercePlatform/seller/analytics/stock/EcommerceplatformSellerAnalyticsStockController";
import { EcommerceplatformSellerCancellation_requestsController } from "./controllers/ecommercePlatform/seller/cancellation-requests/EcommerceplatformSellerCancellation_requestsController";
import { EcommerceplatformSellerDashboardController } from "./controllers/ecommercePlatform/seller/dashboard/EcommerceplatformSellerDashboardController";
import { EcommerceplatformSellerOrdersFulfillmentController } from "./controllers/ecommercePlatform/seller/orders/fulfillment/EcommerceplatformSellerOrdersFulfillmentController";
import { EcommerceplatformSellerProductsController } from "./controllers/ecommercePlatform/seller/products/EcommerceplatformSellerProductsController";
import { EcommerceplatformSellerProductsImagesController } from "./controllers/ecommercePlatform/seller/products/images/EcommerceplatformSellerProductsImagesController";
import { EcommerceplatformSellerProductsSnapshotsController } from "./controllers/ecommercePlatform/seller/products/snapshots/EcommerceplatformSellerProductsSnapshotsController";
import { EcommerceplatformSellerProductsVariantsController } from "./controllers/ecommercePlatform/seller/products/variants/EcommerceplatformSellerProductsVariantsController";
import { EcommerceplatformSellerProductsVariantsInventoryController } from "./controllers/ecommercePlatform/seller/products/variants/inventory/EcommerceplatformSellerProductsVariantsInventoryController";
import { EcommerceplatformSellerProductsVariantsOptionsController } from "./controllers/ecommercePlatform/seller/products/variants/options/EcommerceplatformSellerProductsVariantsOptionsController";
import { EcommerceplatformSellerProductsVariantsSnapshotsController } from "./controllers/ecommercePlatform/seller/products/variants/snapshots/EcommerceplatformSellerProductsVariantsSnapshotsController";
import { EcommerceplatformSellerProductsVariantsSnapshotsOptionsController } from "./controllers/ecommercePlatform/seller/products/variants/snapshots/options/EcommerceplatformSellerProductsVariantsSnapshotsOptionsController";
import { EcommerceplatformSellerProfile_snapshotsController } from "./controllers/ecommercePlatform/seller/profile-snapshots/EcommerceplatformSellerProfile_snapshotsController";
import { EcommerceplatformSellerRefund_requestsController } from "./controllers/ecommercePlatform/seller/refund-requests/EcommerceplatformSellerRefund_requestsController";
import { EcommerceplatformSellerShipmentsController } from "./controllers/ecommercePlatform/seller/shipments/EcommerceplatformSellerShipmentsController";
import { EcommerceplatformSellerShipmentsItemsController } from "./controllers/ecommercePlatform/seller/shipments/items/EcommerceplatformSellerShipmentsItemsController";
import { EcommerceplatformSellersController } from "./controllers/ecommercePlatform/sellers/EcommerceplatformSellersController";

@Module({
  controllers: [
    EcommerceplatformAuthGuestController,
    EcommerceplatformAuthCustomerController,
    EcommerceplatformAuthSellerController,
    EcommerceplatformAuthAdminController,
    EcommerceplatformGuestsController,
    EcommerceplatformCustomersController,
    EcommerceplatformCustomerProfileController,
    EcommerceplatformSellersController,
    EcommerceplatformAdminsController,
    EcommerceplatformGuestSessionsController,
    EcommerceplatformCustomerPassword_resetsController,
    EcommerceplatformAdminCustomersProfilesController,
    EcommerceplatformAdminSellersProfilesController,
    EcommerceplatformCustomerAddressesController,
    EcommerceplatformAdminCustomersAddressesController,
    EcommerceplatformAdminSeller_profilesSnapshotsController,
    EcommerceplatformSellerProfile_snapshotsController,
    EcommerceplatformCategoriesController,
    EcommerceplatformAdminCategoriesController,
    EcommerceplatformProductsController,
    EcommerceplatformSellerProductsController,
    EcommerceplatformAdminProductsController,
    EcommerceplatformProductsVariantsController,
    EcommerceplatformSellerProductsVariantsController,
    EcommerceplatformProductsVariantsOptionsController,
    EcommerceplatformSellerProductsVariantsOptionsController,
    EcommerceplatformProductsImagesController,
    EcommerceplatformSellerProductsImagesController,
    EcommerceplatformSellerProductsVariantsInventoryController,
    EcommerceplatformAdminProductsVariantsInventoryController,
    EcommerceplatformSellerProductsSnapshotsController,
    EcommerceplatformAdminProductsSnapshotsController,
    EcommerceplatformSellerProductsVariantsSnapshotsController,
    EcommerceplatformAdminProductsVariantsSnapshotsController,
    EcommerceplatformSellerProductsVariantsSnapshotsOptionsController,
    EcommerceplatformAdminProductsVariantsSnapshotsOptionsController,
    EcommerceplatformCustomerCart_itemsController,
    EcommerceplatformCustomerOrdersController,
    EcommerceplatformCustomerOrdersItemsController,
    EcommerceplatformSellerShipmentsController,
    EcommerceplatformSellerShipmentsItemsController,
    EcommerceplatformCustomerCancellation_requestsController,
    EcommerceplatformSellerCancellation_requestsController,
    EcommerceplatformCustomerRefund_requestsController,
    EcommerceplatformSellerRefund_requestsController,
    EcommerceplatformCustomerOrdersItemsSnapshotsController,
    EcommerceplatformCustomerCancellation_requestsSnapshotsController,
    EcommerceplatformCustomerRefund_requestsSnapshotsController,
    EcommerceplatformCustomerWishlistController,
    EcommerceplatformGuestReviewsController,
    EcommerceplatformCustomerReviewsController,
    EcommerceplatformAdminSnapshot_reviewsController,
    EcommerceplatformAdminSeller_approval_requestsController,
    EcommerceplatformCustomerAdministrator_promotion_requestsController,
    EcommerceplatformSellerAdministrator_promotion_requestsController,
    EcommerceplatformAdminAdministrator_promotion_requestsController,
    EcommerceplatformAdminAudit_logsController,
    EcommerceplatformAdminSnapshotsController,
    EcommerceplatformCustomerAddresses_defaultController,
    EcommerceplatformCustomerPasswordController,
    EcommerceplatformCustomerSessionsActiveRevoke_allController,
    EcommerceplatformCustomerController,
    EcommerceplatformSellerDashboardController,
    EcommerceplatformController,
    EcommerceplatformSellerAnalyticsStockController,
    EcommerceplatformCustomerCartController,
    EcommerceplatformCustomerShipmentsController,
    EcommerceplatformSellerOrdersFulfillmentController,
  ],
})
export class MyModule {}
