import { Module } from "@nestjs/common";

import { EcommerceAdminAdminReviewsController } from "./controllers/ecommerce/admin/admin/reviews/EcommerceAdminAdminReviewsController";
import { EcommerceAdminAdminReviewsSnapshotsController } from "./controllers/ecommerce/admin/admin/reviews/snapshots/EcommerceAdminAdminReviewsSnapshotsController";
import { EcommerceAdminAdminsController } from "./controllers/ecommerce/admin/admins/EcommerceAdminAdminsController";
import { EcommerceAdminAnalyticsController } from "./controllers/ecommerce/admin/analytics/EcommerceAdminAnalyticsController";
import { EcommerceAdminApprovalsController } from "./controllers/ecommerce/admin/approvals/EcommerceAdminApprovalsController";
import { EcommerceAdminApprovalsPendingController } from "./controllers/ecommerce/admin/approvals/pending/EcommerceAdminApprovalsPendingController";
import { EcommerceAdminAudit_logsController } from "./controllers/ecommerce/admin/audit-logs/EcommerceAdminAudit_logsController";
import { EcommerceAdminCategoriesController } from "./controllers/ecommerce/admin/categories/EcommerceAdminCategoriesController";
import { EcommerceAdminCategoriesSnapshotsController } from "./controllers/ecommerce/admin/categories/snapshots/EcommerceAdminCategoriesSnapshotsController";
import { EcommerceAdminGrade_transitionsController } from "./controllers/ecommerce/admin/grade-transitions/EcommerceAdminGrade_transitionsController";
import { EcommerceAdminGradesController } from "./controllers/ecommerce/admin/grades/EcommerceAdminGradesController";
import { EcommerceAdminOrdersController } from "./controllers/ecommerce/admin/orders/EcommerceAdminOrdersController";
import { EcommerceAdminOrdersItemsController } from "./controllers/ecommerce/admin/orders/items/EcommerceAdminOrdersItemsController";
import { EcommerceAdminOrdersItemsCancellation_requestsController } from "./controllers/ecommerce/admin/orders/items/cancellation-requests/EcommerceAdminOrdersItemsCancellation_requestsController";
import { EcommerceAdminOrdersItemsCancellation_requestsSnapshotsController } from "./controllers/ecommerce/admin/orders/items/cancellation-requests/snapshots/EcommerceAdminOrdersItemsCancellation_requestsSnapshotsController";
import { EcommerceAdminOrdersItemsForce_cancelController } from "./controllers/ecommerce/admin/orders/items/force-cancel/EcommerceAdminOrdersItemsForce_cancelController";
import { EcommerceAdminOrdersItemsForce_refundController } from "./controllers/ecommerce/admin/orders/items/force-refund/EcommerceAdminOrdersItemsForce_refundController";
import { EcommerceAdminOrdersItemsRefund_requestsController } from "./controllers/ecommerce/admin/orders/items/refund-requests/EcommerceAdminOrdersItemsRefund_requestsController";
import { EcommerceAdminOrdersItemsRefund_requestsSnapshotsController } from "./controllers/ecommerce/admin/orders/items/refund-requests/snapshots/EcommerceAdminOrdersItemsRefund_requestsSnapshotsController";
import { EcommerceAdminOrdersItemsSnapshotController } from "./controllers/ecommerce/admin/orders/items/snapshot/EcommerceAdminOrdersItemsSnapshotController";
import { EcommerceAdminOrdersItemsSnapshotVariantController } from "./controllers/ecommerce/admin/orders/items/snapshot/variant/EcommerceAdminOrdersItemsSnapshotVariantController";
import { EcommerceAdminOrdersItemsSnapshotVariantOptionsController } from "./controllers/ecommerce/admin/orders/items/snapshot/variant/options/EcommerceAdminOrdersItemsSnapshotVariantOptionsController";
import { EcommerceAdminOrdersShipmentsController } from "./controllers/ecommerce/admin/orders/shipments/EcommerceAdminOrdersShipmentsController";
import { EcommerceAdminProductsController } from "./controllers/ecommerce/admin/products/overview/EcommerceAdminProductsController";
import { EcommerceAdminProductsRatingController } from "./controllers/ecommerce/admin/products/rating/EcommerceAdminProductsRatingController";
import { EcommerceAdminProductsSnapshotsController } from "./controllers/ecommerce/admin/products/snapshots/EcommerceAdminProductsSnapshotsController";
import { EcommerceAdminProfilesController } from "./controllers/ecommerce/admin/profiles/EcommerceAdminProfilesController";
import { EcommerceAdminProfilesSnapshotsController } from "./controllers/ecommerce/admin/profiles/snapshots/EcommerceAdminProfilesSnapshotsController";
import { EcommerceAdminReportsController } from "./controllers/ecommerce/admin/reports/EcommerceAdminReportsController";
import { EcommerceAdminRequestsController } from "./controllers/ecommerce/admin/requests/EcommerceAdminRequestsController";
import { EcommerceAdminSnapshotsController } from "./controllers/ecommerce/admin/snapshots/EcommerceAdminSnapshotsController";
import { EcommerceAdminStatisticsController } from "./controllers/ecommerce/admin/statistics/EcommerceAdminStatisticsController";
import { EcommerceAuthAdminController } from "./controllers/ecommerce/auth/admin/EcommerceAuthAdminController";
import { EcommerceAuthCustomerController } from "./controllers/ecommerce/auth/customer/EcommerceAuthCustomerController";
import { EcommerceAuthSellerController } from "./controllers/ecommerce/auth/seller/EcommerceAuthSellerController";
import { EcommerceCategoriesController } from "./controllers/ecommerce/categories/EcommerceCategoriesController";
import { EcommerceCategoriesProductsController } from "./controllers/ecommerce/categories/products/EcommerceCategoriesProductsController";
import { EcommerceCustomerAddressesController } from "./controllers/ecommerce/customer/addresses/EcommerceCustomerAddressesController";
import { EcommerceCustomerCartSummaryController } from "./controllers/ecommerce/customer/cart/summary/EcommerceCustomerCartSummaryController";
import { EcommerceCustomerCartsController } from "./controllers/ecommerce/customer/carts/EcommerceCustomerCartsController";
import { EcommerceCustomerCartsItemsController } from "./controllers/ecommerce/customer/carts/items/EcommerceCustomerCartsItemsController";
import { EcommerceCustomerDeletion_validationController } from "./controllers/ecommerce/customer/deletion-validation/EcommerceCustomerDeletion_validationController";
import { EcommerceCustomerEmail_verificationsController } from "./controllers/ecommerce/customer/email-verifications/EcommerceCustomerEmail_verificationsController";
import { EcommerceCustomerOrdersController } from "./controllers/ecommerce/customer/orders/EcommerceCustomerOrdersController";
import { EcommerceCustomerOrdersItemsController } from "./controllers/ecommerce/customer/orders/items/EcommerceCustomerOrdersItemsController";
import { EcommerceCustomerOrdersItemsCancellation_requestsController } from "./controllers/ecommerce/customer/orders/items/cancellation-requests/EcommerceCustomerOrdersItemsCancellation_requestsController";
import { EcommerceCustomerOrdersItemsCancellation_requestsSnapshotsController } from "./controllers/ecommerce/customer/orders/items/cancellation-requests/snapshots/EcommerceCustomerOrdersItemsCancellation_requestsSnapshotsController";
import { EcommerceCustomerOrdersItemsConfirm_deliveryController } from "./controllers/ecommerce/customer/orders/items/confirm-delivery/EcommerceCustomerOrdersItemsConfirm_deliveryController";
import { EcommerceCustomerOrdersItemsRefund_requestsController } from "./controllers/ecommerce/customer/orders/items/refund-requests/EcommerceCustomerOrdersItemsRefund_requestsController";
import { EcommerceCustomerOrdersItemsRefund_requestsSnapshotsController } from "./controllers/ecommerce/customer/orders/items/refund-requests/snapshots/EcommerceCustomerOrdersItemsRefund_requestsSnapshotsController";
import { EcommerceCustomerOrdersItemsSnapshotController } from "./controllers/ecommerce/customer/orders/items/snapshot/EcommerceCustomerOrdersItemsSnapshotController";
import { EcommerceCustomerOrdersItemsSnapshotVariantController } from "./controllers/ecommerce/customer/orders/items/snapshot/variant/EcommerceCustomerOrdersItemsSnapshotVariantController";
import { EcommerceCustomerOrdersItemsSnapshotVariantOptionsController } from "./controllers/ecommerce/customer/orders/items/snapshot/variant/options/EcommerceCustomerOrdersItemsSnapshotVariantOptionsController";
import { EcommerceCustomerOrdersShipmentsController } from "./controllers/ecommerce/customer/orders/shipments/EcommerceCustomerOrdersShipmentsController";
import { EcommerceCustomerPassword_resetsController } from "./controllers/ecommerce/customer/password-resets/EcommerceCustomerPassword_resetsController";
import { EcommerceCustomerProductsRatingController } from "./controllers/ecommerce/customer/products/rating/EcommerceCustomerProductsRatingController";
import { EcommerceCustomerProfileController } from "./controllers/ecommerce/customer/profile/EcommerceCustomerProfileController";
import { EcommerceCustomerProfilesController } from "./controllers/ecommerce/customer/profiles/EcommerceCustomerProfilesController";
import { EcommerceCustomerReviewsController } from "./controllers/ecommerce/customer/reviews/EcommerceCustomerReviewsController";
import { EcommerceCustomerReviewsSnapshotsController } from "./controllers/ecommerce/customer/reviews/snapshots/EcommerceCustomerReviewsSnapshotsController";
import { EcommerceCustomerReviewsSummaryController } from "./controllers/ecommerce/customer/reviews/summary/EcommerceCustomerReviewsSummaryController";
import { EcommerceCustomerSearchController } from "./controllers/ecommerce/customer/search/EcommerceCustomerSearchController";
import { EcommerceCustomerSession_statusController } from "./controllers/ecommerce/customer/session-status/EcommerceCustomerSession_statusController";
import { EcommerceCustomerSessionsController } from "./controllers/ecommerce/customer/sessions/EcommerceCustomerSessionsController";
import { EcommerceCustomerWishlistController } from "./controllers/ecommerce/customer/wishlist/EcommerceCustomerWishlistController";
import { EcommerceCustomerWishlistsController } from "./controllers/ecommerce/customer/wishlists/EcommerceCustomerWishlistsController";
import { EcommerceCustomerWishlistsItemsController } from "./controllers/ecommerce/customer/wishlists/items/EcommerceCustomerWishlistsItemsController";
import { EcommerceCustomersController } from "./controllers/ecommerce/customers/EcommerceCustomersController";
import { EcommerceProductsController } from "./controllers/ecommerce/products/EcommerceProductsController";
import { EcommerceProductsImagesController } from "./controllers/ecommerce/products/images/EcommerceProductsImagesController";
import { EcommerceProductsReviewsController } from "./controllers/ecommerce/products/reviews/EcommerceProductsReviewsController";
import { EcommerceProductsVariantsController } from "./controllers/ecommerce/products/variants/EcommerceProductsVariantsController";
import { EcommerceRequestsController } from "./controllers/ecommerce/requests/EcommerceRequestsController";
import { EcommerceSellerAnalyticsController } from "./controllers/ecommerce/seller/analytics/EcommerceSellerAnalyticsController";
import { EcommerceSellerApproval_statusController } from "./controllers/ecommerce/seller/approval-status/EcommerceSellerApproval_statusController";
import { EcommerceSellerApprovalsController } from "./controllers/ecommerce/seller/approvals/EcommerceSellerApprovalsController";
import { EcommerceSellerDashboardController } from "./controllers/ecommerce/seller/dashboard/EcommerceSellerDashboardController";
import { EcommerceSellerInventoryAnalyticsController } from "./controllers/ecommerce/seller/inventory/analytics/EcommerceSellerInventoryAnalyticsController";
import { EcommerceSellerOrdersItemsController } from "./controllers/ecommerce/seller/orders/items/EcommerceSellerOrdersItemsController";
import { EcommerceSellerOrdersItemsCancellation_requestsController } from "./controllers/ecommerce/seller/orders/items/cancellation-requests/EcommerceSellerOrdersItemsCancellation_requestsController";
import { EcommerceSellerOrdersItemsCancellation_requestsSnapshotsController } from "./controllers/ecommerce/seller/orders/items/cancellation-requests/snapshots/EcommerceSellerOrdersItemsCancellation_requestsSnapshotsController";
import { EcommerceSellerOrdersItemsRefund_requestsController } from "./controllers/ecommerce/seller/orders/items/refund-requests/EcommerceSellerOrdersItemsRefund_requestsController";
import { EcommerceSellerOrdersItemsRefund_requestsSnapshotsController } from "./controllers/ecommerce/seller/orders/items/refund-requests/snapshots/EcommerceSellerOrdersItemsRefund_requestsSnapshotsController";
import { EcommerceSellerOrdersItemsSnapshotController } from "./controllers/ecommerce/seller/orders/items/snapshot/EcommerceSellerOrdersItemsSnapshotController";
import { EcommerceSellerOrdersItemsSnapshotVariantController } from "./controllers/ecommerce/seller/orders/items/snapshot/variant/EcommerceSellerOrdersItemsSnapshotVariantController";
import { EcommerceSellerOrdersItemsSnapshotVariantOptionsController } from "./controllers/ecommerce/seller/orders/items/snapshot/variant/options/EcommerceSellerOrdersItemsSnapshotVariantOptionsController";
import { EcommerceSellerOrdersShipmentsController } from "./controllers/ecommerce/seller/orders/shipments/EcommerceSellerOrdersShipmentsController";
import { EcommerceSellerProductsController } from "./controllers/ecommerce/seller/products/EcommerceSellerProductsController";
import { EcommerceSellerProductsImagesController } from "./controllers/ecommerce/seller/products/images/EcommerceSellerProductsImagesController";
import { EcommerceSellerProductsRatingController } from "./controllers/ecommerce/seller/products/rating/EcommerceSellerProductsRatingController";
import { EcommerceSellerProductsSnapshotsController } from "./controllers/ecommerce/seller/products/snapshots/EcommerceSellerProductsSnapshotsController";
import { EcommerceSellerProductsVariantsController } from "./controllers/ecommerce/seller/products/variants/EcommerceSellerProductsVariantsController";
import { EcommerceSellerProfilesController } from "./controllers/ecommerce/seller/profiles/EcommerceSellerProfilesController";
import { EcommerceSellerReportsProductsController } from "./controllers/ecommerce/seller/reports/products/EcommerceSellerReportsProductsController";
import { EcommerceSellerReviewsStatisticsController } from "./controllers/ecommerce/seller/reviews/statistics/EcommerceSellerReviewsStatisticsController";
import { EcommerceSellerSnapshotsController } from "./controllers/ecommerce/seller/snapshots/EcommerceSellerSnapshotsController";
import { EcommerceSellerVariantsInventoryController } from "./controllers/ecommerce/seller/variants/inventory/EcommerceSellerVariantsInventoryController";
import { EcommerceSellersController } from "./controllers/ecommerce/sellers/EcommerceSellersController";
import { EcommerceController } from "./controllers/ecommerce/tree/EcommerceController";

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
    EcommerceSellersController,
    EcommerceAdminAdminsController,
    EcommerceAdminAudit_logsController,
    EcommerceCustomerAddressesController,
    EcommerceCustomerCartsController,
    EcommerceCustomerCartsItemsController,
    EcommerceCustomerWishlistsController,
    EcommerceCustomerWishlistsItemsController,
    EcommerceSellerProfilesController,
    EcommerceAdminProfilesController,
    EcommerceCustomerProfilesController,
    EcommerceSellerApprovalsController,
    EcommerceAdminApprovalsController,
    EcommerceSellerSnapshotsController,
    EcommerceAdminSnapshotsController,
    EcommerceCategoriesController,
    EcommerceAdminCategoriesController,
    EcommerceAdminCategoriesSnapshotsController,
    EcommerceProductsController,
    EcommerceSellerProductsController,
    EcommerceProductsVariantsController,
    EcommerceSellerProductsVariantsController,
    EcommerceProductsImagesController,
    EcommerceSellerProductsImagesController,
    EcommerceSellerVariantsInventoryController,
    EcommerceSellerProductsSnapshotsController,
    EcommerceAdminProductsSnapshotsController,
    EcommerceCustomerOrdersController,
    EcommerceAdminOrdersController,
    EcommerceCustomerOrdersItemsController,
    EcommerceSellerOrdersItemsController,
    EcommerceAdminOrdersItemsController,
    EcommerceCustomerOrdersItemsSnapshotController,
    EcommerceSellerOrdersItemsSnapshotController,
    EcommerceAdminOrdersItemsSnapshotController,
    EcommerceCustomerOrdersItemsSnapshotVariantOptionsController,
    EcommerceSellerOrdersItemsSnapshotVariantOptionsController,
    EcommerceAdminOrdersItemsSnapshotVariantOptionsController,
    EcommerceCustomerOrdersItemsSnapshotVariantController,
    EcommerceSellerOrdersItemsSnapshotVariantController,
    EcommerceAdminOrdersItemsSnapshotVariantController,
    EcommerceCustomerOrdersShipmentsController,
    EcommerceSellerOrdersShipmentsController,
    EcommerceAdminOrdersShipmentsController,
    EcommerceCustomerOrdersItemsCancellation_requestsController,
    EcommerceSellerOrdersItemsCancellation_requestsController,
    EcommerceAdminOrdersItemsCancellation_requestsController,
    EcommerceCustomerOrdersItemsCancellation_requestsSnapshotsController,
    EcommerceSellerOrdersItemsCancellation_requestsSnapshotsController,
    EcommerceAdminOrdersItemsCancellation_requestsSnapshotsController,
    EcommerceCustomerOrdersItemsRefund_requestsController,
    EcommerceSellerOrdersItemsRefund_requestsController,
    EcommerceAdminOrdersItemsRefund_requestsController,
    EcommerceCustomerOrdersItemsRefund_requestsSnapshotsController,
    EcommerceSellerOrdersItemsRefund_requestsSnapshotsController,
    EcommerceAdminOrdersItemsRefund_requestsSnapshotsController,
    EcommerceCustomerReviewsController,
    EcommerceProductsReviewsController,
    EcommerceAdminAdminReviewsController,
    EcommerceCustomerReviewsSnapshotsController,
    EcommerceAdminAdminReviewsSnapshotsController,
    EcommerceAdminRequestsController,
    EcommerceRequestsController,
    EcommerceAdminGradesController,
    EcommerceAdminGrade_transitionsController,
    EcommerceCustomerSession_statusController,
    EcommerceSellerApproval_statusController,
    EcommerceCustomerDeletion_validationController,
    EcommerceSellerDashboardController,
    EcommerceCustomerCartSummaryController,
    EcommerceCustomerWishlistController,
    EcommerceAdminApprovalsPendingController,
    EcommerceAdminProfilesSnapshotsController,
    EcommerceSellerAnalyticsController,
    EcommerceController,
    EcommerceCategoriesProductsController,
    EcommerceAdminStatisticsController,
    EcommerceCustomerSearchController,
    EcommerceSellerInventoryAnalyticsController,
    EcommerceSellerReportsProductsController,
    EcommerceAdminProductsController,
    EcommerceCustomerOrdersItemsConfirm_deliveryController,
    EcommerceAdminOrdersItemsForce_cancelController,
    EcommerceAdminOrdersItemsForce_refundController,
    EcommerceAdminAnalyticsController,
    EcommerceCustomerProductsRatingController,
    EcommerceSellerProductsRatingController,
    EcommerceAdminProductsRatingController,
    EcommerceCustomerReviewsSummaryController,
    EcommerceSellerReviewsStatisticsController,
    EcommerceAdminReportsController,
  ],
})
export class MyModule {}
