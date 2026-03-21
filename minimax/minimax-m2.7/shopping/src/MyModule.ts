import { Module } from "@nestjs/common";

import { EcommercemallAdminAdminAudit_logsController } from "./controllers/ecommerceMall/admin/admin/audit-logs/EcommercemallAdminAdminAudit_logsController";
import { EcommercemallAdminAdminAuditlogsController } from "./controllers/ecommerceMall/admin/admin/auditLogs/EcommercemallAdminAdminAuditlogsController";
import { EcommercemallAdminAdminCategoriesController } from "./controllers/ecommerceMall/admin/admin/categories/EcommercemallAdminAdminCategoriesController";
import { EcommercemallAdminAdminCategoriesSubcategoriesController } from "./controllers/ecommerceMall/admin/admin/categories/subcategories/EcommercemallAdminAdminCategoriesSubcategoriesController";
import { EcommercemallAdminAdminDashboardMetricsController } from "./controllers/ecommerceMall/admin/admin/dashboard/metrics/EcommercemallAdminAdminDashboardMetricsController";
import { EcommercemallAdminAdminRequestsController } from "./controllers/ecommerceMall/admin/admin/requests/EcommercemallAdminAdminRequestsController";
import { EcommercemallAdminAdminsController } from "./controllers/ecommerceMall/admin/admins/EcommercemallAdminAdminsController";
import { EcommercemallAdminCancellation_request_snapshotsController } from "./controllers/ecommerceMall/admin/cancellation-request-snapshots/EcommercemallAdminCancellation_request_snapshotsController";
import { EcommercemallAdminCancellation_requestsController } from "./controllers/ecommerceMall/admin/cancellation-requests/EcommercemallAdminCancellation_requestsController";
import { EcommercemallAdminCancellation_requestsSnapshotsController } from "./controllers/ecommerceMall/admin/cancellation-requests/snapshots/EcommercemallAdminCancellation_requestsSnapshotsController";
import { EcommercemallAdminCategoriesController } from "./controllers/ecommerceMall/admin/categories/EcommercemallAdminCategoriesController";
import { EcommercemallAdminCustomersController } from "./controllers/ecommerceMall/admin/customers/EcommercemallAdminCustomersController";
import { EcommercemallAdminOrder_itemsController } from "./controllers/ecommerceMall/admin/order-items/EcommercemallAdminOrder_itemsController";
import { EcommercemallAdminOrdersItemsController } from "./controllers/ecommerceMall/admin/orders/items/EcommercemallAdminOrdersItemsController";
import { EcommercemallAdminProductsSnapshotsController } from "./controllers/ecommerceMall/admin/products/snapshots/EcommercemallAdminProductsSnapshotsController";
import { EcommercemallAdminProductsVariantsSnapshotsController } from "./controllers/ecommerceMall/admin/products/variants/snapshots/EcommercemallAdminProductsVariantsSnapshotsController";
import { EcommercemallAdminRefund_request_snapshotsController } from "./controllers/ecommerceMall/admin/refund-request-snapshots/EcommercemallAdminRefund_request_snapshotsController";
import { EcommercemallAdminRefund_requestsController } from "./controllers/ecommerceMall/admin/refund-requests/EcommercemallAdminRefund_requestsController";
import { EcommercemallAdminRefund_requestsSnapshotsController } from "./controllers/ecommerceMall/admin/refund-requests/snapshots/EcommercemallAdminRefund_requestsSnapshotsController";
import { EcommercemallAdminReviewsSnapshotsController } from "./controllers/ecommerceMall/admin/reviews/snapshots/EcommercemallAdminReviewsSnapshotsController";
import { EcommercemallAdminSeller_approvalsController } from "./controllers/ecommerceMall/admin/seller-approvals/EcommercemallAdminSeller_approvalsController";
import { EcommercemallAdminSeller_suspensionsController } from "./controllers/ecommerceMall/admin/seller-suspensions/EcommercemallAdminSeller_suspensionsController";
import { EcommercemallAdminSellersController } from "./controllers/ecommerceMall/admin/sellers/EcommercemallAdminSellersController";
import { EcommercemallAuthAdminController } from "./controllers/ecommerceMall/auth/admin/EcommercemallAuthAdminController";
import { EcommercemallAuthCustomerController } from "./controllers/ecommerceMall/auth/customer/EcommercemallAuthCustomerController";
import { EcommercemallAuthGuestController } from "./controllers/ecommerceMall/auth/guest/EcommercemallAuthGuestController";
import { EcommercemallAuthSellerController } from "./controllers/ecommerceMall/auth/seller/EcommercemallAuthSellerController";
import { EcommercemallAuthSuperadminController } from "./controllers/ecommerceMall/auth/superAdmin/EcommercemallAuthSuperadminController";
import { EcommercemallCategoriesController } from "./controllers/ecommerceMall/categories/EcommercemallCategoriesController";
import { EcommercemallCategoriesProductsController } from "./controllers/ecommerceMall/categories/products/EcommercemallCategoriesProductsController";
import { EcommercemallCustomerAddressesController } from "./controllers/ecommerceMall/customer/addresses/EcommercemallCustomerAddressesController";
import { EcommercemallCustomerAdminRequestsController } from "./controllers/ecommerceMall/customer/admin/requests/EcommercemallCustomerAdminRequestsController";
import { EcommercemallCustomerCancellation_request_snapshotsController } from "./controllers/ecommerceMall/customer/cancellation-request-snapshots/EcommercemallCustomerCancellation_request_snapshotsController";
import { EcommercemallCustomerCancellation_requestsController } from "./controllers/ecommerceMall/customer/cancellation-requests/EcommercemallCustomerCancellation_requestsController";
import { EcommercemallCustomerCancellation_requestsSnapshotsController } from "./controllers/ecommerceMall/customer/cancellation-requests/snapshots/EcommercemallCustomerCancellation_requestsSnapshotsController";
import { EcommercemallCustomerCartItemsController } from "./controllers/ecommerceMall/customer/cart/items/EcommercemallCustomerCartItemsController";
import { EcommercemallCustomerCheckoutConfirmController } from "./controllers/ecommerceMall/customer/checkout/confirm/EcommercemallCustomerCheckoutConfirmController";
import { EcommercemallCustomerCheckoutController } from "./controllers/ecommerceMall/customer/checkout/prepare/EcommercemallCustomerCheckoutController";
import { EcommercemallCustomerCustomersAddressesController } from "./controllers/ecommerceMall/customer/customers/addresses/EcommercemallCustomerCustomersAddressesController";
import { EcommercemallCustomerCustomersCartController } from "./controllers/ecommerceMall/customer/customers/cart/EcommercemallCustomerCustomersCartController";
import { EcommercemallCustomerCustomersCartItemsController } from "./controllers/ecommerceMall/customer/customers/cart/items/EcommercemallCustomerCustomersCartItemsController";
import { EcommercemallCustomerCustomersOrdersItemsReviewController } from "./controllers/ecommerceMall/customer/customers/orders/items/review/EcommercemallCustomerCustomersOrdersItemsReviewController";
import { EcommercemallCustomerCustomersReviewsController } from "./controllers/ecommerceMall/customer/customers/reviews/EcommercemallCustomerCustomersReviewsController";
import { EcommercemallCustomerCustomersWishlistController } from "./controllers/ecommerceMall/customer/customers/wishlist/EcommercemallCustomerCustomersWishlistController";
import { EcommercemallCustomerOrdersController } from "./controllers/ecommerceMall/customer/orders/EcommercemallCustomerOrdersController";
import { EcommercemallCustomerOrdersItemsController } from "./controllers/ecommerceMall/customer/orders/items/EcommercemallCustomerOrdersItemsController";
import { EcommercemallCustomerOrdersShipmentsConfirm_deliveryController } from "./controllers/ecommerceMall/customer/orders/shipments/confirm-delivery/EcommercemallCustomerOrdersShipmentsConfirm_deliveryController";
import { EcommercemallCustomerOrdersShipmentsTrackingController } from "./controllers/ecommerceMall/customer/orders/shipments/tracking/EcommercemallCustomerOrdersShipmentsTrackingController";
import { EcommercemallCustomerProfileController } from "./controllers/ecommerceMall/customer/profile/EcommercemallCustomerProfileController";
import { EcommercemallCustomerRefund_request_snapshotsController } from "./controllers/ecommerceMall/customer/refund-request-snapshots/EcommercemallCustomerRefund_request_snapshotsController";
import { EcommercemallCustomerRefund_requestsController } from "./controllers/ecommerceMall/customer/refund-requests/EcommercemallCustomerRefund_requestsController";
import { EcommercemallCustomerRefund_requestsSnapshotsController } from "./controllers/ecommerceMall/customer/refund-requests/snapshots/EcommercemallCustomerRefund_requestsSnapshotsController";
import { EcommercemallCustomerReviewsController } from "./controllers/ecommerceMall/customer/reviews/EcommercemallCustomerReviewsController";
import { EcommercemallCustomerReviewsSnapshotsController } from "./controllers/ecommerceMall/customer/reviews/snapshots/EcommercemallCustomerReviewsSnapshotsController";
import { EcommercemallCustomerSessionsController } from "./controllers/ecommerceMall/customer/sessions/EcommercemallCustomerSessionsController";
import { EcommercemallCustomerWishlistController } from "./controllers/ecommerceMall/customer/wishlist/EcommercemallCustomerWishlistController";
import { EcommercemallGuestSessionsController } from "./controllers/ecommerceMall/guest/sessions/EcommercemallGuestSessionsController";
import { EcommercemallProductsImagesController } from "./controllers/ecommerceMall/products/images/EcommercemallProductsImagesController";
import { EcommercemallProductsReviewsController } from "./controllers/ecommerceMall/products/reviews/EcommercemallProductsReviewsController";
import { EcommercemallProductsController } from "./controllers/ecommerceMall/products/search/EcommercemallProductsController";
import { EcommercemallProductsVariantsController } from "./controllers/ecommerceMall/products/variants/EcommercemallProductsVariantsController";
import { EcommercemallReviewsController } from "./controllers/ecommerceMall/reviews/EcommercemallReviewsController";
import { EcommercemallSellerAdminRequestsController } from "./controllers/ecommerceMall/seller/admin/requests/EcommercemallSellerAdminRequestsController";
import { EcommercemallSellerCancellation_request_snapshotsController } from "./controllers/ecommerceMall/seller/cancellation-request-snapshots/EcommercemallSellerCancellation_request_snapshotsController";
import { EcommercemallSellerCancellation_requestsController } from "./controllers/ecommerceMall/seller/cancellation-requests/EcommercemallSellerCancellation_requestsController";
import { EcommercemallSellerCancellation_requestsSnapshotsController } from "./controllers/ecommerceMall/seller/cancellation-requests/snapshots/EcommercemallSellerCancellation_requestsSnapshotsController";
import { EcommercemallSellerDashboardController } from "./controllers/ecommerceMall/seller/dashboard/EcommercemallSellerDashboardController";
import { EcommercemallSellerDashboardOrder_itemsController } from "./controllers/ecommerceMall/seller/dashboard/order-items/EcommercemallSellerDashboardOrder_itemsController";
import { EcommercemallSellerDashboardSummaryController } from "./controllers/ecommerceMall/seller/dashboard/summary/EcommercemallSellerDashboardSummaryController";
import { EcommercemallSellerInventory_historyController } from "./controllers/ecommerceMall/seller/inventory-history/EcommercemallSellerInventory_historyController";
import { EcommercemallSellerOrdersItemsController } from "./controllers/ecommerceMall/seller/orders/items/EcommercemallSellerOrdersItemsController";
import { EcommercemallSellerProduct_snapshotsController } from "./controllers/ecommerceMall/seller/product-snapshots/EcommercemallSellerProduct_snapshotsController";
import { EcommercemallSellerProductsController } from "./controllers/ecommerceMall/seller/products/EcommercemallSellerProductsController";
import { EcommercemallSellerProductsImagesController } from "./controllers/ecommerceMall/seller/products/images/EcommercemallSellerProductsImagesController";
import { EcommercemallSellerProductsSnapshotsController } from "./controllers/ecommerceMall/seller/products/snapshots/EcommercemallSellerProductsSnapshotsController";
import { EcommercemallSellerProductsVariantsController } from "./controllers/ecommerceMall/seller/products/variants/EcommercemallSellerProductsVariantsController";
import { EcommercemallSellerProductsVariantsInventoryController } from "./controllers/ecommerceMall/seller/products/variants/inventory/EcommercemallSellerProductsVariantsInventoryController";
import { EcommercemallSellerProductsVariantsOptionsController } from "./controllers/ecommerceMall/seller/products/variants/options/EcommercemallSellerProductsVariantsOptionsController";
import { EcommercemallSellerProductsVariantsSnapshotsController } from "./controllers/ecommerceMall/seller/products/variants/snapshots/EcommercemallSellerProductsVariantsSnapshotsController";
import { EcommercemallSellerProfileController } from "./controllers/ecommerceMall/seller/profile/EcommercemallSellerProfileController";
import { EcommercemallSellerProfileSnapshotsController } from "./controllers/ecommerceMall/seller/profile/snapshots/EcommercemallSellerProfileSnapshotsController";
import { EcommercemallSellerRefund_request_snapshotsController } from "./controllers/ecommerceMall/seller/refund-request-snapshots/EcommercemallSellerRefund_request_snapshotsController";
import { EcommercemallSellerRefund_requestsController } from "./controllers/ecommerceMall/seller/refund-requests/EcommercemallSellerRefund_requestsController";
import { EcommercemallSellerRefund_requestsSnapshotsController } from "./controllers/ecommerceMall/seller/refund-requests/snapshots/EcommercemallSellerRefund_requestsSnapshotsController";
import { EcommercemallSellerSeller_profile_snapshotsController } from "./controllers/ecommerceMall/seller/seller-profile-snapshots/EcommercemallSellerSeller_profile_snapshotsController";
import { EcommercemallSellerSellerAdmin_requestsController } from "./controllers/ecommerceMall/seller/seller/admin-requests/EcommercemallSellerSellerAdmin_requestsController";
import { EcommercemallSellerSellerProductsVariantsController } from "./controllers/ecommerceMall/seller/seller/products/variants/EcommercemallSellerSellerProductsVariantsController";
import { EcommercemallSellerSellerProfileController } from "./controllers/ecommerceMall/seller/seller/profile/EcommercemallSellerSellerProfileController";
import { EcommercemallSellerShipmentsController } from "./controllers/ecommerceMall/seller/shipments/EcommercemallSellerShipmentsController";
import { EcommercemallSellerShipmentsItemsController } from "./controllers/ecommerceMall/seller/shipments/items/EcommercemallSellerShipmentsItemsController";
import { EcommercemallSellers_publicController } from "./controllers/ecommerceMall/sellers/public/EcommercemallSellers_publicController";
import { EcommercemallSuperadminAdmin_promotionsController } from "./controllers/ecommerceMall/superAdmin/admin-promotions/EcommercemallSuperadminAdmin_promotionsController";
import { EcommercemallSuperadminAdminRequestsController } from "./controllers/ecommerceMall/superAdmin/admin/requests/EcommercemallSuperadminAdminRequestsController";
import { EcommercemallSuperadminAdminsController } from "./controllers/ecommerceMall/superAdmin/admins/EcommercemallSuperadminAdminsController";
import { EcommercemallSuperadminSellerAdmin_requestsController } from "./controllers/ecommerceMall/superAdmin/seller/admin-requests/EcommercemallSuperadminSellerAdmin_requestsController";
import { EcommercemallSuperadminSuper_adminAudit_logsController } from "./controllers/ecommerceMall/superAdmin/super-admin/audit-logs/EcommercemallSuperadminSuper_adminAudit_logsController";
import { EcommercemallSuperadminSuper_adminsController } from "./controllers/ecommerceMall/superAdmin/super-admins/EcommercemallSuperadminSuper_adminsController";

@Module({
  controllers: [
    EcommercemallAuthGuestController,
    EcommercemallAuthCustomerController,
    EcommercemallAuthSellerController,
    EcommercemallAuthAdminController,
    EcommercemallAuthSuperadminController,
    EcommercemallAdminCustomersController,
    EcommercemallCustomerProfileController,
    EcommercemallCustomerAddressesController,
    EcommercemallCustomerCustomersAddressesController,
    EcommercemallAdminSellersController,
    EcommercemallSellers_publicController,
    EcommercemallSuperadminAdminsController,
    EcommercemallSuperadminSuper_adminsController,
    EcommercemallGuestSessionsController,
    EcommercemallCustomerSessionsController,
    EcommercemallAdminAdminAuditlogsController,
    EcommercemallAdminAdminAudit_logsController,
    EcommercemallSuperadminSuper_adminAudit_logsController,
    EcommercemallAdminAdminRequestsController,
    EcommercemallSuperadminAdminRequestsController,
    EcommercemallCustomerAdminRequestsController,
    EcommercemallSellerAdminRequestsController,
    EcommercemallSellerSellerAdmin_requestsController,
    EcommercemallSuperadminSellerAdmin_requestsController,
    EcommercemallCustomerCancellation_request_snapshotsController,
    EcommercemallSellerCancellation_request_snapshotsController,
    EcommercemallAdminCancellation_request_snapshotsController,
    EcommercemallCustomerRefund_request_snapshotsController,
    EcommercemallSellerRefund_request_snapshotsController,
    EcommercemallAdminRefund_request_snapshotsController,
    EcommercemallCustomerWishlistController,
    EcommercemallCustomerCustomersWishlistController,
    EcommercemallSellerProductsController,
    EcommercemallSellerProductsImagesController,
    EcommercemallSellerProductsVariantsController,
    EcommercemallSellerSellerProductsVariantsController,
    EcommercemallSellerProductsVariantsOptionsController,
    EcommercemallSellerProfileController,
    EcommercemallSellerProfileSnapshotsController,
    EcommercemallSellerProductsVariantsInventoryController,
    EcommercemallSellerProductsSnapshotsController,
    EcommercemallAdminProductsSnapshotsController,
    EcommercemallCategoriesController,
    EcommercemallCategoriesProductsController,
    EcommercemallAdminAdminCategoriesController,
    EcommercemallAdminAdminCategoriesSubcategoriesController,
    EcommercemallProductsImagesController,
    EcommercemallProductsVariantsController,
    EcommercemallProductsReviewsController,
    EcommercemallCustomerCustomersReviewsController,
    EcommercemallSellerSellerProfileController,
    EcommercemallCustomerCustomersCartController,
    EcommercemallCustomerCustomersCartItemsController,
    EcommercemallCustomerCartItemsController,
    EcommercemallCustomerOrdersController,
    EcommercemallCustomerOrdersItemsController,
    EcommercemallSellerShipmentsController,
    EcommercemallSellerShipmentsItemsController,
    EcommercemallAdminOrdersItemsController,
    EcommercemallCustomerCancellation_requestsController,
    EcommercemallSellerCancellation_requestsController,
    EcommercemallAdminCancellation_requestsController,
    EcommercemallCustomerCancellation_requestsSnapshotsController,
    EcommercemallSellerCancellation_requestsSnapshotsController,
    EcommercemallAdminCancellation_requestsSnapshotsController,
    EcommercemallCustomerRefund_requestsController,
    EcommercemallSellerRefund_requestsController,
    EcommercemallAdminRefund_requestsController,
    EcommercemallCustomerRefund_requestsSnapshotsController,
    EcommercemallSellerRefund_requestsSnapshotsController,
    EcommercemallAdminRefund_requestsSnapshotsController,
    EcommercemallReviewsController,
    EcommercemallCustomerCustomersOrdersItemsReviewController,
    EcommercemallCustomerReviewsController,
    EcommercemallCustomerReviewsSnapshotsController,
    EcommercemallAdminReviewsSnapshotsController,
    EcommercemallAdminAdminsController,
    EcommercemallAdminSeller_approvalsController,
    EcommercemallAdminSeller_suspensionsController,
    EcommercemallSuperadminAdmin_promotionsController,
    EcommercemallAdminCategoriesController,
    EcommercemallAdminOrder_itemsController,
    EcommercemallSellerSeller_profile_snapshotsController,
    EcommercemallSellerDashboardController,
    EcommercemallSellerDashboardOrder_itemsController,
    EcommercemallSellerInventory_historyController,
    EcommercemallProductsController,
    EcommercemallCustomerCheckoutController,
    EcommercemallCustomerCheckoutConfirmController,
    EcommercemallSellerDashboardSummaryController,
    EcommercemallSellerOrdersItemsController,
    EcommercemallCustomerOrdersShipmentsTrackingController,
    EcommercemallCustomerOrdersShipmentsConfirm_deliveryController,
    EcommercemallSellerProductsVariantsSnapshotsController,
    EcommercemallAdminProductsVariantsSnapshotsController,
    EcommercemallAdminAdminDashboardMetricsController,
    EcommercemallSellerProduct_snapshotsController,
  ],
})
export class MyModule {}
