import { Module } from "@nestjs/common";

import { AuthCustomerController } from "./controllers/auth/customer/AuthCustomerController";
import { AuthSellerController } from "./controllers/auth/seller/AuthSellerController";
import { AuthAdminController } from "./controllers/auth/admin/AuthAdminController";
import { AuthGuestController } from "./controllers/auth/guest/AuthGuestController";
import { ShoppingmallAuthPasswordResetController } from "./controllers/shoppingMall/auth/password/reset/ShoppingmallAuthPasswordResetController";
import { ShoppingmallAuthPasswordChangeController } from "./controllers/shoppingMall/auth/password/change/ShoppingmallAuthPasswordChangeController";
import { ShoppingmallAuthEmail_verifyController } from "./controllers/shoppingMall/auth/email-verify/ShoppingmallAuthEmail_verifyController";
import { ShoppingmallAuthVerificationResendController } from "./controllers/shoppingMall/auth/verification/resend/ShoppingmallAuthVerificationResendController";
import { ShoppingmallCustomerAuthMfaEnableController } from "./controllers/shoppingMall/customer/auth/mfa/enable/ShoppingmallCustomerAuthMfaEnableController";
import { ShoppingmallCustomerAuthMfaDisableController } from "./controllers/shoppingMall/customer/auth/mfa/disable/ShoppingmallCustomerAuthMfaDisableController";
import { ShoppingmallAuthMfaVerifyController } from "./controllers/shoppingMall/auth/mfa/verify/ShoppingmallAuthMfaVerifyController";
import { ShoppingmallAuthRefresh_tokenController } from "./controllers/shoppingMall/auth/refresh-token/ShoppingmallAuthRefresh_tokenController";
import { ShoppingmallAuthValidate_sessionController } from "./controllers/shoppingMall/auth/validate-session/ShoppingmallAuthValidate_sessionController";
import { ShoppingmallAuthController } from "./controllers/shoppingMall/auth/logout/ShoppingmallAuthController";
import { ShoppingmallProductsController } from "./controllers/shoppingMall/products/ShoppingmallProductsController";
import { ShoppingmallSellerProductsController } from "./controllers/shoppingMall/seller/products/ShoppingmallSellerProductsController";
import { ShoppingmallAdminProductsController } from "./controllers/shoppingMall/admin/products/ShoppingmallAdminProductsController";
import { ShoppingmallProductsVariantsController } from "./controllers/shoppingMall/products/variants/ShoppingmallProductsVariantsController";
import { ShoppingmallSellerProductsVariantsController } from "./controllers/shoppingMall/seller/products/variants/ShoppingmallSellerProductsVariantsController";
import { ShoppingmallCustomerProductsUnitsController } from "./controllers/shoppingMall/customer/products/units/ShoppingmallCustomerProductsUnitsController";
import { ShoppingmallSellerProductsUnitsController } from "./controllers/shoppingMall/seller/products/units/ShoppingmallSellerProductsUnitsController";
import { ShoppingmallCategoriesController } from "./controllers/shoppingMall/categories/ShoppingmallCategoriesController";
import { ShoppingmallAdminCategoriesController } from "./controllers/shoppingMall/admin/categories/ShoppingmallAdminCategoriesController";
import { ShoppingmallCategoriesProductsController } from "./controllers/shoppingMall/categories/products/ShoppingmallCategoriesProductsController";
import { ShoppingmallAdminInventorylevelsController } from "./controllers/shoppingMall/admin/inventoryLevels/ShoppingmallAdminInventorylevelsController";
import { ShoppingmallInventorylevelsController } from "./controllers/shoppingMall/inventoryLevels/ShoppingmallInventorylevelsController";
import { ShoppingmallSellerInventorylevelsController } from "./controllers/shoppingMall/seller/inventoryLevels/ShoppingmallSellerInventorylevelsController";
import { ShoppingmallProductreviewsController } from "./controllers/shoppingMall/productReviews/ShoppingmallProductreviewsController";
import { ShoppingmallCustomerProductreviewsController } from "./controllers/shoppingMall/customer/productReviews/ShoppingmallCustomerProductreviewsController";
import { ShoppingmallProductsReviewsController } from "./controllers/shoppingMall/products/reviews/ShoppingmallProductsReviewsController";
import { ShoppingmallProductsSnapshotsController } from "./controllers/shoppingMall/products/snapshots/ShoppingmallProductsSnapshotsController";
import { AdminProductsSnapshotsController } from "./controllers/admin/products/snapshots/AdminProductsSnapshotsController";
import { ShoppingmallCustomerCartsController } from "./controllers/shoppingMall/customer/carts/ShoppingmallCustomerCartsController";
import { ShoppingmallCartsController } from "./controllers/shoppingMall/carts/ShoppingmallCartsController";
import { ShoppingmallCustomerCartsItemsController } from "./controllers/shoppingMall/customer/carts/items/ShoppingmallCustomerCartsItemsController";
import { ShoppingmallCustomerOrdersController } from "./controllers/shoppingMall/customer/orders/ShoppingmallCustomerOrdersController";
import { ShoppingmallSellerOrdersController } from "./controllers/shoppingMall/seller/orders/ShoppingmallSellerOrdersController";
import { ShoppingmallAdminOrdersController } from "./controllers/shoppingMall/admin/orders/ShoppingmallAdminOrdersController";
import { ShoppingmallCustomerOrdersItemsController } from "./controllers/shoppingMall/customer/orders/items/ShoppingmallCustomerOrdersItemsController";
import { ShoppingmallSellerOrdersItemsController } from "./controllers/shoppingMall/seller/orders/items/ShoppingmallSellerOrdersItemsController";
import { ShoppingmallAdminOrdersItemsController } from "./controllers/shoppingMall/admin/orders/items/ShoppingmallAdminOrdersItemsController";
import { ShoppingmallOrdersPaymentsController } from "./controllers/shoppingMall/orders/payments/ShoppingmallOrdersPaymentsController";
import { ShoppingmallCustomerOrdersPaymentsController } from "./controllers/shoppingMall/customer/orders/payments/ShoppingmallCustomerOrdersPaymentsController";
import { ShoppingmallSellerOrdersPaymentsController } from "./controllers/shoppingMall/seller/orders/payments/ShoppingmallSellerOrdersPaymentsController";
import { ShoppingmallAdminOrdersPaymentsController } from "./controllers/shoppingMall/admin/orders/payments/ShoppingmallAdminOrdersPaymentsController";
import { ShoppingmallCustomerOrdersShipmentsController } from "./controllers/shoppingMall/customer/orders/shipments/ShoppingmallCustomerOrdersShipmentsController";
import { ShoppingmallSellerOrdersShipmentsController } from "./controllers/shoppingMall/seller/orders/shipments/ShoppingmallSellerOrdersShipmentsController";
import { ShoppingmallAdminOrdersShipmentsController } from "./controllers/shoppingMall/admin/orders/shipments/ShoppingmallAdminOrdersShipmentsController";
import { ShoppingmallAdminOrdersRefundsController } from "./controllers/shoppingMall/admin/orders/refunds/ShoppingmallAdminOrdersRefundsController";
import { ShoppingmallCustomerOrdersRefundsController } from "./controllers/shoppingMall/customer/orders/refunds/ShoppingmallCustomerOrdersRefundsController";
import { ShoppingmallAdminPaymenttransactionsController } from "./controllers/shoppingMall/admin/paymentTransactions/ShoppingmallAdminPaymenttransactionsController";
import { ShoppingmallCustomerPaymenttransactionsController } from "./controllers/shoppingMall/customer/paymentTransactions/ShoppingmallCustomerPaymenttransactionsController";
import { ShoppingmallAdminPaymentrefundsController } from "./controllers/shoppingMall/admin/paymentRefunds/ShoppingmallAdminPaymentrefundsController";
import { ShoppingmallSellerPaymentrefundsController } from "./controllers/shoppingMall/seller/paymentRefunds/ShoppingmallSellerPaymentrefundsController";
import { ShoppingmallAdminSupportticketsController } from "./controllers/shoppingMall/admin/supportTickets/ShoppingmallAdminSupportticketsController";
import { ShoppingmallCustomerSupportticketsController } from "./controllers/shoppingMall/customer/supportTickets/ShoppingmallCustomerSupportticketsController";
import { ShoppingmallAdminSupportticketsMessagesController } from "./controllers/shoppingMall/admin/supportTickets/messages/ShoppingmallAdminSupportticketsMessagesController";
import { ShoppingmallCustomerSupportticketsMessagesController } from "./controllers/shoppingMall/customer/supportTickets/messages/ShoppingmallCustomerSupportticketsMessagesController";
import { ShoppingmallFaqarticlesController } from "./controllers/shoppingMall/faqArticles/ShoppingmallFaqarticlesController";
import { ShoppingmallAdminFaqarticlesController } from "./controllers/shoppingMall/admin/faqArticles/ShoppingmallAdminFaqarticlesController";
import { ShoppingmallFaqcategoriesController } from "./controllers/shoppingMall/faqCategories/ShoppingmallFaqcategoriesController";
import { ShoppingmallAdminFaqcategoriesController } from "./controllers/shoppingMall/admin/faqCategories/ShoppingmallAdminFaqcategoriesController";
import { ShoppingmallAdminArticlesController } from "./controllers/shoppingMall/admin/articles/ShoppingmallAdminArticlesController";
import { ShoppingmallSellerArticlesController } from "./controllers/shoppingMall/seller/articles/ShoppingmallSellerArticlesController";
import { ShoppingmallArticlesController } from "./controllers/shoppingMall/articles/ShoppingmallArticlesController";
import { ShoppingmallArticlecategoriesController } from "./controllers/shoppingMall/articleCategories/ShoppingmallArticlecategoriesController";
import { ShoppingmallAdminArticlecategoriesController } from "./controllers/shoppingMall/admin/articleCategories/ShoppingmallAdminArticlecategoriesController";
import { ShoppingmallAdminArticlesCommentsController } from "./controllers/shoppingMall/admin/articles/comments/ShoppingmallAdminArticlesCommentsController";
import { ShoppingmallCustomerArticlesCommentsController } from "./controllers/shoppingMall/customer/articles/comments/ShoppingmallCustomerArticlesCommentsController";
import { ShoppingmallArticletagsController } from "./controllers/shoppingMall/articleTags/ShoppingmallArticletagsController";
import { ShoppingmallChannelsController } from "./controllers/shoppingMall/channels/ShoppingmallChannelsController";
import { ShoppingmallAdminChannelsController } from "./controllers/shoppingMall/admin/channels/ShoppingmallAdminChannelsController";
import { ShoppingmallChannelsCategoriesController } from "./controllers/shoppingMall/channels/categories/ShoppingmallChannelsCategoriesController";
import { ShoppingmallAdminChannelsCategoriesController } from "./controllers/shoppingMall/admin/channels/categories/ShoppingmallAdminChannelsCategoriesController";
import { ShoppingmallAdminChannelsSectionsController } from "./controllers/shoppingMall/admin/channels/sections/ShoppingmallAdminChannelsSectionsController";
import { ShoppingmallAdminCustomersController } from "./controllers/shoppingMall/admin/customers/ShoppingmallAdminCustomersController";
import { ShoppingmallCustomerCustomersController } from "./controllers/shoppingMall/customer/customers/ShoppingmallCustomerCustomersController";
import { ShoppingmallAdminSellersController } from "./controllers/shoppingMall/admin/sellers/ShoppingmallAdminSellersController";
import { ShoppingmallSellersController } from "./controllers/shoppingMall/sellers/ShoppingmallSellersController";
import { ShoppingmallSellerSellersController } from "./controllers/shoppingMall/seller/sellers/ShoppingmallSellerSellersController";
import { ShoppingmallAdminAnalyticsDailyController } from "./controllers/shoppingMall/admin/analytics/daily/ShoppingmallAdminAnalyticsDailyController";
import { ShoppingmallAdminAnalyticsMonthlyController } from "./controllers/shoppingMall/admin/analytics/monthly/ShoppingmallAdminAnalyticsMonthlyController";
import { ShoppingmallSearchController } from "./controllers/shoppingMall/search/global/ShoppingmallSearchController";
import { ShoppingmallAdminStatisticsSales_by_categoryController } from "./controllers/shoppingMall/admin/statistics/sales-by-category/ShoppingmallAdminStatisticsSales_by_categoryController";
import { ShoppingmallAdminStatisticsTop_productsController } from "./controllers/shoppingMall/admin/statistics/top-products/ShoppingmallAdminStatisticsTop_productsController";
import { ShoppingmallAdminDashboardPlatform_overviewController } from "./controllers/shoppingMall/admin/dashboard/platform-overview/ShoppingmallAdminDashboardPlatform_overviewController";
import { ShoppingmallAdminDashboardSeller_analyticsController } from "./controllers/shoppingMall/admin/dashboard/seller-analytics/ShoppingmallAdminDashboardSeller_analyticsController";
import { ShoppingmallAdminDashboardCustomer_behaviorController } from "./controllers/shoppingMall/admin/dashboard/customer-behavior/ShoppingmallAdminDashboardCustomer_behaviorController";

@Module({
  controllers: [
    AuthCustomerController,
    AuthSellerController,
    AuthAdminController,
    AuthGuestController,
    ShoppingmallAuthPasswordResetController,
    ShoppingmallAuthPasswordChangeController,
    ShoppingmallAuthEmail_verifyController,
    ShoppingmallAuthVerificationResendController,
    ShoppingmallCustomerAuthMfaEnableController,
    ShoppingmallCustomerAuthMfaDisableController,
    ShoppingmallAuthMfaVerifyController,
    ShoppingmallAuthRefresh_tokenController,
    ShoppingmallAuthValidate_sessionController,
    ShoppingmallAuthController,
    ShoppingmallProductsController,
    ShoppingmallSellerProductsController,
    ShoppingmallAdminProductsController,
    ShoppingmallProductsVariantsController,
    ShoppingmallSellerProductsVariantsController,
    ShoppingmallCustomerProductsUnitsController,
    ShoppingmallSellerProductsUnitsController,
    ShoppingmallCategoriesController,
    ShoppingmallAdminCategoriesController,
    ShoppingmallCategoriesProductsController,
    ShoppingmallAdminInventorylevelsController,
    ShoppingmallInventorylevelsController,
    ShoppingmallSellerInventorylevelsController,
    ShoppingmallProductreviewsController,
    ShoppingmallCustomerProductreviewsController,
    ShoppingmallProductsReviewsController,
    ShoppingmallProductsSnapshotsController,
    AdminProductsSnapshotsController,
    ShoppingmallCustomerCartsController,
    ShoppingmallCartsController,
    ShoppingmallCustomerCartsItemsController,
    ShoppingmallCustomerOrdersController,
    ShoppingmallSellerOrdersController,
    ShoppingmallAdminOrdersController,
    ShoppingmallCustomerOrdersItemsController,
    ShoppingmallSellerOrdersItemsController,
    ShoppingmallAdminOrdersItemsController,
    ShoppingmallOrdersPaymentsController,
    ShoppingmallCustomerOrdersPaymentsController,
    ShoppingmallSellerOrdersPaymentsController,
    ShoppingmallAdminOrdersPaymentsController,
    ShoppingmallCustomerOrdersShipmentsController,
    ShoppingmallSellerOrdersShipmentsController,
    ShoppingmallAdminOrdersShipmentsController,
    ShoppingmallAdminOrdersRefundsController,
    ShoppingmallCustomerOrdersRefundsController,
    ShoppingmallAdminPaymenttransactionsController,
    ShoppingmallCustomerPaymenttransactionsController,
    ShoppingmallAdminPaymentrefundsController,
    ShoppingmallSellerPaymentrefundsController,
    ShoppingmallAdminSupportticketsController,
    ShoppingmallCustomerSupportticketsController,
    ShoppingmallAdminSupportticketsMessagesController,
    ShoppingmallCustomerSupportticketsMessagesController,
    ShoppingmallFaqarticlesController,
    ShoppingmallAdminFaqarticlesController,
    ShoppingmallFaqcategoriesController,
    ShoppingmallAdminFaqcategoriesController,
    ShoppingmallAdminArticlesController,
    ShoppingmallSellerArticlesController,
    ShoppingmallArticlesController,
    ShoppingmallArticlecategoriesController,
    ShoppingmallAdminArticlecategoriesController,
    ShoppingmallAdminArticlesCommentsController,
    ShoppingmallCustomerArticlesCommentsController,
    ShoppingmallArticletagsController,
    ShoppingmallChannelsController,
    ShoppingmallAdminChannelsController,
    ShoppingmallChannelsCategoriesController,
    ShoppingmallAdminChannelsCategoriesController,
    ShoppingmallAdminChannelsSectionsController,
    ShoppingmallAdminCustomersController,
    ShoppingmallCustomerCustomersController,
    ShoppingmallAdminSellersController,
    ShoppingmallSellersController,
    ShoppingmallSellerSellersController,
    ShoppingmallAdminAnalyticsDailyController,
    ShoppingmallAdminAnalyticsMonthlyController,
    ShoppingmallSearchController,
    ShoppingmallAdminStatisticsSales_by_categoryController,
    ShoppingmallAdminStatisticsTop_productsController,
    ShoppingmallAdminDashboardPlatform_overviewController,
    ShoppingmallAdminDashboardSeller_analyticsController,
    ShoppingmallAdminDashboardCustomer_behaviorController,
  ],
})
export class MyModule {}
