import { Module } from "@nestjs/common";

import { AuthCustomerController } from "./controllers/auth/customer/AuthCustomerController";
import { AuthSellerController } from "./controllers/auth/seller/AuthSellerController";
import { AuthAdminController } from "./controllers/auth/admin/AuthAdminController";
import { ShoppingmallChannelsController } from "./controllers/shoppingMall/channels/ShoppingmallChannelsController";
import { ShoppingmallAdminChannelsController } from "./controllers/shoppingMall/admin/channels/ShoppingmallAdminChannelsController";
import { ShoppingmallAdminChannelsSectionsController } from "./controllers/shoppingMall/admin/channels/sections/ShoppingmallAdminChannelsSectionsController";
import { ShoppingmallChannelsSectionsController } from "./controllers/shoppingMall/channels/sections/ShoppingmallChannelsSectionsController";
import { ShoppingmallCategoriesController } from "./controllers/shoppingMall/categories/ShoppingmallCategoriesController";
import { ShoppingmallAdminCategoriesController } from "./controllers/shoppingMall/admin/categories/ShoppingmallAdminCategoriesController";
import { ShoppingmallProductsController } from "./controllers/shoppingMall/products/ShoppingmallProductsController";
import { ShoppingmallSellerProductsController } from "./controllers/shoppingMall/seller/products/ShoppingmallSellerProductsController";
import { ShoppingmallProductsAttributesController } from "./controllers/shoppingMall/products/attributes/ShoppingmallProductsAttributesController";
import { ShoppingmallSellerProductsAttributesController } from "./controllers/shoppingMall/seller/products/attributes/ShoppingmallSellerProductsAttributesController";
import { ShoppingmallAdminProductsAttributesController } from "./controllers/shoppingMall/admin/products/attributes/ShoppingmallAdminProductsAttributesController";
import { ShoppingmallSellerProductsVariantsController } from "./controllers/shoppingMall/seller/products/variants/ShoppingmallSellerProductsVariantsController";
import { ShoppingmallAdminProductsVariantsController } from "./controllers/shoppingMall/admin/products/variants/ShoppingmallAdminProductsVariantsController";
import { ShoppingmallProductsVariantsController } from "./controllers/shoppingMall/products/variants/ShoppingmallProductsVariantsController";
import { ShoppingmallProductsImagesController } from "./controllers/shoppingMall/products/images/ShoppingmallProductsImagesController";
import { ShoppingmallSellerProductsImagesController } from "./controllers/shoppingMall/seller/products/images/ShoppingmallSellerProductsImagesController";
import { ShoppingmallAdminProductsImagesController } from "./controllers/shoppingMall/admin/products/images/ShoppingmallAdminProductsImagesController";
import { ShoppingmallSellerSalesController } from "./controllers/shoppingMall/seller/sales/ShoppingmallSellerSalesController";
import { ShoppingmallAdminSalesController } from "./controllers/shoppingMall/admin/sales/ShoppingmallAdminSalesController";
import { ShoppingmallCustomerSalesController } from "./controllers/shoppingMall/customer/sales/ShoppingmallCustomerSalesController";
import { ShoppingmallAdminCartsController } from "./controllers/shoppingMall/admin/carts/ShoppingmallAdminCartsController";
import { ShoppingmallCustomerCartsController } from "./controllers/shoppingMall/customer/carts/ShoppingmallCustomerCartsController";
import { ShoppingmallCustomerCartsItemsController } from "./controllers/shoppingMall/customer/carts/items/ShoppingmallCustomerCartsItemsController";
import { ShoppingmallCustomerOrdersController } from "./controllers/shoppingMall/customer/orders/ShoppingmallCustomerOrdersController";
import { ShoppingmallAdminOrdersController } from "./controllers/shoppingMall/admin/orders/ShoppingmallAdminOrdersController";
import { ShoppingmallCustomerOrdersItemsController } from "./controllers/shoppingMall/customer/orders/items/ShoppingmallCustomerOrdersItemsController";
import { ShoppingmallCustomerOrdersPaymentsController } from "./controllers/shoppingMall/customer/orders/payments/ShoppingmallCustomerOrdersPaymentsController";
import { Shopping_mallCustomerOrdersItemsController } from "./controllers/shopping-mall/customer/orders/items/Shopping_mallCustomerOrdersItemsController";
import { Shopping_mallCustomerOrdersPaymentsController } from "./controllers/shopping-mall/customer/orders/payments/Shopping_mallCustomerOrdersPaymentsController";
import { ShoppingmallAdminOrdersPaymentsController } from "./controllers/shoppingMall/admin/orders/payments/ShoppingmallAdminOrdersPaymentsController";
import { ShoppingmallCustomerOrdersShipmentsController } from "./controllers/shoppingMall/customer/orders/shipments/ShoppingmallCustomerOrdersShipmentsController";
import { ShoppingmallAdminOrdersShipmentsController } from "./controllers/shoppingMall/admin/orders/shipments/ShoppingmallAdminOrdersShipmentsController";
import { ShoppingmallAdminCouponsController } from "./controllers/shoppingMall/admin/coupons/ShoppingmallAdminCouponsController";
import { ShoppingmallOrdersShipmentsController } from "./controllers/shoppingMall/orders/shipments/ShoppingmallOrdersShipmentsController";
import { ShoppingmallCouponsController } from "./controllers/shoppingMall/coupons/ShoppingmallCouponsController";
import { ShoppingmallAdminPromotionsController } from "./controllers/shoppingMall/admin/promotions/ShoppingmallAdminPromotionsController";
import { ShoppingmallAdminCoinsController } from "./controllers/shoppingMall/admin/coins/ShoppingmallAdminCoinsController";
import { ShoppingmallAdminChannelsPromotionsController } from "./controllers/shoppingMall/admin/channels/promotions/ShoppingmallAdminChannelsPromotionsController";
import { ShoppingmallCustomerCoinsController } from "./controllers/shoppingMall/customer/coins/ShoppingmallCustomerCoinsController";
import { ShoppingmallRewardsController } from "./controllers/shoppingMall/rewards/ShoppingmallRewardsController";
import { ShoppingmallAdminRewardsController } from "./controllers/shoppingMall/admin/rewards/ShoppingmallAdminRewardsController";
import { ShoppingmallAdminInquiriesController } from "./controllers/shoppingMall/admin/inquiries/ShoppingmallAdminInquiriesController";
import { ShoppingmallCustomerInquiriesController } from "./controllers/shoppingMall/customer/inquiries/ShoppingmallCustomerInquiriesController";
import { ShoppingmallAdminSupportticketsController } from "./controllers/shoppingMall/admin/supportTickets/ShoppingmallAdminSupportticketsController";
import { ShoppingmallArticlesController } from "./controllers/shoppingMall/articles/ShoppingmallArticlesController";
import { ShoppingmallCustomerArticlesController } from "./controllers/shoppingMall/customer/articles/ShoppingmallCustomerArticlesController";
import { ShoppingmallSellerArticlesController } from "./controllers/shoppingMall/seller/articles/ShoppingmallSellerArticlesController";
import { ShoppingmallAdminArticlesController } from "./controllers/shoppingMall/admin/articles/ShoppingmallAdminArticlesController";
import { ShoppingmallArticlesCommentsController } from "./controllers/shoppingMall/articles/comments/ShoppingmallArticlesCommentsController";
import { ShoppingmallCustomerArticlesCommentsController } from "./controllers/shoppingMall/customer/articles/comments/ShoppingmallCustomerArticlesCommentsController";
import { ShoppingmallReviewsController } from "./controllers/shoppingMall/reviews/ShoppingmallReviewsController";
import { ShoppingmallCustomerReviewsController } from "./controllers/shoppingMall/customer/reviews/ShoppingmallCustomerReviewsController";
import { ShoppingmallAdminReviewsController } from "./controllers/shoppingMall/admin/reviews/ShoppingmallAdminReviewsController";
import { ShoppingmallCustomerWishlistsController } from "./controllers/shoppingMall/customer/wishlists/ShoppingmallCustomerWishlistsController";
import { ShoppingmallCustomerFavoritesController } from "./controllers/shoppingMall/customer/favorites/ShoppingmallCustomerFavoritesController";
import { ShoppingmallCustomerUserpreferencesController } from "./controllers/shoppingMall/customer/userPreferences/ShoppingmallCustomerUserpreferencesController";
import { ShoppingmallAdminStatisticsSalesController } from "./controllers/shoppingMall/admin/statistics/sales/ShoppingmallAdminStatisticsSalesController";
import { ShoppingmallSellerStatisticsSalesController } from "./controllers/shoppingMall/seller/statistics/sales/ShoppingmallSellerStatisticsSalesController";
import { ShoppingmallAdminStatisticsProductsController } from "./controllers/shoppingMall/admin/statistics/products/ShoppingmallAdminStatisticsProductsController";
import { ShoppingmallSellerStatisticsProductsController } from "./controllers/shoppingMall/seller/statistics/products/ShoppingmallSellerStatisticsProductsController";
import { ShoppingmallAdminStatisticsOrdersController } from "./controllers/shoppingMall/admin/statistics/orders/ShoppingmallAdminStatisticsOrdersController";
import { ShoppingmallAdminAnalyticsCustomer_behaviorController } from "./controllers/shoppingMall/admin/analytics/customer-behavior/ShoppingmallAdminAnalyticsCustomer_behaviorController";
import { ShoppingmallAdminDashboardController } from "./controllers/shoppingMall/admin/dashboard/overview/ShoppingmallAdminDashboardController";
import { ShoppingmallCustomerSearchGlobalController } from "./controllers/shoppingMall/customer/search/global/ShoppingmallCustomerSearchGlobalController";
import { ShoppingmallAdminSearchGlobalController } from "./controllers/shoppingMall/admin/search/global/ShoppingmallAdminSearchGlobalController";

@Module({
  controllers: [
    AuthCustomerController,
    AuthSellerController,
    AuthAdminController,
    ShoppingmallChannelsController,
    ShoppingmallAdminChannelsController,
    ShoppingmallAdminChannelsSectionsController,
    ShoppingmallChannelsSectionsController,
    ShoppingmallCategoriesController,
    ShoppingmallAdminCategoriesController,
    ShoppingmallProductsController,
    ShoppingmallSellerProductsController,
    ShoppingmallProductsAttributesController,
    ShoppingmallSellerProductsAttributesController,
    ShoppingmallAdminProductsAttributesController,
    ShoppingmallSellerProductsVariantsController,
    ShoppingmallAdminProductsVariantsController,
    ShoppingmallProductsVariantsController,
    ShoppingmallProductsImagesController,
    ShoppingmallSellerProductsImagesController,
    ShoppingmallAdminProductsImagesController,
    ShoppingmallSellerSalesController,
    ShoppingmallAdminSalesController,
    ShoppingmallCustomerSalesController,
    ShoppingmallAdminCartsController,
    ShoppingmallCustomerCartsController,
    ShoppingmallCustomerCartsItemsController,
    ShoppingmallCustomerOrdersController,
    ShoppingmallAdminOrdersController,
    ShoppingmallCustomerOrdersItemsController,
    ShoppingmallCustomerOrdersPaymentsController,
    Shopping_mallCustomerOrdersItemsController,
    Shopping_mallCustomerOrdersPaymentsController,
    ShoppingmallAdminOrdersPaymentsController,
    ShoppingmallCustomerOrdersShipmentsController,
    ShoppingmallAdminOrdersShipmentsController,
    ShoppingmallAdminCouponsController,
    ShoppingmallOrdersShipmentsController,
    ShoppingmallCouponsController,
    ShoppingmallAdminPromotionsController,
    ShoppingmallAdminCoinsController,
    ShoppingmallAdminChannelsPromotionsController,
    ShoppingmallCustomerCoinsController,
    ShoppingmallRewardsController,
    ShoppingmallAdminRewardsController,
    ShoppingmallAdminInquiriesController,
    ShoppingmallCustomerInquiriesController,
    ShoppingmallAdminSupportticketsController,
    ShoppingmallArticlesController,
    ShoppingmallCustomerArticlesController,
    ShoppingmallSellerArticlesController,
    ShoppingmallAdminArticlesController,
    ShoppingmallArticlesCommentsController,
    ShoppingmallCustomerArticlesCommentsController,
    ShoppingmallReviewsController,
    ShoppingmallCustomerReviewsController,
    ShoppingmallAdminReviewsController,
    ShoppingmallCustomerWishlistsController,
    ShoppingmallCustomerFavoritesController,
    ShoppingmallCustomerUserpreferencesController,
    ShoppingmallAdminStatisticsSalesController,
    ShoppingmallSellerStatisticsSalesController,
    ShoppingmallAdminStatisticsProductsController,
    ShoppingmallSellerStatisticsProductsController,
    ShoppingmallAdminStatisticsOrdersController,
    ShoppingmallAdminAnalyticsCustomer_behaviorController,
    ShoppingmallAdminDashboardController,
    ShoppingmallCustomerSearchGlobalController,
    ShoppingmallAdminSearchGlobalController,
  ],
})
export class MyModule {}
