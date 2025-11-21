import { Module } from "@nestjs/common";

import { AuthCustomerController } from "./controllers/auth/customer/refresh/AuthCustomerController";
import { AuthSellerController } from "./controllers/auth/seller/AuthSellerController";
import { AuthAdminController } from "./controllers/auth/admin/AuthAdminController";
import { ShoppingmallActorsCustomersController } from "./controllers/shoppingMall/actors/customers/ShoppingmallActorsCustomersController";
import { ShoppingmallCustomerActorsCustomersController } from "./controllers/shoppingMall/customer/actors/customers/ShoppingmallCustomerActorsCustomersController";
import { ShoppingmallAdminActorsCustomersController } from "./controllers/shoppingMall/admin/actors/customers/ShoppingmallAdminActorsCustomersController";
import { ShoppingmallAdminActorsSellersController } from "./controllers/shoppingMall/admin/actors/sellers/ShoppingmallAdminActorsSellersController";
import { ShoppingmallActorsSellersController } from "./controllers/shoppingMall/actors/sellers/ShoppingmallActorsSellersController";
import { ShoppingmallAdminActorsAdminsController } from "./controllers/shoppingMall/admin/actors/admins/ShoppingmallAdminActorsAdminsController";
import { ShoppingmallProductsController } from "./controllers/shoppingMall/products/ShoppingmallProductsController";
import { ShoppingmallSellerProductsController } from "./controllers/shoppingMall/seller/products/ShoppingmallSellerProductsController";
import { ShoppingmallAdminProductsController } from "./controllers/shoppingMall/admin/products/ShoppingmallAdminProductsController";
import { ShoppingmallProductsVariantsController } from "./controllers/shoppingMall/products/variants/ShoppingmallProductsVariantsController";
import { ShoppingmallSellerProductsVariantsController } from "./controllers/shoppingMall/seller/products/variants/ShoppingmallSellerProductsVariantsController";
import { ShoppingmallCustomerProductsImagesController } from "./controllers/shoppingMall/customer/products/images/ShoppingmallCustomerProductsImagesController";
import { ShoppingmallAdminProductsImagesController } from "./controllers/shoppingMall/admin/products/images/ShoppingmallAdminProductsImagesController";
import { ShoppingmallProductsImagesController } from "./controllers/shoppingMall/products/images/ShoppingmallProductsImagesController";
import { ShoppingmallSellerProductsImagesController } from "./controllers/shoppingMall/seller/products/images/ShoppingmallSellerProductsImagesController";
import { ShoppingmallProductsTagsController } from "./controllers/shoppingMall/products/tags/ShoppingmallProductsTagsController";
import { ShoppingmallSellerProductsTagsController } from "./controllers/shoppingMall/seller/products/tags/ShoppingmallSellerProductsTagsController";
import { ShoppingmallAdminProductsTagsController } from "./controllers/shoppingMall/admin/products/tags/ShoppingmallAdminProductsTagsController";
import { ShoppingmallProductsCategoriesController } from "./controllers/shoppingMall/products/categories/ShoppingmallProductsCategoriesController";
import { ShoppingmallSellerProductsCategoriesController } from "./controllers/shoppingMall/seller/products/categories/ShoppingmallSellerProductsCategoriesController";
import { ShoppingmallCustomerCartsController } from "./controllers/shoppingMall/customer/carts/ShoppingmallCustomerCartsController";
import { ShoppingmallCustomerCartsItemsController } from "./controllers/shoppingMall/customer/carts/items/ShoppingmallCustomerCartsItemsController";
import { ShoppingmallCartsItemsController } from "./controllers/shoppingMall/carts/items/ShoppingmallCartsItemsController";
import { ShoppingmallCustomerWishlistsController } from "./controllers/shoppingMall/customer/wishlists/ShoppingmallCustomerWishlistsController";
import { ShoppingmallCustomerWishlistsItemsController } from "./controllers/shoppingMall/customer/wishlists/items/ShoppingmallCustomerWishlistsItemsController";
import { ShoppingmallOrdersController } from "./controllers/shoppingMall/orders/ShoppingmallOrdersController";
import { ShoppingmallCustomerOrdersController } from "./controllers/shoppingMall/customer/orders/ShoppingmallCustomerOrdersController";
import { ShoppingmallAdminOrdersController } from "./controllers/shoppingMall/admin/orders/ShoppingmallAdminOrdersController";
import { ShoppingmallCustomerOrdersItemsController } from "./controllers/shoppingMall/customer/orders/items/ShoppingmallCustomerOrdersItemsController";
import { ShoppingmallAdminOrdersItemsController } from "./controllers/shoppingMall/admin/orders/items/ShoppingmallAdminOrdersItemsController";
import { ShoppingmallSellerOrdersItemsController } from "./controllers/shoppingMall/seller/orders/items/ShoppingmallSellerOrdersItemsController";
import { ShoppingmallOrdersItemsController } from "./controllers/shoppingMall/orders/items/ShoppingmallOrdersItemsController";
import { ShoppingmallCustomerOrdersPaymentController } from "./controllers/shoppingMall/customer/orders/payment/ShoppingmallCustomerOrdersPaymentController";
import { ShoppingmallAdminOrdersPaymentController } from "./controllers/shoppingMall/admin/orders/payment/ShoppingmallAdminOrdersPaymentController";
import { ShoppingmallCustomerOrdersShippingController } from "./controllers/shoppingMall/customer/orders/shipping/ShoppingmallCustomerOrdersShippingController";
import { ShoppingmallAdminOrdersShippingController } from "./controllers/shoppingMall/admin/orders/shipping/ShoppingmallAdminOrdersShippingController";
import { ShoppingmallMyOrdersShippingController } from "./controllers/shoppingMall/my/orders/shipping/ShoppingmallMyOrdersShippingController";
import { ShoppingmallOrdersShippingController } from "./controllers/shoppingMall/orders/shipping/ShoppingmallOrdersShippingController";
import { ShoppingmallOrdersReturnsController } from "./controllers/shoppingMall/orders/returns/ShoppingmallOrdersReturnsController";
import { ShoppingmallCustomerOrdersReturnsController } from "./controllers/shoppingMall/customer/orders/returns/ShoppingmallCustomerOrdersReturnsController";
import { ShoppingmallAdminOrdersReturnsController } from "./controllers/shoppingMall/admin/orders/returns/ShoppingmallAdminOrdersReturnsController";
import { ShoppingmallOrdersStatus_historyController } from "./controllers/shoppingMall/orders/status-history/ShoppingmallOrdersStatus_historyController";
import { ShoppingmallReviewsController } from "./controllers/shoppingMall/reviews/ShoppingmallReviewsController";
import { ShoppingmallCustomerReviewsController } from "./controllers/shoppingMall/customer/reviews/ShoppingmallCustomerReviewsController";
import { ShoppingmallAdminReviewsController } from "./controllers/shoppingMall/admin/reviews/ShoppingmallAdminReviewsController";
import { ShoppingmallCustomerReviewsImagesController } from "./controllers/shoppingMall/customer/reviews/images/ShoppingmallCustomerReviewsImagesController";
import { ShoppingmallAdminReviewsImagesController } from "./controllers/shoppingMall/admin/reviews/images/ShoppingmallAdminReviewsImagesController";
import { ShoppingmallReviewsReactionsController } from "./controllers/shoppingMall/reviews/reactions/ShoppingmallReviewsReactionsController";
import { ShoppingmallCustomerReviewsReactionsController } from "./controllers/shoppingMall/customer/reviews/reactions/ShoppingmallCustomerReviewsReactionsController";
import { ShoppingmallCustomerReviewsModeration_logsController } from "./controllers/shoppingMall/customer/reviews/moderation-logs/ShoppingmallCustomerReviewsModeration_logsController";
import { ShoppingmallInventoryUnitsController } from "./controllers/shoppingMall/inventory/units/ShoppingmallInventoryUnitsController";
import { ShoppingmallSellerInventoryUnitsController } from "./controllers/shoppingMall/seller/inventory/units/ShoppingmallSellerInventoryUnitsController";
import { ShoppingmallSellerInventoryReservationsController } from "./controllers/shoppingMall/seller/inventory/reservations/ShoppingmallSellerInventoryReservationsController";
import { ShoppingmallCustomerInventoryReservationsController } from "./controllers/shoppingMall/customer/inventory/reservations/ShoppingmallCustomerInventoryReservationsController";
import { ShoppingmallAdminInventoryReservationsController } from "./controllers/shoppingMall/admin/inventory/reservations/ShoppingmallAdminInventoryReservationsController";
import { ShoppingmallInventoryReservationsController } from "./controllers/shoppingMall/inventory/reservations/ShoppingmallInventoryReservationsController";
import { ShoppingmallInventoryAlertsController } from "./controllers/shoppingMall/inventory/alerts/ShoppingmallInventoryAlertsController";
import { ShoppingmallPromotionsCouponsController } from "./controllers/shoppingMall/promotions/coupons/ShoppingmallPromotionsCouponsController";
import { ShoppingmallAdminPromotionsCouponsController } from "./controllers/shoppingMall/admin/promotions/coupons/ShoppingmallAdminPromotionsCouponsController";
import { ShoppingmallAdminPromotionsCoupon_redemptionsController } from "./controllers/shoppingMall/admin/promotions/coupon-redemptions/ShoppingmallAdminPromotionsCoupon_redemptionsController";
import { ShoppingmallCustomerPromotionsCoupon_redemptionsController } from "./controllers/shoppingMall/customer/promotions/coupon-redemptions/ShoppingmallCustomerPromotionsCoupon_redemptionsController";
import { ShoppingmallPromotionsCoupon_redemptionsController } from "./controllers/shoppingMall/promotions/coupon-redemptions/ShoppingmallPromotionsCoupon_redemptionsController";
import { ShoppingmallAdminPromotionsPromotional_campaignsController } from "./controllers/shoppingMall/admin/promotions/promotional-campaigns/ShoppingmallAdminPromotionsPromotional_campaignsController";
import { ShoppingmallPromotionsPromotional_campaignsController } from "./controllers/shoppingMall/promotions/promotional-campaigns/ShoppingmallPromotionsPromotional_campaignsController";
import { ShoppingmallPromotionsLoyalty_pointsController } from "./controllers/shoppingMall/promotions/loyalty-points/ShoppingmallPromotionsLoyalty_pointsController";
import { ShoppingmallCustomerPromotionsLoyalty_pointsController } from "./controllers/shoppingMall/customer/promotions/loyalty-points/ShoppingmallCustomerPromotionsLoyalty_pointsController";
import { ShoppingmallAdminPromotionsLoyalty_pointsController } from "./controllers/shoppingMall/admin/promotions/loyalty-points/ShoppingmallAdminPromotionsLoyalty_pointsController";
import { ShoppingmallPromotionsLoyalty_point_transactionsController } from "./controllers/shoppingMall/promotions/loyalty-point-transactions/ShoppingmallPromotionsLoyalty_point_transactionsController";
import { ShoppingmallCustomerPromotionsLoyalty_point_transactionsController } from "./controllers/shoppingMall/customer/promotions/loyalty-point-transactions/ShoppingmallCustomerPromotionsLoyalty_point_transactionsController";
import { ShoppingmallNotificationsTemplatesController } from "./controllers/shoppingMall/notifications/templates/ShoppingmallNotificationsTemplatesController";
import { ShoppingmallAdminNotificationsTemplatesController } from "./controllers/shoppingMall/admin/notifications/templates/ShoppingmallAdminNotificationsTemplatesController";
import { ShoppingmallAdminNotificationsQueueController } from "./controllers/shoppingMall/admin/notifications/queue/ShoppingmallAdminNotificationsQueueController";
import { ShoppingmallAdminNotificationsDeliveriesController } from "./controllers/shoppingMall/admin/notifications/deliveries/ShoppingmallAdminNotificationsDeliveriesController";
import { ShoppingmallCustomerNotificationsPreferencesController } from "./controllers/shoppingMall/customer/notifications/preferences/ShoppingmallCustomerNotificationsPreferencesController";
import { ShoppingmallAdminAuditLogsController } from "./controllers/shoppingMall/admin/audit/logs/ShoppingmallAdminAuditLogsController";
import { ShoppingmallAdminAccessLogsController } from "./controllers/shoppingMall/admin/access/logs/ShoppingmallAdminAccessLogsController";
import { ShoppingmallAdminData_changeLogsController } from "./controllers/shoppingMall/admin/data-change/logs/ShoppingmallAdminData_changeLogsController";

@Module({
  controllers: [
    AuthCustomerController,
    AuthSellerController,
    AuthAdminController,
    ShoppingmallActorsCustomersController,
    ShoppingmallCustomerActorsCustomersController,
    ShoppingmallAdminActorsCustomersController,
    ShoppingmallAdminActorsSellersController,
    ShoppingmallActorsSellersController,
    ShoppingmallAdminActorsAdminsController,
    ShoppingmallProductsController,
    ShoppingmallSellerProductsController,
    ShoppingmallAdminProductsController,
    ShoppingmallProductsVariantsController,
    ShoppingmallSellerProductsVariantsController,
    ShoppingmallCustomerProductsImagesController,
    ShoppingmallAdminProductsImagesController,
    ShoppingmallProductsImagesController,
    ShoppingmallSellerProductsImagesController,
    ShoppingmallProductsTagsController,
    ShoppingmallSellerProductsTagsController,
    ShoppingmallAdminProductsTagsController,
    ShoppingmallProductsCategoriesController,
    ShoppingmallSellerProductsCategoriesController,
    ShoppingmallCustomerCartsController,
    ShoppingmallCustomerCartsItemsController,
    ShoppingmallCartsItemsController,
    ShoppingmallCustomerWishlistsController,
    ShoppingmallCustomerWishlistsItemsController,
    ShoppingmallOrdersController,
    ShoppingmallCustomerOrdersController,
    ShoppingmallAdminOrdersController,
    ShoppingmallCustomerOrdersItemsController,
    ShoppingmallAdminOrdersItemsController,
    ShoppingmallSellerOrdersItemsController,
    ShoppingmallOrdersItemsController,
    ShoppingmallCustomerOrdersPaymentController,
    ShoppingmallAdminOrdersPaymentController,
    ShoppingmallCustomerOrdersShippingController,
    ShoppingmallAdminOrdersShippingController,
    ShoppingmallMyOrdersShippingController,
    ShoppingmallOrdersShippingController,
    ShoppingmallOrdersReturnsController,
    ShoppingmallCustomerOrdersReturnsController,
    ShoppingmallAdminOrdersReturnsController,
    ShoppingmallOrdersStatus_historyController,
    ShoppingmallReviewsController,
    ShoppingmallCustomerReviewsController,
    ShoppingmallAdminReviewsController,
    ShoppingmallCustomerReviewsImagesController,
    ShoppingmallAdminReviewsImagesController,
    ShoppingmallReviewsReactionsController,
    ShoppingmallCustomerReviewsReactionsController,
    ShoppingmallCustomerReviewsModeration_logsController,
    ShoppingmallInventoryUnitsController,
    ShoppingmallSellerInventoryUnitsController,
    ShoppingmallSellerInventoryReservationsController,
    ShoppingmallCustomerInventoryReservationsController,
    ShoppingmallAdminInventoryReservationsController,
    ShoppingmallInventoryReservationsController,
    ShoppingmallInventoryAlertsController,
    ShoppingmallPromotionsCouponsController,
    ShoppingmallAdminPromotionsCouponsController,
    ShoppingmallAdminPromotionsCoupon_redemptionsController,
    ShoppingmallCustomerPromotionsCoupon_redemptionsController,
    ShoppingmallPromotionsCoupon_redemptionsController,
    ShoppingmallAdminPromotionsPromotional_campaignsController,
    ShoppingmallPromotionsPromotional_campaignsController,
    ShoppingmallPromotionsLoyalty_pointsController,
    ShoppingmallCustomerPromotionsLoyalty_pointsController,
    ShoppingmallAdminPromotionsLoyalty_pointsController,
    ShoppingmallPromotionsLoyalty_point_transactionsController,
    ShoppingmallCustomerPromotionsLoyalty_point_transactionsController,
    ShoppingmallNotificationsTemplatesController,
    ShoppingmallAdminNotificationsTemplatesController,
    ShoppingmallAdminNotificationsQueueController,
    ShoppingmallAdminNotificationsDeliveriesController,
    ShoppingmallCustomerNotificationsPreferencesController,
    ShoppingmallAdminAuditLogsController,
    ShoppingmallAdminAccessLogsController,
    ShoppingmallAdminData_changeLogsController,
  ],
})
export class MyModule {}
