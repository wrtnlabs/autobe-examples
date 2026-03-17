import { Module } from "@nestjs/common";

import { EcommercemallAdminActivityAggregationController } from "./controllers/ecommerceMall/admin/activity/aggregation/EcommercemallAdminActivityAggregationController";
import { EcommercemallAdminAdminsController } from "./controllers/ecommerceMall/admin/admins/EcommercemallAdminAdminsController";
import { EcommercemallAdminApproval_requestsController } from "./controllers/ecommerceMall/admin/approval-requests/EcommercemallAdminApproval_requestsController";
import { EcommercemallAdminApproval_requestsSnapshotsController } from "./controllers/ecommerceMall/admin/approval-requests/snapshots/EcommercemallAdminApproval_requestsSnapshotsController";
import { EcommercemallAdminCancellation_requestsStatisticsController } from "./controllers/ecommerceMall/admin/cancellation-requests/statistics/EcommercemallAdminCancellation_requestsStatisticsController";
import { EcommercemallAdminCategoriesController } from "./controllers/ecommerceMall/admin/categories/EcommercemallAdminCategoriesController";
import { EcommercemallAdminCategoriesSnapshotsController } from "./controllers/ecommerceMall/admin/categories/snapshots/EcommercemallAdminCategoriesSnapshotsController";
import { EcommercemallAdminCustomersController } from "./controllers/ecommerceMall/admin/customers/EcommercemallAdminCustomersController";
import { EcommercemallAdminInventory_recordsController } from "./controllers/ecommerceMall/admin/inventory-records/EcommercemallAdminInventory_recordsController";
import { EcommercemallAdminNotificationDashboardController } from "./controllers/ecommerceMall/admin/notification/dashboard/EcommercemallAdminNotificationDashboardController";
import { EcommercemallAdminNotificationsController } from "./controllers/ecommerceMall/admin/notifications/EcommercemallAdminNotificationsController";
import { EcommercemallAdminPlatform_configurationsController } from "./controllers/ecommerceMall/admin/platform-configurations/EcommercemallAdminPlatform_configurationsController";
import { EcommercemallAdminProductsSnapshotsController } from "./controllers/ecommerceMall/admin/products/snapshots/EcommercemallAdminProductsSnapshotsController";
import { EcommercemallAdminProductsVariantsSnapshotsController } from "./controllers/ecommerceMall/admin/products/variants/snapshots/EcommercemallAdminProductsVariantsSnapshotsController";
import { EcommercemallAdminRefund_requestsController } from "./controllers/ecommerceMall/admin/refund-requests/EcommercemallAdminRefund_requestsController";
import { EcommercemallAdminRefund_requestsSnapshotsController } from "./controllers/ecommerceMall/admin/refund-requests/snapshots/EcommercemallAdminRefund_requestsSnapshotsController";
import { EcommercemallAdminReviewsSnapshotsController } from "./controllers/ecommerceMall/admin/reviews/snapshots/EcommercemallAdminReviewsSnapshotsController";
import { EcommercemallAdminSearchHealthController } from "./controllers/ecommerceMall/admin/search/health/EcommercemallAdminSearchHealthController";
import { EcommercemallAdminSearchController } from "./controllers/ecommerceMall/admin/search/reindex/EcommercemallAdminSearchController";
import { EcommercemallAdminSellersController } from "./controllers/ecommerceMall/admin/sellers/EcommercemallAdminSellersController";
import { EcommercemallAdminShipmentsController } from "./controllers/ecommerceMall/admin/shipments/EcommercemallAdminShipmentsController";
import { EcommercemallAdminShipmentsOrder_itemsController } from "./controllers/ecommerceMall/admin/shipments/order-items/EcommercemallAdminShipmentsOrder_itemsController";
import { EcommercemallAdminShipmentsSnapshotsController } from "./controllers/ecommerceMall/admin/shipments/snapshots/EcommercemallAdminShipmentsSnapshotsController";
import { EcommercemallAdminShipmentsTracking_codesController } from "./controllers/ecommerceMall/admin/shipments/tracking-codes/EcommercemallAdminShipmentsTracking_codesController";
import { EcommercemallAdminShipmentsTracking_updatesController } from "./controllers/ecommerceMall/admin/shipments/tracking-updates/EcommercemallAdminShipmentsTracking_updatesController";
import { EcommercemallAdminShipmentsTrackingupdatesController } from "./controllers/ecommerceMall/admin/shipments/trackingUpdates/EcommercemallAdminShipmentsTrackingupdatesController";
import { EcommercemallAuthAdminController } from "./controllers/ecommerceMall/auth/admin/EcommercemallAuthAdminController";
import { EcommercemallAuthCustomerController } from "./controllers/ecommerceMall/auth/customer/EcommercemallAuthCustomerController";
import { EcommercemallAuthGuestController } from "./controllers/ecommerceMall/auth/guest/EcommercemallAuthGuestController";
import { EcommercemallAuthSellerController } from "./controllers/ecommerceMall/auth/seller/EcommercemallAuthSellerController";
import { EcommercemallAuthSuperadminController } from "./controllers/ecommerceMall/auth/superAdmin/EcommercemallAuthSuperadminController";
import { EcommercemallCategoriesController } from "./controllers/ecommerceMall/categories/EcommercemallCategoriesController";
import { EcommercemallCustomerAddressesController } from "./controllers/ecommerceMall/customer/addresses/EcommercemallCustomerAddressesController";
import { EcommercemallCustomerAddresses_defaultController } from "./controllers/ecommerceMall/customer/addresses/default/EcommercemallCustomerAddresses_defaultController";
import { EcommercemallCustomerCancellation_request_snapshotsController } from "./controllers/ecommerceMall/customer/cancellation-request-snapshots/EcommercemallCustomerCancellation_request_snapshotsController";
import { EcommercemallCustomerCancellation_requestsController } from "./controllers/ecommerceMall/customer/cancellation-requests/EcommercemallCustomerCancellation_requestsController";
import { EcommercemallCustomerCancellation_requestsSnapshotsController } from "./controllers/ecommerceMall/customer/cancellation-requests/snapshots/EcommercemallCustomerCancellation_requestsSnapshotsController";
import { EcommercemallCustomerNotificationsController } from "./controllers/ecommerceMall/customer/notifications/EcommercemallCustomerNotificationsController";
import { EcommercemallCustomerOrdersController } from "./controllers/ecommerceMall/customer/orders/EcommercemallCustomerOrdersController";
import { EcommercemallCustomerOrdersItemsController } from "./controllers/ecommerceMall/customer/orders/items/EcommercemallCustomerOrdersItemsController";
import { EcommercemallCustomerOrdersItems_snapshotsController } from "./controllers/ecommerceMall/customer/orders/items/snapshots/EcommercemallCustomerOrdersItems_snapshotsController";
import { EcommercemallCustomerOrdersSnapshotsController } from "./controllers/ecommerceMall/customer/orders/snapshots/EcommercemallCustomerOrdersSnapshotsController";
import { EcommercemallCustomerProductsReview_statsController } from "./controllers/ecommerceMall/customer/products/review-stats/EcommercemallCustomerProductsReview_statsController";
import { EcommercemallCustomerProfileController } from "./controllers/ecommerceMall/customer/profile/EcommercemallCustomerProfileController";
import { EcommercemallCustomerRefund_requestsController } from "./controllers/ecommerceMall/customer/refund-requests/EcommercemallCustomerRefund_requestsController";
import { EcommercemallCustomerRefund_requestsAnalyticsController } from "./controllers/ecommerceMall/customer/refund-requests/analytics/EcommercemallCustomerRefund_requestsAnalyticsController";
import { EcommercemallCustomerRefund_requestsSnapshotsController } from "./controllers/ecommerceMall/customer/refund-requests/snapshots/EcommercemallCustomerRefund_requestsSnapshotsController";
import { EcommercemallCustomerReviewsController } from "./controllers/ecommerceMall/customer/reviews/EcommercemallCustomerReviewsController";
import { EcommercemallCustomerReviewsHelpfulController } from "./controllers/ecommerceMall/customer/reviews/helpful/EcommercemallCustomerReviewsHelpfulController";
import { EcommercemallCustomerReviewsHelpfulness_votesController } from "./controllers/ecommerceMall/customer/reviews/helpfulness-votes/EcommercemallCustomerReviewsHelpfulness_votesController";
import { EcommercemallCustomerReviewsSearchController } from "./controllers/ecommerceMall/customer/reviews/search/EcommercemallCustomerReviewsSearchController";
import { EcommercemallCustomerReviewsSnapshotsController } from "./controllers/ecommerceMall/customer/reviews/snapshots/EcommercemallCustomerReviewsSnapshotsController";
import { EcommercemallCustomerSessionsController } from "./controllers/ecommerceMall/customer/sessions/EcommercemallCustomerSessionsController";
import { EcommercemallCustomerShipmentsController } from "./controllers/ecommerceMall/customer/shipments/EcommercemallCustomerShipmentsController";
import { EcommercemallCustomerShipmentsOrder_itemsController } from "./controllers/ecommerceMall/customer/shipments/order-items/EcommercemallCustomerShipmentsOrder_itemsController";
import { EcommercemallCustomerShipmentsTracking_codesController } from "./controllers/ecommerceMall/customer/shipments/tracking-codes/EcommercemallCustomerShipmentsTracking_codesController";
import { EcommercemallCustomerShipmentsTracking_updatesController } from "./controllers/ecommerceMall/customer/shipments/tracking-updates/EcommercemallCustomerShipmentsTracking_updatesController";
import { EcommercemallCustomerShipmentsTrackingupdatesController } from "./controllers/ecommerceMall/customer/shipments/trackingUpdates/EcommercemallCustomerShipmentsTrackingupdatesController";
import { EcommercemallCustomerSnapshotsController } from "./controllers/ecommerceMall/customer/snapshots/EcommercemallCustomerSnapshotsController";
import { EcommercemallCustomerWishlist_itemsController } from "./controllers/ecommerceMall/customer/wishlist-items/EcommercemallCustomerWishlist_itemsController";
import { EcommercemallGuestNotificationsController } from "./controllers/ecommerceMall/guest/notifications/EcommercemallGuestNotificationsController";
import { EcommercemallProductsController } from "./controllers/ecommerceMall/products/EcommercemallProductsController";
import { EcommercemallProductsImagesController } from "./controllers/ecommerceMall/products/images/EcommercemallProductsImagesController";
import { EcommercemallProductsReviewsController } from "./controllers/ecommerceMall/products/reviews/EcommercemallProductsReviewsController";
import { EcommercemallProductsVariantsController } from "./controllers/ecommerceMall/products/variants/EcommercemallProductsVariantsController";
import { EcommercemallProductsVariantsOptionsController } from "./controllers/ecommerceMall/products/variants/options/EcommercemallProductsVariantsOptionsController";
import { EcommercemallReviewsController } from "./controllers/ecommerceMall/reviews/EcommercemallReviewsController";
import { EcommercemallReviewsHelpfulness_votesController } from "./controllers/ecommerceMall/reviews/helpfulness-votes/EcommercemallReviewsHelpfulness_votesController";
import { EcommercemallSellerApproval_requestsController } from "./controllers/ecommerceMall/seller/approval-requests/EcommercemallSellerApproval_requestsController";
import { EcommercemallSellerCancellation_requestsController } from "./controllers/ecommerceMall/seller/cancellation-requests/EcommercemallSellerCancellation_requestsController";
import { EcommercemallSellerInventory_recordsController } from "./controllers/ecommerceMall/seller/inventory-records/EcommercemallSellerInventory_recordsController";
import { EcommercemallSellerInventory_recordsSnapshotsController } from "./controllers/ecommerceMall/seller/inventory-records/snapshots/EcommercemallSellerInventory_recordsSnapshotsController";
import { EcommercemallSellerNotificationsController } from "./controllers/ecommerceMall/seller/notifications/EcommercemallSellerNotificationsController";
import { EcommercemallSellerProductsController } from "./controllers/ecommerceMall/seller/products/EcommercemallSellerProductsController";
import { EcommercemallSellerProductsImagesController } from "./controllers/ecommerceMall/seller/products/images/EcommercemallSellerProductsImagesController";
import { EcommercemallSellerProductsImagesReorderController } from "./controllers/ecommerceMall/seller/products/images/reorder/EcommercemallSellerProductsImagesReorderController";
import { EcommercemallSellerProductsSnapshotsController } from "./controllers/ecommerceMall/seller/products/snapshots/EcommercemallSellerProductsSnapshotsController";
import { EcommercemallSellerProductsVariantsController } from "./controllers/ecommerceMall/seller/products/variants/EcommercemallSellerProductsVariantsController";
import { EcommercemallSellerProductsVariantsOptionsController } from "./controllers/ecommerceMall/seller/products/variants/options/EcommercemallSellerProductsVariantsOptionsController";
import { EcommercemallSellerProductsVariantsSnapshotsController } from "./controllers/ecommerceMall/seller/products/variants/snapshots/EcommercemallSellerProductsVariantsSnapshotsController";
import { EcommercemallSellerRefund_requestsController } from "./controllers/ecommerceMall/seller/refund-requests/EcommercemallSellerRefund_requestsController";
import { EcommercemallSellerRefund_requestsPendingController } from "./controllers/ecommerceMall/seller/refund-requests/pending/EcommercemallSellerRefund_requestsPendingController";
import { EcommercemallSellerRefund_requestsSnapshotsController } from "./controllers/ecommerceMall/seller/refund-requests/snapshots/EcommercemallSellerRefund_requestsSnapshotsController";
import { EcommercemallSellerShipmentsController } from "./controllers/ecommerceMall/seller/shipments/EcommercemallSellerShipmentsController";
import { EcommercemallSellerShipmentsOrder_itemsController } from "./controllers/ecommerceMall/seller/shipments/order-items/EcommercemallSellerShipmentsOrder_itemsController";
import { EcommercemallSellerShipmentsSnapshotsController } from "./controllers/ecommerceMall/seller/shipments/snapshots/EcommercemallSellerShipmentsSnapshotsController";
import { EcommercemallSellerShipmentsTracking_codesController } from "./controllers/ecommerceMall/seller/shipments/tracking-codes/EcommercemallSellerShipmentsTracking_codesController";
import { EcommercemallSellerShipmentsTracking_updatesController } from "./controllers/ecommerceMall/seller/shipments/tracking-updates/EcommercemallSellerShipmentsTracking_updatesController";
import { EcommercemallSellerShipmentsTrackingupdatesController } from "./controllers/ecommerceMall/seller/shipments/trackingUpdates/EcommercemallSellerShipmentsTrackingupdatesController";
import { EcommercemallSellerController } from "./controllers/ecommerceMall/seller/status/EcommercemallSellerController";
import { EcommercemallSuperadminAdminsController } from "./controllers/ecommerceMall/superAdmin/admins/EcommercemallSuperadminAdminsController";
import { EcommercemallSuperadminConfigCompare_environmentsController } from "./controllers/ecommerceMall/superAdmin/config/compare-environments/EcommercemallSuperadminConfigCompare_environmentsController";
import { EcommercemallSuperadminNotificationsController } from "./controllers/ecommerceMall/superAdmin/notifications/EcommercemallSuperadminNotificationsController";
import { EcommercemallSuperadminPlatform_configurationsController } from "./controllers/ecommerceMall/superAdmin/platform-configurations/EcommercemallSuperadminPlatform_configurationsController";
import { EcommercemallSuperadminRefund_requestsController } from "./controllers/ecommerceMall/superAdmin/refund-requests/EcommercemallSuperadminRefund_requestsController";
import { EcommercemallSuperadminRefund_requestsSnapshotsController } from "./controllers/ecommerceMall/superAdmin/refund-requests/snapshots/EcommercemallSuperadminRefund_requestsSnapshotsController";
import { EcommercemallSuperadminSuper_adminsController } from "./controllers/ecommerceMall/superAdmin/super-admins/EcommercemallSuperadminSuper_adminsController";

@Module({
  controllers: [
    EcommercemallAuthGuestController,
    EcommercemallAuthCustomerController,
    EcommercemallAuthSellerController,
    EcommercemallAuthAdminController,
    EcommercemallAuthSuperadminController,
    EcommercemallAdminCustomersController,
    EcommercemallCustomerSessionsController,
    EcommercemallAdminSellersController,
    EcommercemallSuperadminAdminsController,
    EcommercemallAdminAdminsController,
    EcommercemallSuperadminSuper_adminsController,
    EcommercemallCustomerProfileController,
    EcommercemallCategoriesController,
    EcommercemallAdminCategoriesController,
    EcommercemallAdminCategoriesSnapshotsController,
    EcommercemallProductsController,
    EcommercemallSellerProductsController,
    EcommercemallSellerProductsVariantsController,
    EcommercemallProductsVariantsController,
    EcommercemallSellerProductsImagesController,
    EcommercemallProductsImagesController,
    EcommercemallSellerProductsVariantsOptionsController,
    EcommercemallProductsVariantsOptionsController,
    EcommercemallSellerProductsSnapshotsController,
    EcommercemallAdminProductsSnapshotsController,
    EcommercemallSellerProductsVariantsSnapshotsController,
    EcommercemallAdminProductsVariantsSnapshotsController,
    EcommercemallSellerInventory_recordsController,
    EcommercemallAdminInventory_recordsController,
    EcommercemallSellerInventory_recordsSnapshotsController,
    EcommercemallCustomerOrdersController,
    EcommercemallCustomerOrdersItemsController,
    EcommercemallCustomerOrdersSnapshotsController,
    EcommercemallCustomerOrdersItems_snapshotsController,
    EcommercemallSellerShipmentsController,
    EcommercemallAdminShipmentsController,
    EcommercemallCustomerShipmentsController,
    EcommercemallSellerShipmentsOrder_itemsController,
    EcommercemallAdminShipmentsOrder_itemsController,
    EcommercemallCustomerShipmentsOrder_itemsController,
    EcommercemallSellerShipmentsSnapshotsController,
    EcommercemallAdminShipmentsSnapshotsController,
    EcommercemallSellerShipmentsTracking_codesController,
    EcommercemallAdminShipmentsTracking_codesController,
    EcommercemallCustomerShipmentsTracking_codesController,
    EcommercemallSellerShipmentsTracking_updatesController,
    EcommercemallAdminShipmentsTracking_updatesController,
    EcommercemallCustomerShipmentsTracking_updatesController,
    EcommercemallSellerShipmentsTrackingupdatesController,
    EcommercemallAdminShipmentsTrackingupdatesController,
    EcommercemallCustomerShipmentsTrackingupdatesController,
    EcommercemallProductsReviewsController,
    EcommercemallReviewsController,
    EcommercemallCustomerReviewsController,
    EcommercemallReviewsHelpfulness_votesController,
    EcommercemallCustomerReviewsHelpfulness_votesController,
    EcommercemallCustomerReviewsSnapshotsController,
    EcommercemallAdminReviewsSnapshotsController,
    EcommercemallAdminNotificationsController,
    EcommercemallSuperadminNotificationsController,
    EcommercemallCustomerNotificationsController,
    EcommercemallSellerNotificationsController,
    EcommercemallGuestNotificationsController,
    EcommercemallAdminPlatform_configurationsController,
    EcommercemallSuperadminPlatform_configurationsController,
    EcommercemallCustomerAddressesController,
    EcommercemallCustomerSnapshotsController,
    EcommercemallCustomerWishlist_itemsController,
    EcommercemallCustomerCancellation_requestsController,
    EcommercemallCustomerCancellation_requestsSnapshotsController,
    EcommercemallCustomerCancellation_request_snapshotsController,
    EcommercemallSellerCancellation_requestsController,
    EcommercemallCustomerRefund_requestsController,
    EcommercemallSellerRefund_requestsController,
    EcommercemallAdminRefund_requestsController,
    EcommercemallSuperadminRefund_requestsController,
    EcommercemallCustomerRefund_requestsSnapshotsController,
    EcommercemallSellerRefund_requestsSnapshotsController,
    EcommercemallAdminRefund_requestsSnapshotsController,
    EcommercemallSuperadminRefund_requestsSnapshotsController,
    EcommercemallSellerApproval_requestsController,
    EcommercemallAdminApproval_requestsController,
    EcommercemallAdminApproval_requestsSnapshotsController,
    EcommercemallSellerProductsImagesReorderController,
    EcommercemallCustomerProductsReview_statsController,
    EcommercemallCustomerReviewsSearchController,
    EcommercemallCustomerReviewsHelpfulController,
    EcommercemallAdminNotificationDashboardController,
    EcommercemallAdminActivityAggregationController,
    EcommercemallAdminSearchHealthController,
    EcommercemallAdminSearchController,
    EcommercemallSuperadminConfigCompare_environmentsController,
    EcommercemallCustomerAddresses_defaultController,
    EcommercemallAdminCancellation_requestsStatisticsController,
    EcommercemallCustomerRefund_requestsAnalyticsController,
    EcommercemallSellerRefund_requestsPendingController,
    EcommercemallSellerController,
  ],
})
export class MyModule {}
