import { Module } from "@nestjs/common";

import { ShoppingmallAdminAdminCategoriesController } from "./controllers/shoppingMall/admin/admin/categories/overview/ShoppingmallAdminAdminCategoriesController";
import { ShoppingmallAdminAdminReviewsController } from "./controllers/shoppingMall/admin/admin/reviews/ShoppingmallAdminAdminReviewsController";
import { ShoppingmallAdminCategoriesController } from "./controllers/shoppingMall/admin/categories/ShoppingmallAdminCategoriesController";
import { ShoppingmallAdminCategoriesSubcategoriesController } from "./controllers/shoppingMall/admin/categories/subcategories/ShoppingmallAdminCategoriesSubcategoriesController";
import { ShoppingmallAdminConfigsController } from "./controllers/shoppingMall/admin/configs/ShoppingmallAdminConfigsController";
import { ShoppingmallAdminConfigsHistoryController } from "./controllers/shoppingMall/admin/configs/history/ShoppingmallAdminConfigsHistoryController";
import { ShoppingmallAdminDashboardHealthController } from "./controllers/shoppingMall/admin/dashboard/health/ShoppingmallAdminDashboardHealthController";
import { ShoppingmallAdminEmail_verificationsController } from "./controllers/shoppingMall/admin/email-verifications/ShoppingmallAdminEmail_verificationsController";
import { ShoppingmallAdminFeature_flagsController } from "./controllers/shoppingMall/admin/feature-flags/ShoppingmallAdminFeature_flagsController";
import { ShoppingmallAdminFeature_flagsImpact_analysisController } from "./controllers/shoppingMall/admin/feature-flags/impact-analysis/ShoppingmallAdminFeature_flagsImpact_analysisController";
import { ShoppingmallAdminLogsController } from "./controllers/shoppingMall/admin/logs/ShoppingmallAdminLogsController";
import { ShoppingmallAdminPassword_resetsController } from "./controllers/shoppingMall/admin/password-resets/ShoppingmallAdminPassword_resetsController";
import { ShoppingmallAdminShipmentsController } from "./controllers/shoppingMall/admin/shipments/ShoppingmallAdminShipmentsController";
import { ShoppingmallAdminStatus_reportController } from "./controllers/shoppingMall/admin/status-report/ShoppingmallAdminStatus_reportController";
import { ShoppingmallAdminStatusesController } from "./controllers/shoppingMall/admin/statuses/ShoppingmallAdminStatusesController";
import { ShoppingmallAdminVersionsController } from "./controllers/shoppingMall/admin/versions/ShoppingmallAdminVersionsController";
import { ShoppingmallAdminVersionsDeployment_historyController } from "./controllers/shoppingMall/admin/versions/deployment-history/ShoppingmallAdminVersionsDeployment_historyController";
import { ShoppingmallAuthAdminController } from "./controllers/shoppingMall/auth/admin/ShoppingmallAuthAdminController";
import { ShoppingmallAuthCustomerController } from "./controllers/shoppingMall/auth/customer/ShoppingmallAuthCustomerController";
import { ShoppingmallAuthSellerController } from "./controllers/shoppingMall/auth/seller/ShoppingmallAuthSellerController";
import { ShoppingmallAuthSuper_adminController } from "./controllers/shoppingMall/auth/super-admin/ShoppingmallAuthSuper_adminController";
import { ShoppingmallCancellation_request_snapshotsController } from "./controllers/shoppingMall/cancellation-request-snapshots/ShoppingmallCancellation_request_snapshotsController";
import { ShoppingmallCategoriesController } from "./controllers/shoppingMall/categories/ShoppingmallCategoriesController";
import { ShoppingmallCategoriesSubcategoriesController } from "./controllers/shoppingMall/categories/subcategories/ShoppingmallCategoriesSubcategoriesController";
import { ShoppingmallCustomerAvailability_cleanupController } from "./controllers/shoppingMall/customer/availability-cleanup/ShoppingmallCustomerAvailability_cleanupController";
import { ShoppingmallCustomerAvailabilityController } from "./controllers/shoppingMall/customer/availability/ShoppingmallCustomerAvailabilityController";
import { ShoppingmallCustomerCartsController } from "./controllers/shoppingMall/customer/carts/ShoppingmallCustomerCartsController";
import { ShoppingmallCustomerCartsHistoryController } from "./controllers/shoppingMall/customer/carts/history/ShoppingmallCustomerCartsHistoryController";
import { ShoppingmallCustomerEmail_verificationsController } from "./controllers/shoppingMall/customer/email-verifications/ShoppingmallCustomerEmail_verificationsController";
import { ShoppingmallCustomerItems_to_cartController } from "./controllers/shoppingMall/customer/items-to-cart/ShoppingmallCustomerItems_to_cartController";
import { ShoppingmallCustomerOrdersController } from "./controllers/shoppingMall/customer/orders/ShoppingmallCustomerOrdersController";
import { ShoppingmallCustomerOrdersItemsCancellation_requestsController } from "./controllers/shoppingMall/customer/orders/items/cancellation-requests/ShoppingmallCustomerOrdersItemsCancellation_requestsController";
import { ShoppingmallCustomerOrdersItemsRefund_requestsController } from "./controllers/shoppingMall/customer/orders/items/refund-requests/ShoppingmallCustomerOrdersItemsRefund_requestsController";
import { ShoppingmallCustomerOrdersItemsReviewsController } from "./controllers/shoppingMall/customer/orders/items/reviews/ShoppingmallCustomerOrdersItemsReviewsController";
import { ShoppingmallCustomerOrdersItemsSnapshotsController } from "./controllers/shoppingMall/customer/orders/items/snapshots/ShoppingmallCustomerOrdersItemsSnapshotsController";
import { ShoppingmallCustomerOrdersItemsStatus_historyController } from "./controllers/shoppingMall/customer/orders/items/status-history/ShoppingmallCustomerOrdersItemsStatus_historyController";
import { ShoppingmallCustomerOrdersShipmentsController } from "./controllers/shoppingMall/customer/orders/shipments/ShoppingmallCustomerOrdersShipmentsController";
import { ShoppingmallCustomerPassword_resetsController } from "./controllers/shoppingMall/customer/password-resets/ShoppingmallCustomerPassword_resetsController";
import { ShoppingmallCustomerPrice_calculationController } from "./controllers/shoppingMall/customer/price-calculation/ShoppingmallCustomerPrice_calculationController";
import { ShoppingmallCustomerProfileController } from "./controllers/shoppingMall/customer/profile/ShoppingmallCustomerProfileController";
import { ShoppingmallCustomerReviewsController } from "./controllers/shoppingMall/customer/reviews/ShoppingmallCustomerReviewsController";
import { ShoppingmallCustomerReviewsMeController } from "./controllers/shoppingMall/customer/reviews/me/ShoppingmallCustomerReviewsMeController";
import { ShoppingmallCustomerReviewsSnapshotsController } from "./controllers/shoppingMall/customer/reviews/snapshots/ShoppingmallCustomerReviewsSnapshotsController";
import { ShoppingmallCustomerShipmentsController } from "./controllers/shoppingMall/customer/shipments/ShoppingmallCustomerShipmentsController";
import { ShoppingmallCustomerShipmentsConfirm_deliveryController } from "./controllers/shoppingMall/customer/shipments/confirm-delivery/ShoppingmallCustomerShipmentsConfirm_deliveryController";
import { ShoppingmallCustomerController } from "./controllers/shoppingMall/customer/validate/ShoppingmallCustomerController";
import { ShoppingmallCustomerWishlistsController } from "./controllers/shoppingMall/customer/wishlists/ShoppingmallCustomerWishlistsController";
import { ShoppingmallProductsController } from "./controllers/shoppingMall/products/ShoppingmallProductsController";
import { ShoppingmallProductsImagesController } from "./controllers/shoppingMall/products/images/ShoppingmallProductsImagesController";
import { ShoppingmallProductsRatingController } from "./controllers/shoppingMall/products/rating/ShoppingmallProductsRatingController";
import { ShoppingmallProductsReviewsController } from "./controllers/shoppingMall/products/reviews/ShoppingmallProductsReviewsController";
import { ShoppingmallProductsReviewsAnalyticsController } from "./controllers/shoppingMall/products/reviews/analytics/ShoppingmallProductsReviewsAnalyticsController";
import { ShoppingmallProductsSnapshotsController } from "./controllers/shoppingMall/products/snapshots/ShoppingmallProductsSnapshotsController";
import { ShoppingmallProductsVariantsController } from "./controllers/shoppingMall/products/variants/ShoppingmallProductsVariantsController";
import { ShoppingmallRefund_request_snapshotsController } from "./controllers/shoppingMall/refund-request-snapshots/ShoppingmallRefund_request_snapshotsController";
import { ShoppingmallSearchProductsController } from "./controllers/shoppingMall/search/products/ShoppingmallSearchProductsController";
import { ShoppingmallSellerAnalyticsProductsController } from "./controllers/shoppingMall/seller/analytics/products/ShoppingmallSellerAnalyticsProductsController";
import { ShoppingmallSellerEmail_verificationsController } from "./controllers/shoppingMall/seller/email-verifications/ShoppingmallSellerEmail_verificationsController";
import { ShoppingmallSellerInventoryHistoryController } from "./controllers/shoppingMall/seller/inventory/history/ShoppingmallSellerInventoryHistoryController";
import { ShoppingmallSellerPassword_resetsController } from "./controllers/shoppingMall/seller/password-resets/ShoppingmallSellerPassword_resetsController";
import { ShoppingmallSellerProductsController } from "./controllers/shoppingMall/seller/products/ShoppingmallSellerProductsController";
import { ShoppingmallSellerProductsImagesController } from "./controllers/shoppingMall/seller/products/images/ShoppingmallSellerProductsImagesController";
import { ShoppingmallSellerProductsImagesOrderController } from "./controllers/shoppingMall/seller/products/images/order/ShoppingmallSellerProductsImagesOrderController";
import { ShoppingmallSellerProductsVariantsController } from "./controllers/shoppingMall/seller/products/variants/ShoppingmallSellerProductsVariantsController";
import { ShoppingmallSellerSellerReviewsController } from "./controllers/shoppingMall/seller/seller/reviews/ShoppingmallSellerSellerReviewsController";
import { ShoppingmallSellerSellerReviewsSnapshotsController } from "./controllers/shoppingMall/seller/seller/reviews/snapshots/ShoppingmallSellerSellerReviewsSnapshotsController";
import { ShoppingmallSellerSellerShipmentsController } from "./controllers/shoppingMall/seller/seller/shipments/ShoppingmallSellerSellerShipmentsController";
import { ShoppingmallSellerSellerShipmentsPendingController } from "./controllers/shoppingMall/seller/seller/shipments/pending/ShoppingmallSellerSellerShipmentsPendingController";
import { ShoppingmallSellerShipmentsController } from "./controllers/shoppingMall/seller/shipments/ShoppingmallSellerShipmentsController";
import { ShoppingmallSellerShipmentsTracking_historyController } from "./controllers/shoppingMall/seller/shipments/tracking-history/ShoppingmallSellerShipmentsTracking_historyController";
import { ShoppingmallSellers_snapshotsController } from "./controllers/shoppingMall/sellers-snapshots/ShoppingmallSellers_snapshotsController";
import { ShoppingmallSuperadminConfigsController } from "./controllers/shoppingMall/superAdmin/configs/ShoppingmallSuperadminConfigsController";
import { ShoppingmallSuperadminEmail_verificationsController } from "./controllers/shoppingMall/superAdmin/email-verifications/ShoppingmallSuperadminEmail_verificationsController";
import { ShoppingmallSuperadminFeature_flagsController } from "./controllers/shoppingMall/superAdmin/feature-flags/ShoppingmallSuperadminFeature_flagsController";
import { ShoppingmallSuperadminLogsController } from "./controllers/shoppingMall/superAdmin/logs/ShoppingmallSuperadminLogsController";
import { ShoppingmallSuperadminPassword_resetsController } from "./controllers/shoppingMall/superAdmin/password-resets/ShoppingmallSuperadminPassword_resetsController";
import { ShoppingmallSuperadminShipmentsController } from "./controllers/shoppingMall/superAdmin/shipments/ShoppingmallSuperadminShipmentsController";
import { ShoppingmallSuperadminStatusesController } from "./controllers/shoppingMall/superAdmin/statuses/ShoppingmallSuperadminStatusesController";
import { ShoppingmallSuperadminVersionsController } from "./controllers/shoppingMall/superAdmin/versions/ShoppingmallSuperadminVersionsController";

@Module({
  controllers: [
    ShoppingmallAuthCustomerController,
    ShoppingmallAuthSellerController,
    ShoppingmallAuthAdminController,
    ShoppingmallAuthSuper_adminController,
    ShoppingmallCustomerProfileController,
    ShoppingmallCustomerPassword_resetsController,
    ShoppingmallCustomerEmail_verificationsController,
    ShoppingmallSellerPassword_resetsController,
    ShoppingmallSellerEmail_verificationsController,
    ShoppingmallAdminPassword_resetsController,
    ShoppingmallAdminEmail_verificationsController,
    ShoppingmallSuperadminPassword_resetsController,
    ShoppingmallSuperadminEmail_verificationsController,
    ShoppingmallAdminConfigsController,
    ShoppingmallSuperadminConfigsController,
    ShoppingmallAdminVersionsController,
    ShoppingmallSuperadminVersionsController,
    ShoppingmallAdminLogsController,
    ShoppingmallSuperadminLogsController,
    ShoppingmallAdminStatusesController,
    ShoppingmallSuperadminStatusesController,
    ShoppingmallAdminFeature_flagsController,
    ShoppingmallSuperadminFeature_flagsController,
    ShoppingmallCategoriesController,
    ShoppingmallAdminCategoriesController,
    ShoppingmallCategoriesSubcategoriesController,
    ShoppingmallAdminCategoriesSubcategoriesController,
    ShoppingmallProductsController,
    ShoppingmallSellerProductsController,
    ShoppingmallProductsVariantsController,
    ShoppingmallSellerProductsVariantsController,
    ShoppingmallProductsImagesController,
    ShoppingmallSellerProductsImagesController,
    ShoppingmallSellerProductsImagesOrderController,
    ShoppingmallProductsSnapshotsController,
    ShoppingmallSellerInventoryHistoryController,
    ShoppingmallCustomerCartsController,
    ShoppingmallCustomerCartsHistoryController,
    ShoppingmallCustomerWishlistsController,
    ShoppingmallCustomerOrdersController,
    ShoppingmallCustomerOrdersItemsStatus_historyController,
    ShoppingmallCustomerOrdersItemsCancellation_requestsController,
    ShoppingmallSellerShipmentsController,
    ShoppingmallCustomerShipmentsConfirm_deliveryController,
    ShoppingmallCustomerOrdersItemsRefund_requestsController,
    ShoppingmallCustomerOrdersItemsSnapshotsController,
    ShoppingmallCustomerOrdersShipmentsController,
    ShoppingmallCustomerReviewsMeController,
    ShoppingmallCustomerReviewsController,
    ShoppingmallCustomerReviewsSnapshotsController,
    ShoppingmallAdminAdminReviewsController,
    ShoppingmallProductsReviewsController,
    ShoppingmallSellerSellerReviewsController,
    ShoppingmallSellerSellerReviewsSnapshotsController,
    ShoppingmallProductsRatingController,
    ShoppingmallSellers_snapshotsController,
    ShoppingmallCancellation_request_snapshotsController,
    ShoppingmallRefund_request_snapshotsController,
    ShoppingmallAdminStatus_reportController,
    ShoppingmallAdminConfigsHistoryController,
    ShoppingmallAdminFeature_flagsImpact_analysisController,
    ShoppingmallAdminDashboardHealthController,
    ShoppingmallAdminVersionsDeployment_historyController,
    ShoppingmallSellerAnalyticsProductsController,
    ShoppingmallAdminAdminCategoriesController,
    ShoppingmallSearchProductsController,
    ShoppingmallCustomerController,
    ShoppingmallCustomerAvailability_cleanupController,
    ShoppingmallCustomerPrice_calculationController,
    ShoppingmallCustomerItems_to_cartController,
    ShoppingmallCustomerAvailabilityController,
    ShoppingmallSellerSellerShipmentsPendingController,
    ShoppingmallSellerSellerShipmentsController,
    ShoppingmallCustomerShipmentsController,
    ShoppingmallAdminShipmentsController,
    ShoppingmallSuperadminShipmentsController,
    ShoppingmallSellerShipmentsTracking_historyController,
    ShoppingmallProductsReviewsAnalyticsController,
    ShoppingmallCustomerOrdersItemsReviewsController,
  ],
})
export class MyModule {}
