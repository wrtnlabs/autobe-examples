import { Module } from "@nestjs/common";

import { EcommercemallAdminAdmin_action_logsController } from "./controllers/ecommerceMall/admin/admin-action-logs/EcommercemallAdminAdmin_action_logsController";
import { EcommercemallAdminAdmin_requestsController } from "./controllers/ecommerceMall/admin/admin-requests/EcommercemallAdminAdmin_requestsController";
import { EcommercemallAdminAdmin_requestsPendingController } from "./controllers/ecommerceMall/admin/admin-requests/pending/EcommercemallAdminAdmin_requestsPendingController";
import { EcommercemallAdminAdmin_rolesController } from "./controllers/ecommerceMall/admin/admin-roles/EcommercemallAdminAdmin_rolesController";
import { EcommercemallAdminAnalyticsReviewsController } from "./controllers/ecommerceMall/admin/analytics/reviews/EcommercemallAdminAnalyticsReviewsController";
import { EcommercemallAdminApi_logsController } from "./controllers/ecommerceMall/admin/api-logs/EcommercemallAdminApi_logsController";
import { EcommercemallAdminCancellation_requestsSnapshotsController } from "./controllers/ecommerceMall/admin/cancellation-requests/snapshots/EcommercemallAdminCancellation_requestsSnapshotsController";
import { EcommercemallAdminCategoriesController } from "./controllers/ecommerceMall/admin/categories/EcommercemallAdminCategoriesController";
import { EcommercemallAdminDashboardController } from "./controllers/ecommerceMall/admin/dashboard/EcommercemallAdminDashboardController";
import { EcommercemallAdminIntegration_logsController } from "./controllers/ecommerceMall/admin/integration-logs/EcommercemallAdminIntegration_logsController";
import { EcommercemallAdminJob_queuesController } from "./controllers/ecommerceMall/admin/job-queues/EcommercemallAdminJob_queuesController";
import { EcommercemallAdminNotification_queuesController } from "./controllers/ecommerceMall/admin/notification-queues/EcommercemallAdminNotification_queuesController";
import { EcommercemallAdminOrder_overridesController } from "./controllers/ecommerceMall/admin/order-overrides/EcommercemallAdminOrder_overridesController";
import { EcommercemallAdminOrdersController } from "./controllers/ecommerceMall/admin/orders/EcommercemallAdminOrdersController";
import { EcommercemallAdminOrdersItemsController } from "./controllers/ecommerceMall/admin/orders/items/EcommercemallAdminOrdersItemsController";
import { EcommercemallAdminOrdersShipmentsController } from "./controllers/ecommerceMall/admin/orders/shipments/EcommercemallAdminOrdersShipmentsController";
import { EcommercemallAdminProduct_deletionsController } from "./controllers/ecommerceMall/admin/product-deletions/EcommercemallAdminProduct_deletionsController";
import { EcommercemallAdminProfileSnapshotsController } from "./controllers/ecommerceMall/admin/profile/snapshots/EcommercemallAdminProfileSnapshotsController";
import { EcommercemallAdminRate_limit_trackingsController } from "./controllers/ecommerceMall/admin/rate-limit-trackings/EcommercemallAdminRate_limit_trackingsController";
import { EcommercemallAdminRefund_requestsSnapshotsController } from "./controllers/ecommerceMall/admin/refund-requests/snapshots/EcommercemallAdminRefund_requestsSnapshotsController";
import { EcommercemallAdminScheduled_tasksController } from "./controllers/ecommerceMall/admin/scheduled-tasks/EcommercemallAdminScheduled_tasksController";
import { EcommercemallAdminSeller_registrationsController } from "./controllers/ecommerceMall/admin/seller-registrations/EcommercemallAdminSeller_registrationsController";
import { EcommercemallAdminSeller_suspensionsController } from "./controllers/ecommerceMall/admin/seller-suspensions/EcommercemallAdminSeller_suspensionsController";
import { EcommercemallAdminShipmentsController } from "./controllers/ecommerceMall/admin/shipments/EcommercemallAdminShipmentsController";
import { EcommercemallAdminShipmentsItemsController } from "./controllers/ecommerceMall/admin/shipments/items/EcommercemallAdminShipmentsItemsController";
import { EcommercemallAdminShipmentsTrackingController } from "./controllers/ecommerceMall/admin/shipments/tracking/EcommercemallAdminShipmentsTrackingController";
import { EcommercemallAdminSystem_configurationsController } from "./controllers/ecommerceMall/admin/system-configurations/EcommercemallAdminSystem_configurationsController";
import { EcommercemallAdminUser_bansController } from "./controllers/ecommerceMall/admin/user-bans/EcommercemallAdminUser_bansController";
import { EcommercemallAuthAdminController } from "./controllers/ecommerceMall/auth/admin/EcommercemallAuthAdminController";
import { EcommercemallAuthCustomerController } from "./controllers/ecommerceMall/auth/customer/EcommercemallAuthCustomerController";
import { EcommercemallAuthSellerController } from "./controllers/ecommerceMall/auth/seller/EcommercemallAuthSellerController";
import { EcommercemallCategoriesController } from "./controllers/ecommerceMall/categories/EcommercemallCategoriesController";
import { EcommercemallCategoriesSnapshotsController } from "./controllers/ecommerceMall/categories/snapshots/EcommercemallCategoriesSnapshotsController";
import { EcommercemallCustomerAddressesController } from "./controllers/ecommerceMall/customer/addresses/EcommercemallCustomerAddressesController";
import { EcommercemallCustomerAddresses_defaultController } from "./controllers/ecommerceMall/customer/addresses/default/EcommercemallCustomerAddresses_defaultController";
import { EcommercemallCustomerCancellation_requestsController } from "./controllers/ecommerceMall/customer/cancellation-requests/EcommercemallCustomerCancellation_requestsController";
import { EcommercemallCustomerCancellation_requestsSnapshotsController } from "./controllers/ecommerceMall/customer/cancellation-requests/snapshots/EcommercemallCustomerCancellation_requestsSnapshotsController";
import { EcommercemallCustomerCartController } from "./controllers/ecommerceMall/customer/cart/EcommercemallCustomerCartController";
import { EcommercemallCustomerCartItemsController } from "./controllers/ecommerceMall/customer/cart/items/EcommercemallCustomerCartItemsController";
import { EcommercemallCustomerCartValidationController } from "./controllers/ecommerceMall/customer/cart/validation/EcommercemallCustomerCartValidationController";
import { EcommercemallCustomerCustomersMeController } from "./controllers/ecommerceMall/customer/customers/me/EcommercemallCustomerCustomersMeController";
import { EcommercemallCustomerOrdersController } from "./controllers/ecommerceMall/customer/orders/EcommercemallCustomerOrdersController";
import { EcommercemallCustomerOrdersItemsController } from "./controllers/ecommerceMall/customer/orders/items/EcommercemallCustomerOrdersItemsController";
import { EcommercemallCustomerOrdersItemsRefundController } from "./controllers/ecommerceMall/customer/orders/items/refund/EcommercemallCustomerOrdersItemsRefundController";
import { EcommercemallCustomerOrdersShipmentsController } from "./controllers/ecommerceMall/customer/orders/shipments/EcommercemallCustomerOrdersShipmentsController";
import { EcommercemallCustomerProductsReviewsController } from "./controllers/ecommerceMall/customer/products/reviews/EcommercemallCustomerProductsReviewsController";
import { EcommercemallCustomerProductsVariantsController } from "./controllers/ecommerceMall/customer/products/variants/preview/EcommercemallCustomerProductsVariantsController";
import { EcommercemallCustomerProfileController } from "./controllers/ecommerceMall/customer/profile/EcommercemallCustomerProfileController";
import { EcommercemallCustomerRefund_requestsController } from "./controllers/ecommerceMall/customer/refund-requests/EcommercemallCustomerRefund_requestsController";
import { EcommercemallCustomerRefund_requestsSnapshotsController } from "./controllers/ecommerceMall/customer/refund-requests/snapshots/EcommercemallCustomerRefund_requestsSnapshotsController";
import { EcommercemallCustomerReviewsController } from "./controllers/ecommerceMall/customer/reviews/EcommercemallCustomerReviewsController";
import { EcommercemallCustomerReviewsHelpfulnessController } from "./controllers/ecommerceMall/customer/reviews/helpfulness/EcommercemallCustomerReviewsHelpfulnessController";
import { EcommercemallCustomerReviewsImagesController } from "./controllers/ecommerceMall/customer/reviews/images/EcommercemallCustomerReviewsImagesController";
import { EcommercemallCustomerReviewsSnapshotsController } from "./controllers/ecommerceMall/customer/reviews/snapshots/EcommercemallCustomerReviewsSnapshotsController";
import { EcommercemallCustomerShipmentsController } from "./controllers/ecommerceMall/customer/shipments/EcommercemallCustomerShipmentsController";
import { EcommercemallCustomerShipmentsItemsController } from "./controllers/ecommerceMall/customer/shipments/items/EcommercemallCustomerShipmentsItemsController";
import { EcommercemallCustomerShipmentsTrackingController } from "./controllers/ecommerceMall/customer/shipments/tracking/EcommercemallCustomerShipmentsTrackingController";
import { EcommercemallCustomerWishlistController } from "./controllers/ecommerceMall/customer/wishlist/EcommercemallCustomerWishlistController";
import { EcommercemallProductsController } from "./controllers/ecommerceMall/products/EcommercemallProductsController";
import { EcommercemallProductsReview_snapshotsController } from "./controllers/ecommerceMall/products/review-snapshots/EcommercemallProductsReview_snapshotsController";
import { EcommercemallProductsReviewsController } from "./controllers/ecommerceMall/products/reviews/EcommercemallProductsReviewsController";
import { EcommercemallReviewsHelpfulnessController } from "./controllers/ecommerceMall/reviews/helpfulness/EcommercemallReviewsHelpfulnessController";
import { EcommercemallReviewsImagesController } from "./controllers/ecommerceMall/reviews/images/EcommercemallReviewsImagesController";
import { EcommercemallSellerAnalyticsCustomer_behaviorController } from "./controllers/ecommerceMall/seller/analytics/customer-behavior/EcommercemallSellerAnalyticsCustomer_behaviorController";
import { EcommercemallSellerAnalyticsDashboardController } from "./controllers/ecommerceMall/seller/analytics/dashboard/EcommercemallSellerAnalyticsDashboardController";
import { EcommercemallSellerAnalyticsProduct_performanceController } from "./controllers/ecommerceMall/seller/analytics/product-performance/EcommercemallSellerAnalyticsProduct_performanceController";
import { EcommercemallSellerAnalyticsReviewsController } from "./controllers/ecommerceMall/seller/analytics/reviews/EcommercemallSellerAnalyticsReviewsController";
import { EcommercemallSellerCancellation_requestsController } from "./controllers/ecommerceMall/seller/cancellation-requests/EcommercemallSellerCancellation_requestsController";
import { EcommercemallSellerCancellation_requestsSnapshotsController } from "./controllers/ecommerceMall/seller/cancellation-requests/snapshots/EcommercemallSellerCancellation_requestsSnapshotsController";
import { EcommercemallSellerDashboardController } from "./controllers/ecommerceMall/seller/dashboard/EcommercemallSellerDashboardController";
import { EcommercemallSellerOrdersController } from "./controllers/ecommerceMall/seller/orders/EcommercemallSellerOrdersController";
import { EcommercemallSellerOrdersItemsController } from "./controllers/ecommerceMall/seller/orders/items/EcommercemallSellerOrdersItemsController";
import { EcommercemallSellerOrdersItemsCancelApproveController } from "./controllers/ecommerceMall/seller/orders/items/cancel/approve/EcommercemallSellerOrdersItemsCancelApproveController";
import { EcommercemallSellerOrdersItemsCancelController } from "./controllers/ecommerceMall/seller/orders/items/cancel/reject/EcommercemallSellerOrdersItemsCancelController";
import { EcommercemallSellerOrdersItemsRefundApproveController } from "./controllers/ecommerceMall/seller/orders/items/refund/approve/EcommercemallSellerOrdersItemsRefundApproveController";
import { EcommercemallSellerOrdersItemsRefundRejectController } from "./controllers/ecommerceMall/seller/orders/items/refund/reject/EcommercemallSellerOrdersItemsRefundRejectController";
import { EcommercemallSellerOrdersShipmentsController } from "./controllers/ecommerceMall/seller/orders/shipments/EcommercemallSellerOrdersShipmentsController";
import { EcommercemallSellerProductsController } from "./controllers/ecommerceMall/seller/products/EcommercemallSellerProductsController";
import { EcommercemallSellerProductsImagesController } from "./controllers/ecommerceMall/seller/products/images/EcommercemallSellerProductsImagesController";
import { EcommercemallSellerProductsVariantsController } from "./controllers/ecommerceMall/seller/products/variants/EcommercemallSellerProductsVariantsController";
import { EcommercemallSellerProfileSnapshotsController } from "./controllers/ecommerceMall/seller/profile/snapshots/EcommercemallSellerProfileSnapshotsController";
import { EcommercemallSellerRefund_requestsController } from "./controllers/ecommerceMall/seller/refund-requests/EcommercemallSellerRefund_requestsController";
import { EcommercemallSellerRefund_requestsSnapshotsController } from "./controllers/ecommerceMall/seller/refund-requests/snapshots/EcommercemallSellerRefund_requestsSnapshotsController";
import { EcommercemallSellerSellersProductsVariantsInventory_historyController } from "./controllers/ecommerceMall/seller/sellers/products/variants/inventory-history/EcommercemallSellerSellersProductsVariantsInventory_historyController";
import { EcommercemallSellerSellersRefund_requestsController } from "./controllers/ecommerceMall/seller/sellers/refund-requests/EcommercemallSellerSellersRefund_requestsController";
import { EcommercemallSellerSellersRefund_requestsSnapshotsController } from "./controllers/ecommerceMall/seller/sellers/refund-requests/snapshots/EcommercemallSellerSellersRefund_requestsSnapshotsController";
import { EcommercemallSellerShipmentsController } from "./controllers/ecommerceMall/seller/shipments/EcommercemallSellerShipmentsController";
import { EcommercemallSellerShipmentsItemsController } from "./controllers/ecommerceMall/seller/shipments/items/EcommercemallSellerShipmentsItemsController";
import { EcommercemallSellerShipmentsTrackingController } from "./controllers/ecommerceMall/seller/shipments/tracking/EcommercemallSellerShipmentsTrackingController";
import { EcommercemallSellersController } from "./controllers/ecommerceMall/sellers/EcommercemallSellersController";

@Module({
  controllers: [
    EcommercemallAuthCustomerController,
    EcommercemallAuthSellerController,
    EcommercemallAuthAdminController,
    EcommercemallCustomerCustomersMeController,
    EcommercemallCustomerProfileController,
    EcommercemallCustomerAddressesController,
    EcommercemallCustomerAddresses_defaultController,
    EcommercemallCustomerWishlistController,
    EcommercemallCustomerCartController,
    EcommercemallCustomerCartItemsController,
    EcommercemallCustomerCartValidationController,
    EcommercemallSellersController,
    EcommercemallSellerProfileSnapshotsController,
    EcommercemallAdminProfileSnapshotsController,
    EcommercemallAdminOrdersController,
    EcommercemallCustomerShipmentsController,
    EcommercemallCustomerOrdersController,
    EcommercemallSellerOrdersController,
    EcommercemallCustomerOrdersItemsController,
    EcommercemallSellerOrdersItemsController,
    EcommercemallAdminOrdersItemsController,
    EcommercemallSellerOrdersItemsCancelApproveController,
    EcommercemallSellerOrdersItemsCancelController,
    EcommercemallCustomerOrdersItemsRefundController,
    EcommercemallSellerOrdersItemsRefundApproveController,
    EcommercemallSellerOrdersItemsRefundRejectController,
    EcommercemallSellerOrdersShipmentsController,
    EcommercemallCustomerOrdersShipmentsController,
    EcommercemallAdminOrdersShipmentsController,
    EcommercemallSellerShipmentsController,
    EcommercemallAdminShipmentsController,
    EcommercemallCustomerShipmentsItemsController,
    EcommercemallSellerShipmentsItemsController,
    EcommercemallAdminShipmentsItemsController,
    EcommercemallCustomerShipmentsTrackingController,
    EcommercemallSellerShipmentsTrackingController,
    EcommercemallAdminShipmentsTrackingController,
    EcommercemallProductsController,
    EcommercemallSellerProductsController,
    EcommercemallSellerProductsImagesController,
    EcommercemallSellerProductsVariantsController,
    EcommercemallCategoriesSnapshotsController,
    EcommercemallCategoriesController,
    EcommercemallAdminCategoriesController,
    EcommercemallProductsReviewsController,
    EcommercemallCustomerProductsReviewsController,
    EcommercemallCustomerReviewsController,
    EcommercemallCustomerReviewsSnapshotsController,
    EcommercemallProductsReview_snapshotsController,
    EcommercemallCustomerReviewsHelpfulnessController,
    EcommercemallReviewsHelpfulnessController,
    EcommercemallCustomerReviewsImagesController,
    EcommercemallReviewsImagesController,
    EcommercemallSellerSellersRefund_requestsController,
    EcommercemallSellerSellersRefund_requestsSnapshotsController,
    EcommercemallCustomerCancellation_requestsController,
    EcommercemallSellerCancellation_requestsController,
    EcommercemallCustomerCancellation_requestsSnapshotsController,
    EcommercemallSellerCancellation_requestsSnapshotsController,
    EcommercemallAdminCancellation_requestsSnapshotsController,
    EcommercemallCustomerRefund_requestsController,
    EcommercemallSellerRefund_requestsController,
    EcommercemallCustomerRefund_requestsSnapshotsController,
    EcommercemallSellerRefund_requestsSnapshotsController,
    EcommercemallAdminRefund_requestsSnapshotsController,
    EcommercemallAdminAdmin_requestsController,
    EcommercemallAdminAdmin_rolesController,
    EcommercemallAdminSeller_registrationsController,
    EcommercemallAdminSeller_suspensionsController,
    EcommercemallAdminProduct_deletionsController,
    EcommercemallAdminOrder_overridesController,
    EcommercemallAdminUser_bansController,
    EcommercemallAdminSystem_configurationsController,
    EcommercemallAdminJob_queuesController,
    EcommercemallAdminScheduled_tasksController,
    EcommercemallAdminRate_limit_trackingsController,
    EcommercemallAdminApi_logsController,
    EcommercemallAdminAdmin_action_logsController,
    EcommercemallAdminNotification_queuesController,
    EcommercemallAdminIntegration_logsController,
    EcommercemallSellerAnalyticsDashboardController,
    EcommercemallCustomerProductsVariantsController,
    EcommercemallSellerSellersProductsVariantsInventory_historyController,
    EcommercemallSellerAnalyticsReviewsController,
    EcommercemallAdminAnalyticsReviewsController,
    EcommercemallSellerDashboardController,
    EcommercemallAdminDashboardController,
    EcommercemallAdminAdmin_requestsPendingController,
    EcommercemallSellerAnalyticsProduct_performanceController,
    EcommercemallSellerAnalyticsCustomer_behaviorController,
  ],
})
export class MyModule {}
