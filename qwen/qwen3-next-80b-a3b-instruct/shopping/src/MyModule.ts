import { Module } from "@nestjs/common";

import { ShoppingmallAdminAdminsCustomersBanController } from "./controllers/shoppingMall/admin/admins/customers/ban/ShoppingmallAdminAdminsCustomersBanController";
import { ShoppingmallAdminAdminsMeController } from "./controllers/shoppingMall/admin/admins/me/ShoppingmallAdminAdminsMeController";
import { ShoppingmallAdminAdminsOrdersItemsCancelController } from "./controllers/shoppingMall/admin/admins/orders/items/cancel/ShoppingmallAdminAdminsOrdersItemsCancelController";
import { ShoppingmallAdminAdminsOrdersItemsController } from "./controllers/shoppingMall/admin/admins/orders/items/refund/ShoppingmallAdminAdminsOrdersItemsController";
import { ShoppingmallAdminAdminsProductsController } from "./controllers/shoppingMall/admin/admins/products/ShoppingmallAdminAdminsProductsController";
import { ShoppingmallAdminAdminsSellersController } from "./controllers/shoppingMall/admin/admins/sellers/ShoppingmallAdminAdminsSellersController";
import { ShoppingmallAdminAdminsSellersUnsuspendController } from "./controllers/shoppingMall/admin/admins/sellers/unsuspend/ShoppingmallAdminAdminsSellersUnsuspendController";
import { ShoppingmallAdminAnalyticsOrdersController } from "./controllers/shoppingMall/admin/analytics/orders/ShoppingmallAdminAnalyticsOrdersController";
import { ShoppingmallAdminAnalyticsProductsEngagementController } from "./controllers/shoppingMall/admin/analytics/products/engagement/ShoppingmallAdminAnalyticsProductsEngagementController";
import { ShoppingmallAdminAnalyticsPromotionsEffectivenessController } from "./controllers/shoppingMall/admin/analytics/promotions/effectiveness/ShoppingmallAdminAnalyticsPromotionsEffectivenessController";
import { ShoppingmallAdminAnalyticsSalesMonthlyController } from "./controllers/shoppingMall/admin/analytics/sales/monthly/ShoppingmallAdminAnalyticsSalesMonthlyController";
import { ShoppingmallAdminAuthAdminsEmailController } from "./controllers/shoppingMall/admin/auth/admins/email/ShoppingmallAdminAuthAdminsEmailController";
import { ShoppingmallAdminAuthAdminsLogoutController } from "./controllers/shoppingMall/admin/auth/admins/logout/ShoppingmallAdminAuthAdminsLogoutController";
import { ShoppingmallAdminCancellation_requestsController } from "./controllers/shoppingMall/admin/cancellation-requests/ShoppingmallAdminCancellation_requestsController";
import { ShoppingmallAdminCategoriesController } from "./controllers/shoppingMall/admin/categories/ShoppingmallAdminCategoriesController";
import { ShoppingmallAdminChannelsController } from "./controllers/shoppingMall/admin/channels/ShoppingmallAdminChannelsController";
import { ShoppingmallAdminConfigurationsController } from "./controllers/shoppingMall/admin/configurations/ShoppingmallAdminConfigurationsController";
import { ShoppingmallAdminCustomersBanController } from "./controllers/shoppingMall/admin/customers/ban/ShoppingmallAdminCustomersBanController";
import { ShoppingmallAdminCustomersUnbanController } from "./controllers/shoppingMall/admin/customers/unban/ShoppingmallAdminCustomersUnbanController";
import { ShoppingmallAdminDashboardAdminOverviewController } from "./controllers/shoppingMall/admin/dashboard/admin/overview/ShoppingmallAdminDashboardAdminOverviewController";
import { ShoppingmallAdminInventoriesAnalyticsController } from "./controllers/shoppingMall/admin/inventories/analytics/ShoppingmallAdminInventoriesAnalyticsController";
import { ShoppingmallAdminInventoriesReportsController } from "./controllers/shoppingMall/admin/inventories/reports/ShoppingmallAdminInventoriesReportsController";
import { ShoppingmallAdminInventoriesStatisticsController } from "./controllers/shoppingMall/admin/inventories/statistics/ShoppingmallAdminInventoriesStatisticsController";
import { ShoppingmallAdminInventoryMetricsHealthController } from "./controllers/shoppingMall/admin/inventory/metrics/health/ShoppingmallAdminInventoryMetricsHealthController";
import { ShoppingmallAdminInventoryRecordsController } from "./controllers/shoppingMall/admin/inventory/records/ShoppingmallAdminInventoryRecordsController";
import { ShoppingmallAdminOrdersController } from "./controllers/shoppingMall/admin/orders/ShoppingmallAdminOrdersController";
import { ShoppingmallAdminOrdersItemsController } from "./controllers/shoppingMall/admin/orders/items/ShoppingmallAdminOrdersItemsController";
import { ShoppingmallAdminOrdersItemsCancelController } from "./controllers/shoppingMall/admin/orders/items/cancel/ShoppingmallAdminOrdersItemsCancelController";
import { ShoppingmallAdminOrdersItemsRefundController } from "./controllers/shoppingMall/admin/orders/items/refund/ShoppingmallAdminOrdersItemsRefundController";
import { ShoppingmallAdminProductsManageController } from "./controllers/shoppingMall/admin/products/manage/ShoppingmallAdminProductsManageController";
import { ShoppingmallAdminRefund_requestsController } from "./controllers/shoppingMall/admin/refund-requests/ShoppingmallAdminRefund_requestsController";
import { ShoppingmallAdminResourcesController } from "./controllers/shoppingMall/admin/resources/ShoppingmallAdminResourcesController";
import { ShoppingmallAdminReviewsDashboardController } from "./controllers/shoppingMall/admin/reviews/dashboard/ShoppingmallAdminReviewsDashboardController";
import { ShoppingmallAdminReviewsMetricsAnalyticsController } from "./controllers/shoppingMall/admin/reviews/metrics/analytics/ShoppingmallAdminReviewsMetricsAnalyticsController";
import { ShoppingmallAdminReviewsController } from "./controllers/shoppingMall/admin/reviews/report/ShoppingmallAdminReviewsController";
import { ShoppingmallAdminReviewsReportsController } from "./controllers/shoppingMall/admin/reviews/reports/ShoppingmallAdminReviewsReportsController";
import { ShoppingmallAdminReviewsStatsController } from "./controllers/shoppingMall/admin/reviews/stats/ShoppingmallAdminReviewsStatsController";
import { ShoppingmallAdminSalesMetricsPerformanceController } from "./controllers/shoppingMall/admin/sales/metrics/performance/ShoppingmallAdminSalesMetricsPerformanceController";
import { ShoppingmallAdminSectionsController } from "./controllers/shoppingMall/admin/sections/ShoppingmallAdminSectionsController";
import { ShoppingmallAdminSellersController } from "./controllers/shoppingMall/admin/sellers/ShoppingmallAdminSellersController";
import { ShoppingmallAdminSellersApproveController } from "./controllers/shoppingMall/admin/sellers/approve/ShoppingmallAdminSellersApproveController";
import { ShoppingmallAuthAdminController } from "./controllers/shoppingMall/auth/admin/ShoppingmallAuthAdminController";
import { ShoppingmallAuthAdminLoginController } from "./controllers/shoppingMall/auth/admin/login/ShoppingmallAuthAdminLoginController";
import { ShoppingmallAuthCustomerController } from "./controllers/shoppingMall/auth/customer/ShoppingmallAuthCustomerController";
import { ShoppingmallAuthSellerController } from "./controllers/shoppingMall/auth/seller/ShoppingmallAuthSellerController";
import { ShoppingmallAuthSuperadminController } from "./controllers/shoppingMall/auth/superAdmin/ShoppingmallAuthSuperadminController";
import { ShoppingmallCustomerAdminsRequestsController } from "./controllers/shoppingMall/customer/admins/requests/ShoppingmallCustomerAdminsRequestsController";
import { ShoppingmallCustomerAnalysisCartsCustomerController } from "./controllers/shoppingMall/customer/analysis/carts/customer/ShoppingmallCustomerAnalysisCartsCustomerController";
import { ShoppingmallCustomerAuthCustomersEmailController } from "./controllers/shoppingMall/customer/auth/customers/email/ShoppingmallCustomerAuthCustomersEmailController";
import { ShoppingmallCustomerAuthCustomersLogoutController } from "./controllers/shoppingMall/customer/auth/customers/logout/ShoppingmallCustomerAuthCustomersLogoutController";
import { ShoppingmallCustomerCancellation_requestsController } from "./controllers/shoppingMall/customer/cancellation-requests/ShoppingmallCustomerCancellation_requestsController";
import { ShoppingmallCustomerCart_itemsController } from "./controllers/shoppingMall/customer/cart-items/ShoppingmallCustomerCart_itemsController";
import { ShoppingmallCustomerCartMeMetricsController } from "./controllers/shoppingMall/customer/cart/me/metrics/ShoppingmallCustomerCartMeMetricsController";
import { ShoppingmallCustomerCustomersMeController } from "./controllers/shoppingMall/customer/customers/me/ShoppingmallCustomerCustomersMeController";
import { ShoppingmallCustomerOrdersController } from "./controllers/shoppingMall/customer/orders/ShoppingmallCustomerOrdersController";
import { ShoppingmallCustomerOrdersItemsController } from "./controllers/shoppingMall/customer/orders/items/ShoppingmallCustomerOrdersItemsController";
import { ShoppingmallCustomerOrdersMetricsController } from "./controllers/shoppingMall/customer/orders/metrics/ShoppingmallCustomerOrdersMetricsController";
import { ShoppingmallCustomerOrdersShipmentsController } from "./controllers/shoppingMall/customer/orders/shipments/ShoppingmallCustomerOrdersShipmentsController";
import { ShoppingmallCustomerRefund_requestsController } from "./controllers/shoppingMall/customer/refund-requests/ShoppingmallCustomerRefund_requestsController";
import { ShoppingmallCustomerReviewsController } from "./controllers/shoppingMall/customer/reviews/ShoppingmallCustomerReviewsController";
import { ShoppingmallCustomerReviewsMetricsController } from "./controllers/shoppingMall/customer/reviews/metrics/ShoppingmallCustomerReviewsMetricsController";
import { ShoppingmallCustomerReviewsReportsController } from "./controllers/shoppingMall/customer/reviews/reports/ShoppingmallCustomerReviewsReportsController";
import { ShoppingmallCustomerReviewsSnapshotsController } from "./controllers/shoppingMall/customer/reviews/snapshots/ShoppingmallCustomerReviewsSnapshotsController";
import { ShoppingmallCustomerReviewsVotesController } from "./controllers/shoppingMall/customer/reviews/votes/ShoppingmallCustomerReviewsVotesController";
import { ShoppingmallCustomerSalesMetricsController } from "./controllers/shoppingMall/customer/sales/metrics/ShoppingmallCustomerSalesMetricsController";
import { ShoppingmallProductsSearchController } from "./controllers/shoppingMall/products/search/ShoppingmallProductsSearchController";
import { ShoppingmallSearchProductsGlobalController } from "./controllers/shoppingMall/search/products/global/ShoppingmallSearchProductsGlobalController";
import { ShoppingmallSellerAdminsRequestsController } from "./controllers/shoppingMall/seller/admins/requests/ShoppingmallSellerAdminsRequestsController";
import { ShoppingmallSellerAnalysisCartsAbandonmentController } from "./controllers/shoppingMall/seller/analysis/carts/abandonment/ShoppingmallSellerAnalysisCartsAbandonmentController";
import { ShoppingmallSellerAnalyticsOrdersController } from "./controllers/shoppingMall/seller/analytics/orders/ShoppingmallSellerAnalyticsOrdersController";
import { ShoppingmallSellerAnalyticsProductsEngagementController } from "./controllers/shoppingMall/seller/analytics/products/engagement/ShoppingmallSellerAnalyticsProductsEngagementController";
import { ShoppingmallSellerAnalyticsPromotionsEffectivenessController } from "./controllers/shoppingMall/seller/analytics/promotions/effectiveness/ShoppingmallSellerAnalyticsPromotionsEffectivenessController";
import { ShoppingmallSellerAnalyticsSalesMonthlyController } from "./controllers/shoppingMall/seller/analytics/sales/monthly/ShoppingmallSellerAnalyticsSalesMonthlyController";
import { ShoppingmallSellerAuthSellersEmailController } from "./controllers/shoppingMall/seller/auth/sellers/email/ShoppingmallSellerAuthSellersEmailController";
import { ShoppingmallSellerAuthSellersLogoutController } from "./controllers/shoppingMall/seller/auth/sellers/logout/ShoppingmallSellerAuthSellersLogoutController";
import { ShoppingmallSellerCancellation_requestsController } from "./controllers/shoppingMall/seller/cancellation-requests/ShoppingmallSellerCancellation_requestsController";
import { ShoppingmallSellerDashboardSellersMetricsController } from "./controllers/shoppingMall/seller/dashboard/sellers/metrics/ShoppingmallSellerDashboardSellersMetricsController";
import { ShoppingmallSellerDashboardSellersPerformanceController } from "./controllers/shoppingMall/seller/dashboard/sellers/performance/ShoppingmallSellerDashboardSellersPerformanceController";
import { ShoppingmallSellerInventoryMetricsController } from "./controllers/shoppingMall/seller/inventory/metrics/ShoppingmallSellerInventoryMetricsController";
import { ShoppingmallSellerInventoryRecordsController } from "./controllers/shoppingMall/seller/inventory/records/ShoppingmallSellerInventoryRecordsController";
import { ShoppingmallSellerProductsController } from "./controllers/shoppingMall/seller/products/ShoppingmallSellerProductsController";
import { ShoppingmallSellerProductsImagesController } from "./controllers/shoppingMall/seller/products/images/ShoppingmallSellerProductsImagesController";
import { ShoppingmallSellerRefund_requestsController } from "./controllers/shoppingMall/seller/refund-requests/ShoppingmallSellerRefund_requestsController";
import { ShoppingmallSellerSellersMeController } from "./controllers/shoppingMall/seller/sellers/me/ShoppingmallSellerSellersMeController";
import { ShoppingmallSellerSellersMeShipmentsDashboardController } from "./controllers/shoppingMall/seller/sellers/me/shipments/dashboard/ShoppingmallSellerSellersMeShipmentsDashboardController";
import { ShoppingmallSuperadminAdminsController } from "./controllers/shoppingMall/superAdmin/admins/ShoppingmallSuperadminAdminsController";
import { ShoppingmallSuperadminAdminsRequestsController } from "./controllers/shoppingMall/superAdmin/admins/requests/ShoppingmallSuperadminAdminsRequestsController";
import { ShoppingmallSuperadminAuthSuperadminsEmailController } from "./controllers/shoppingMall/superAdmin/auth/superAdmins/email/resend/ShoppingmallSuperadminAuthSuperadminsEmailController";
import { ShoppingmallSuperadminAuthSuperadminsEmailVerifyController } from "./controllers/shoppingMall/superAdmin/auth/superAdmins/email/verify/ShoppingmallSuperadminAuthSuperadminsEmailVerifyController";
import { ShoppingmallSuperadminAuthSuperadminsController } from "./controllers/shoppingMall/superAdmin/auth/superAdmins/logout/ShoppingmallSuperadminAuthSuperadminsController";
import { ShoppingmallSuperadminChannelsController } from "./controllers/shoppingMall/superAdmin/channels/ShoppingmallSuperadminChannelsController";
import { ShoppingmallSuperadminConfigurationsController } from "./controllers/shoppingMall/superAdmin/configurations/ShoppingmallSuperadminConfigurationsController";
import { ShoppingmallSuperadminSectionsController } from "./controllers/shoppingMall/superAdmin/sections/ShoppingmallSuperadminSectionsController";
import { ShoppingmallSuperadminSuperadminsMeController } from "./controllers/shoppingMall/superAdmin/superAdmins/me/ShoppingmallSuperadminSuperadminsMeController";

@Module({
  controllers: [
    ShoppingmallAuthCustomerController,
    ShoppingmallAuthSellerController,
    ShoppingmallAuthAdminController,
    ShoppingmallAuthAdminLoginController,
    ShoppingmallAuthSuperadminController,
    ShoppingmallCustomerAuthCustomersEmailController,
    ShoppingmallSellerAuthSellersEmailController,
    ShoppingmallAdminAuthAdminsEmailController,
    ShoppingmallSuperadminAuthSuperadminsEmailVerifyController,
    ShoppingmallSuperadminAuthSuperadminsEmailController,
    ShoppingmallCustomerAuthCustomersLogoutController,
    ShoppingmallSellerAuthSellersLogoutController,
    ShoppingmallAdminAuthAdminsLogoutController,
    ShoppingmallSuperadminAuthSuperadminsController,
    ShoppingmallCustomerCustomersMeController,
    ShoppingmallSellerSellersMeController,
    ShoppingmallAdminAdminsMeController,
    ShoppingmallSuperadminSuperadminsMeController,
    ShoppingmallAdminChannelsController,
    ShoppingmallSuperadminChannelsController,
    ShoppingmallAdminSectionsController,
    ShoppingmallSuperadminSectionsController,
    ShoppingmallAdminConfigurationsController,
    ShoppingmallSuperadminConfigurationsController,
    ShoppingmallSellerProductsController,
    ShoppingmallSellerProductsImagesController,
    ShoppingmallCustomerCart_itemsController,
    ShoppingmallCustomerOrdersController,
    ShoppingmallAdminOrdersItemsController,
    ShoppingmallAdminOrdersController,
    ShoppingmallCustomerOrdersItemsController,
    ShoppingmallSellerInventoryRecordsController,
    ShoppingmallAdminInventoryRecordsController,
    ShoppingmallCustomerReviewsController,
    ShoppingmallCustomerReviewsSnapshotsController,
    ShoppingmallCustomerReviewsVotesController,
    ShoppingmallCustomerReviewsReportsController,
    ShoppingmallCustomerCancellation_requestsController,
    ShoppingmallSellerCancellation_requestsController,
    ShoppingmallAdminCancellation_requestsController,
    ShoppingmallCustomerRefund_requestsController,
    ShoppingmallSellerRefund_requestsController,
    ShoppingmallAdminRefund_requestsController,
    ShoppingmallCustomerSalesMetricsController,
    ShoppingmallCustomerOrdersMetricsController,
    ShoppingmallCustomerReviewsMetricsController,
    ShoppingmallSellerInventoryMetricsController,
    ShoppingmallAdminSellersApproveController,
    ShoppingmallAdminSellersController,
    ShoppingmallAdminCustomersBanController,
    ShoppingmallAdminCustomersUnbanController,
    ShoppingmallAdminOrdersItemsCancelController,
    ShoppingmallAdminOrdersItemsRefundController,
    ShoppingmallAdminReviewsReportsController,
    ShoppingmallSuperadminAdminsRequestsController,
    ShoppingmallSuperadminAdminsController,
    ShoppingmallProductsSearchController,
    ShoppingmallAdminProductsManageController,
    ShoppingmallSellerAnalyticsSalesMonthlyController,
    ShoppingmallAdminAnalyticsSalesMonthlyController,
    ShoppingmallSellerAnalyticsPromotionsEffectivenessController,
    ShoppingmallAdminAnalyticsPromotionsEffectivenessController,
    ShoppingmallSellerDashboardSellersPerformanceController,
    ShoppingmallSellerAnalyticsProductsEngagementController,
    ShoppingmallAdminAnalyticsProductsEngagementController,
    ShoppingmallCustomerCartMeMetricsController,
    ShoppingmallCustomerAnalysisCartsCustomerController,
    ShoppingmallSellerAnalysisCartsAbandonmentController,
    ShoppingmallAdminAnalyticsOrdersController,
    ShoppingmallSellerAnalyticsOrdersController,
    ShoppingmallCustomerOrdersShipmentsController,
    ShoppingmallSellerSellersMeShipmentsDashboardController,
    ShoppingmallAdminInventoriesAnalyticsController,
    ShoppingmallAdminInventoriesStatisticsController,
    ShoppingmallAdminInventoriesReportsController,
    ShoppingmallAdminReviewsStatsController,
    ShoppingmallAdminReviewsDashboardController,
    ShoppingmallAdminReviewsController,
    ShoppingmallAdminCategoriesController,
    ShoppingmallAdminDashboardAdminOverviewController,
    ShoppingmallSellerDashboardSellersMetricsController,
    ShoppingmallAdminInventoryMetricsHealthController,
    ShoppingmallAdminSalesMetricsPerformanceController,
    ShoppingmallAdminReviewsMetricsAnalyticsController,
    ShoppingmallSearchProductsGlobalController,
    ShoppingmallCustomerAdminsRequestsController,
    ShoppingmallSellerAdminsRequestsController,
    ShoppingmallAdminAdminsSellersController,
    ShoppingmallAdminAdminsSellersUnsuspendController,
    ShoppingmallAdminAdminsCustomersBanController,
    ShoppingmallAdminResourcesController,
    ShoppingmallAdminAdminsOrdersItemsCancelController,
    ShoppingmallAdminAdminsOrdersItemsController,
    ShoppingmallAdminAdminsProductsController,
  ],
})
export class MyModule {}
