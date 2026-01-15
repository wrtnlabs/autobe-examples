import { Module } from "@nestjs/common";

import { AuthCustomerController } from "./controllers/auth/customer/AuthCustomerController";
import { CustomersMeController } from "./controllers/customers/me/CustomersMeController";
import { AuthSellerController } from "./controllers/auth/seller/AuthSellerController";
import { V1Seller_publicController } from "./controllers/v1/seller/public/V1Seller_publicController";
import { AuthAdminController } from "./controllers/auth/admin/AuthAdminController";
import { AdminController } from "./controllers/admin/dashboard/AdminController";
import { ShoppingmallAdminChannelsController } from "./controllers/shoppingMall/admin/channels/ShoppingmallAdminChannelsController";
import { ShoppingmallChannelsController } from "./controllers/shoppingMall/channels/ShoppingmallChannelsController";
import { ShoppingmallSellerSectionsController } from "./controllers/shoppingMall/seller/sections/ShoppingmallSellerSectionsController";
import { ShoppingmallCustomerSectionsController } from "./controllers/shoppingMall/customer/sections/ShoppingmallCustomerSectionsController";
import { ShoppingmallSectionsController } from "./controllers/shoppingMall/sections/ShoppingmallSectionsController";
import { ShoppingmallAdminSectionsController } from "./controllers/shoppingMall/admin/sections/ShoppingmallAdminSectionsController";
import { ShoppingmallAdminConfigurationsController } from "./controllers/shoppingMall/admin/configurations/ShoppingmallAdminConfigurationsController";
import { ShoppingmallCustomerConfigurationsController } from "./controllers/shoppingMall/customer/configurations/ShoppingmallCustomerConfigurationsController";
import { ShoppingmallAdminCustomersController } from "./controllers/shoppingMall/admin/customers/ShoppingmallAdminCustomersController";
import { ShoppingmallCustomerCustomersController } from "./controllers/shoppingMall/customer/customers/ShoppingmallCustomerCustomersController";
import { ShoppingmallSellersController } from "./controllers/shoppingMall/sellers/ShoppingmallSellersController";
import { ShoppingmallSellerSellersController } from "./controllers/shoppingMall/seller/sellers/ShoppingmallSellerSellersController";
import { ShoppingmallAdminSellersController } from "./controllers/shoppingMall/admin/sellers/ShoppingmallAdminSellersController";
import { ShoppingmallAdminAdminsController } from "./controllers/shoppingMall/admin/admins/ShoppingmallAdminAdminsController";
import { ShoppingmallCustomerCustomersSessionsController } from "./controllers/shoppingMall/customer/customers/sessions/ShoppingmallCustomerCustomersSessionsController";
import { ShoppingmallSellerSellersSessionsController } from "./controllers/shoppingMall/seller/sellers/sessions/ShoppingmallSellerSellersSessionsController";
import { ShoppingmallAdminAdminsSessionsController } from "./controllers/shoppingMall/admin/admins/sessions/ShoppingmallAdminAdminsSessionsController";
import { ShoppingmallAdminLogin_attemptsController } from "./controllers/shoppingMall/admin/login-attempts/ShoppingmallAdminLogin_attemptsController";
import { ShoppingmallAdminEmail_verification_tokensController } from "./controllers/shoppingMall/admin/email-verification-tokens/ShoppingmallAdminEmail_verification_tokensController";
import { ShoppingmallEmail_verification_tokensController } from "./controllers/shoppingMall/email-verification-tokens/ShoppingmallEmail_verification_tokensController";
import { ShoppingmallCustomerProductsController } from "./controllers/shoppingMall/customer/products/ShoppingmallCustomerProductsController";
import { ShoppingmallSellerProductsController } from "./controllers/shoppingMall/seller/products/ShoppingmallSellerProductsController";
import { ShoppingmallProductsController } from "./controllers/shoppingMall/products/ShoppingmallProductsController";
import { ShoppingmallAdminProductsController } from "./controllers/shoppingMall/admin/products/ShoppingmallAdminProductsController";
import { ShoppingmallAdminCategoriesController } from "./controllers/shoppingMall/admin/categories/ShoppingmallAdminCategoriesController";
import { ShoppingmallSellerCategoriesController } from "./controllers/shoppingMall/seller/categories/ShoppingmallSellerCategoriesController";
import { ShoppingmallCategoriesController } from "./controllers/shoppingMall/categories/ShoppingmallCategoriesController";
import { ShoppingmallCustomerProductsImagesController } from "./controllers/shoppingMall/customer/products/images/ShoppingmallCustomerProductsImagesController";
import { ShoppingmallSellerProductsImagesController } from "./controllers/shoppingMall/seller/products/images/ShoppingmallSellerProductsImagesController";
import { ShoppingmallProductsImagesController } from "./controllers/shoppingMall/products/images/ShoppingmallProductsImagesController";
import { ShoppingmallProductsReviewsController } from "./controllers/shoppingMall/products/reviews/ShoppingmallProductsReviewsController";
import { ShoppingmallCustomerProductsReviewsController } from "./controllers/shoppingMall/customer/products/reviews/ShoppingmallCustomerProductsReviewsController";
import { ShoppingmallAdminProductsReviewsController } from "./controllers/shoppingMall/admin/products/reviews/ShoppingmallAdminProductsReviewsController";
import { ShoppingmallSellerProductsReviewsController } from "./controllers/shoppingMall/seller/products/reviews/ShoppingmallSellerProductsReviewsController";
import { ShoppingmallCustomerProductsSpecsController } from "./controllers/shoppingMall/customer/products/specs/ShoppingmallCustomerProductsSpecsController";
import { ShoppingmallSellerProductsSpecsController } from "./controllers/shoppingMall/seller/products/specs/ShoppingmallSellerProductsSpecsController";
import { ShoppingmallAdminLowStockAlertsController } from "./controllers/shoppingMall/admin/low/stock/alerts/ShoppingmallAdminLowStockAlertsController";
import { ShoppingmallAdminInventoryLogsController } from "./controllers/shoppingMall/admin/inventory/logs/ShoppingmallAdminInventoryLogsController";
import { ShoppingmallSellerInventoryAdjustmentsController } from "./controllers/shoppingMall/seller/inventory/adjustments/ShoppingmallSellerInventoryAdjustmentsController";
import { ShoppingmallAdminInventoryAdjustmentsController } from "./controllers/shoppingMall/admin/inventory/adjustments/ShoppingmallAdminInventoryAdjustmentsController";
import { ShoppingmallSellerVariantInventoriesController } from "./controllers/shoppingMall/seller/variant/inventories/ShoppingmallSellerVariantInventoriesController";
import { ShoppingmallAdminVariantInventoriesController } from "./controllers/shoppingMall/admin/variant/inventories/ShoppingmallAdminVariantInventoriesController";
import { ShoppingmallCustomerOrdersController } from "./controllers/shoppingMall/customer/orders/ShoppingmallCustomerOrdersController";
import { ShoppingmallSellerOrdersController } from "./controllers/shoppingMall/seller/orders/ShoppingmallSellerOrdersController";
import { ShoppingmallAdminOrdersController } from "./controllers/shoppingMall/admin/orders/ShoppingmallAdminOrdersController";
import { ShoppingmallCustomerOrdersItemsController } from "./controllers/shoppingMall/customer/orders/items/ShoppingmallCustomerOrdersItemsController";
import { ShoppingmallSellerOrdersItemsController } from "./controllers/shoppingMall/seller/orders/items/ShoppingmallSellerOrdersItemsController";
import { ShoppingmallAdminOrdersItemsController } from "./controllers/shoppingMall/admin/orders/items/ShoppingmallAdminOrdersItemsController";
import { ShoppingmallCustomerOrdersSnapshotsController } from "./controllers/shoppingMall/customer/orders/snapshots/ShoppingmallCustomerOrdersSnapshotsController";
import { ShoppingmallSellerOrdersSnapshotsController } from "./controllers/shoppingMall/seller/orders/snapshots/ShoppingmallSellerOrdersSnapshotsController";
import { ShoppingmallAdminOrdersSnapshotsController } from "./controllers/shoppingMall/admin/orders/snapshots/ShoppingmallAdminOrdersSnapshotsController";
import { ShoppingmallCustomerOrdersCancellationsController } from "./controllers/shoppingMall/customer/orders/cancellations/ShoppingmallCustomerOrdersCancellationsController";
import { ShoppingmallAdminOrdersCancellationsController } from "./controllers/shoppingMall/admin/orders/cancellations/ShoppingmallAdminOrdersCancellationsController";
import { ShoppingmallCustomerOrdersRefundsController } from "./controllers/shoppingMall/customer/orders/refunds/ShoppingmallCustomerOrdersRefundsController";
import { ShoppingmallAdminOrdersRefundsController } from "./controllers/shoppingMall/admin/orders/refunds/ShoppingmallAdminOrdersRefundsController";
import { ShoppingmallSellerOrdersRefundsController } from "./controllers/shoppingMall/seller/orders/refunds/ShoppingmallSellerOrdersRefundsController";
import { ShoppingmallCustomerPaymentsTransactionsController } from "./controllers/shoppingMall/customer/payments/transactions/ShoppingmallCustomerPaymentsTransactionsController";
import { ShoppingmallSellerPaymentsTransactionsController } from "./controllers/shoppingMall/seller/payments/transactions/ShoppingmallSellerPaymentsTransactionsController";
import { ShoppingmallAdminPaymentsTransactionsController } from "./controllers/shoppingMall/admin/payments/transactions/ShoppingmallAdminPaymentsTransactionsController";
import { ShoppingmallCustomerPaymentsMethodsController } from "./controllers/shoppingMall/customer/payments/methods/ShoppingmallCustomerPaymentsMethodsController";
import { ShoppingmallAdminPaymentsMethodsController } from "./controllers/shoppingMall/admin/payments/methods/ShoppingmallAdminPaymentsMethodsController";
import { ShoppingmallCustomerRefundsRequestsController } from "./controllers/shoppingMall/customer/refunds/requests/ShoppingmallCustomerRefundsRequestsController";
import { ShoppingmallSellerRefundsRequestsController } from "./controllers/shoppingMall/seller/refunds/requests/ShoppingmallSellerRefundsRequestsController";
import { ShoppingmallAdminRefundsRequestsController } from "./controllers/shoppingMall/admin/refunds/requests/ShoppingmallAdminRefundsRequestsController";
import { ShoppingmallReviewsController } from "./controllers/shoppingMall/reviews/ShoppingmallReviewsController";
import { ShoppingmallCustomerReviewsController } from "./controllers/shoppingMall/customer/reviews/ShoppingmallCustomerReviewsController";
import { ShoppingmallAdminReviewsController } from "./controllers/shoppingMall/admin/reviews/ShoppingmallAdminReviewsController";
import { ShoppingmallReviewsCommentsController } from "./controllers/shoppingMall/reviews/comments/ShoppingmallReviewsCommentsController";
import { ShoppingmallCustomerReviewsCommentsController } from "./controllers/shoppingMall/customer/reviews/comments/ShoppingmallCustomerReviewsCommentsController";
import { ShoppingmallSellerReviewsCommentsController } from "./controllers/shoppingMall/seller/reviews/comments/ShoppingmallSellerReviewsCommentsController";
import { ShoppingmallCustomerReviewsVotesController } from "./controllers/shoppingMall/customer/reviews/votes/ShoppingmallCustomerReviewsVotesController";
import { ShoppingmallReviewsVotesController } from "./controllers/shoppingMall/reviews/votes/ShoppingmallReviewsVotesController";
import { ShoppingmallAdminReviewsModerationLogsController } from "./controllers/shoppingMall/admin/reviews/moderation/logs/ShoppingmallAdminReviewsModerationLogsController";
import { ShoppingmallAdminAuthAnalyticsFailed_loginsController } from "./controllers/shoppingMall/admin/auth/analytics/failed-logins/ShoppingmallAdminAuthAnalyticsFailed_loginsController";
import { ShoppingmallAdminDashboardAdminsAuthController } from "./controllers/shoppingMall/admin/dashboard/admins/auth/ShoppingmallAdminDashboardAdminsAuthController";
import { ShoppingmallAdminVerificationAnalyticsTokensController } from "./controllers/shoppingMall/admin/verification/analytics/tokens/ShoppingmallAdminVerificationAnalyticsTokensController";
import { ShoppingmallCustomerSearchProductsAdvancedController } from "./controllers/shoppingMall/customer/search/products/advanced/ShoppingmallCustomerSearchProductsAdvancedController";
import { ShoppingmallProductsEnrichedController } from "./controllers/shoppingMall/products/enriched/ShoppingmallProductsEnrichedController";
import { ShoppingmallAdminAnalyticsInventoryLow_stock_trendsController } from "./controllers/shoppingMall/admin/analytics/inventory/low-stock-trends/ShoppingmallAdminAnalyticsInventoryLow_stock_trendsController";
import { ShoppingmallAdminDashboardInventoryOverviewController } from "./controllers/shoppingMall/admin/dashboard/inventory/overview/ShoppingmallAdminDashboardInventoryOverviewController";
import { ShoppingmallCustomerSearchInventoryController } from "./controllers/shoppingMall/customer/search/inventory/ShoppingmallCustomerSearchInventoryController";
import { ShoppingmallAdminReviewsAnalyticsRatingsController } from "./controllers/shoppingMall/admin/reviews/analytics/ratings/ShoppingmallAdminReviewsAnalyticsRatingsController";
import { ShoppingmallAdminReviewsModerationDashboardController } from "./controllers/shoppingMall/admin/reviews/moderation/dashboard/ShoppingmallAdminReviewsModerationDashboardController";
import { ShoppingmallCustomerReviewsSearchController } from "./controllers/shoppingMall/customer/reviews/search/ShoppingmallCustomerReviewsSearchController";

@Module({
  controllers: [
    AuthCustomerController,
    CustomersMeController,
    AuthSellerController,
    V1Seller_publicController,
    AuthAdminController,
    AdminController,
    ShoppingmallAdminChannelsController,
    ShoppingmallChannelsController,
    ShoppingmallSellerSectionsController,
    ShoppingmallCustomerSectionsController,
    ShoppingmallSectionsController,
    ShoppingmallAdminSectionsController,
    ShoppingmallAdminConfigurationsController,
    ShoppingmallCustomerConfigurationsController,
    ShoppingmallAdminCustomersController,
    ShoppingmallCustomerCustomersController,
    ShoppingmallSellersController,
    ShoppingmallSellerSellersController,
    ShoppingmallAdminSellersController,
    ShoppingmallAdminAdminsController,
    ShoppingmallCustomerCustomersSessionsController,
    ShoppingmallSellerSellersSessionsController,
    ShoppingmallAdminAdminsSessionsController,
    ShoppingmallAdminLogin_attemptsController,
    ShoppingmallAdminEmail_verification_tokensController,
    ShoppingmallEmail_verification_tokensController,
    ShoppingmallCustomerProductsController,
    ShoppingmallSellerProductsController,
    ShoppingmallProductsController,
    ShoppingmallAdminProductsController,
    ShoppingmallAdminCategoriesController,
    ShoppingmallSellerCategoriesController,
    ShoppingmallCategoriesController,
    ShoppingmallCustomerProductsImagesController,
    ShoppingmallSellerProductsImagesController,
    ShoppingmallProductsImagesController,
    ShoppingmallProductsReviewsController,
    ShoppingmallCustomerProductsReviewsController,
    ShoppingmallAdminProductsReviewsController,
    ShoppingmallSellerProductsReviewsController,
    ShoppingmallCustomerProductsSpecsController,
    ShoppingmallSellerProductsSpecsController,
    ShoppingmallAdminLowStockAlertsController,
    ShoppingmallAdminInventoryLogsController,
    ShoppingmallSellerInventoryAdjustmentsController,
    ShoppingmallAdminInventoryAdjustmentsController,
    ShoppingmallSellerVariantInventoriesController,
    ShoppingmallAdminVariantInventoriesController,
    ShoppingmallCustomerOrdersController,
    ShoppingmallSellerOrdersController,
    ShoppingmallAdminOrdersController,
    ShoppingmallCustomerOrdersItemsController,
    ShoppingmallSellerOrdersItemsController,
    ShoppingmallAdminOrdersItemsController,
    ShoppingmallCustomerOrdersSnapshotsController,
    ShoppingmallSellerOrdersSnapshotsController,
    ShoppingmallAdminOrdersSnapshotsController,
    ShoppingmallCustomerOrdersCancellationsController,
    ShoppingmallAdminOrdersCancellationsController,
    ShoppingmallCustomerOrdersRefundsController,
    ShoppingmallAdminOrdersRefundsController,
    ShoppingmallSellerOrdersRefundsController,
    ShoppingmallCustomerPaymentsTransactionsController,
    ShoppingmallSellerPaymentsTransactionsController,
    ShoppingmallAdminPaymentsTransactionsController,
    ShoppingmallCustomerPaymentsMethodsController,
    ShoppingmallAdminPaymentsMethodsController,
    ShoppingmallCustomerRefundsRequestsController,
    ShoppingmallSellerRefundsRequestsController,
    ShoppingmallAdminRefundsRequestsController,
    ShoppingmallReviewsController,
    ShoppingmallCustomerReviewsController,
    ShoppingmallAdminReviewsController,
    ShoppingmallReviewsCommentsController,
    ShoppingmallCustomerReviewsCommentsController,
    ShoppingmallSellerReviewsCommentsController,
    ShoppingmallCustomerReviewsVotesController,
    ShoppingmallReviewsVotesController,
    ShoppingmallAdminReviewsModerationLogsController,
    ShoppingmallAdminAuthAnalyticsFailed_loginsController,
    ShoppingmallAdminDashboardAdminsAuthController,
    ShoppingmallAdminVerificationAnalyticsTokensController,
    ShoppingmallCustomerSearchProductsAdvancedController,
    ShoppingmallProductsEnrichedController,
    ShoppingmallAdminAnalyticsInventoryLow_stock_trendsController,
    ShoppingmallAdminDashboardInventoryOverviewController,
    ShoppingmallCustomerSearchInventoryController,
    ShoppingmallAdminReviewsAnalyticsRatingsController,
    ShoppingmallAdminReviewsModerationDashboardController,
    ShoppingmallCustomerReviewsSearchController,
  ],
})
export class MyModule {}
