import { Module } from "@nestjs/common";

import { AuthGuestController } from "./controllers/auth/guest/AuthGuestController";
import { AuthCustomerController } from "./controllers/auth/customer/AuthCustomerController";
import { AuthSellerController } from "./controllers/auth/seller/AuthSellerController";
import { AuthAdminController } from "./controllers/auth/admin/AuthAdminController";
import { ShoppingmallAdminSystemsettingsController } from "./controllers/shoppingMall/admin/systemSettings/ShoppingmallAdminSystemsettingsController";
import { ShoppingmallAdminPlatformconfigsController } from "./controllers/shoppingMall/admin/platformConfigs/ShoppingmallAdminPlatformconfigsController";
import { ShoppingmallChannelsController } from "./controllers/shoppingMall/channels/ShoppingmallChannelsController";
import { ShoppingmallAdminChannelsController } from "./controllers/shoppingMall/admin/channels/ShoppingmallAdminChannelsController";
import { ShoppingmallAdminChannelsChildrenController } from "./controllers/shoppingMall/admin/channels/children/ShoppingmallAdminChannelsChildrenController";
import { ShoppingmallChannelsChildrenController } from "./controllers/shoppingMall/channels/children/ShoppingmallChannelsChildrenController";
import { ShoppingmallAdminCustomersController } from "./controllers/shoppingMall/admin/customers/ShoppingmallAdminCustomersController";
import { ShoppingmallCustomerCustomersController } from "./controllers/shoppingMall/customer/customers/ShoppingmallCustomerCustomersController";
import { ShoppingmallAdminCustomersessionsController } from "./controllers/shoppingMall/admin/customerSessions/ShoppingmallAdminCustomersessionsController";
import { ShoppingmallAdminSellerprofilesController } from "./controllers/shoppingMall/admin/sellerProfiles/ShoppingmallAdminSellerprofilesController";
import { ShoppingmallSellerSellerprofilesController } from "./controllers/shoppingMall/seller/sellerProfiles/ShoppingmallSellerSellerprofilesController";
import { ShoppingmallSellerSellersController } from "./controllers/shoppingMall/seller/sellers/ShoppingmallSellerSellersController";
import { ShoppingmallAdminSellersController } from "./controllers/shoppingMall/admin/sellers/ShoppingmallAdminSellersController";
import { ShoppingmallAdminSellersessionsController } from "./controllers/shoppingMall/admin/sellerSessions/ShoppingmallAdminSellersessionsController";
import { ShoppingmallAdminAdminsController } from "./controllers/shoppingMall/admin/admins/ShoppingmallAdminAdminsController";
import { ShoppingmallAdminAdminsessionsController } from "./controllers/shoppingMall/admin/adminSessions/ShoppingmallAdminAdminsessionsController";
import { ShoppingmallProductcategoriesController } from "./controllers/shoppingMall/productCategories/ShoppingmallProductcategoriesController";
import { ShoppingmallAdminProductcategoriesController } from "./controllers/shoppingMall/admin/productCategories/ShoppingmallAdminProductcategoriesController";
import { ShoppingmallSellerProductcategoriesController } from "./controllers/shoppingMall/seller/productCategories/ShoppingmallSellerProductcategoriesController";
import { ShoppingmallProductcategoriesChildrenController } from "./controllers/shoppingMall/productCategories/children/ShoppingmallProductcategoriesChildrenController";
import { ShoppingmallAdminProductcategoriesChildrenController } from "./controllers/shoppingMall/admin/productCategories/children/ShoppingmallAdminProductcategoriesChildrenController";
import { ShoppingmallCustomerProductsController } from "./controllers/shoppingMall/customer/products/ShoppingmallCustomerProductsController";
import { ShoppingmallSellerProductsController } from "./controllers/shoppingMall/seller/products/ShoppingmallSellerProductsController";
import { ShoppingmallAdminProductsController } from "./controllers/shoppingMall/admin/products/ShoppingmallAdminProductsController";
import { ShoppingmallSellerProductsSkusController } from "./controllers/shoppingMall/seller/products/skus/ShoppingmallSellerProductsSkusController";
import { ShoppingmallAdminProductsSkusController } from "./controllers/shoppingMall/admin/products/skus/ShoppingmallAdminProductsSkusController";
import { ShoppingmallCustomerProductsearchindexController } from "./controllers/shoppingMall/customer/productSearchIndex/ShoppingmallCustomerProductsearchindexController";
import { ShoppingmallCustomerShoppingcartsController } from "./controllers/shoppingMall/customer/shoppingCarts/ShoppingmallCustomerShoppingcartsController";
import { ShoppingmallCustomerShoppingcartsItemsController } from "./controllers/shoppingMall/customer/shoppingCarts/items/ShoppingmallCustomerShoppingcartsItemsController";
import { ShoppingmallCustomerWishlistsController } from "./controllers/shoppingMall/customer/wishlists/ShoppingmallCustomerWishlistsController";
import { ShoppingmallCustomerWishlistsItemsController } from "./controllers/shoppingMall/customer/wishlists/items/ShoppingmallCustomerWishlistsItemsController";
import { ShoppingmallAdminOrdersController } from "./controllers/shoppingMall/admin/orders/ShoppingmallAdminOrdersController";
import { ShoppingmallCustomerOrdersController } from "./controllers/shoppingMall/customer/orders/ShoppingmallCustomerOrdersController";
import { ShoppingmallAdminOrdersItemsController } from "./controllers/shoppingMall/admin/orders/items/ShoppingmallAdminOrdersItemsController";
import { ShoppingmallCustomerOrdersItemsController } from "./controllers/shoppingMall/customer/orders/items/ShoppingmallCustomerOrdersItemsController";
import { ShoppingmallSellerOrdersItemsController } from "./controllers/shoppingMall/seller/orders/items/ShoppingmallSellerOrdersItemsController";
import { ShoppingmallAdminPaymentsController } from "./controllers/shoppingMall/admin/payments/ShoppingmallAdminPaymentsController";
import { ShoppingmallCustomerPaymentsController } from "./controllers/shoppingMall/customer/payments/ShoppingmallCustomerPaymentsController";
import { ShoppingmallAdminShipmenttrackingsController } from "./controllers/shoppingMall/admin/shipmentTrackings/ShoppingmallAdminShipmenttrackingsController";
import { ShoppingmallSellerShipmenttrackingsController } from "./controllers/shoppingMall/seller/shipmentTrackings/ShoppingmallSellerShipmenttrackingsController";
import { ShoppingmallCustomerShipmenttrackingsController } from "./controllers/shoppingMall/customer/shipmentTrackings/ShoppingmallCustomerShipmenttrackingsController";
import { ShoppingmallAdminProductreviewsController } from "./controllers/shoppingMall/admin/productReviews/ShoppingmallAdminProductreviewsController";
import { ShoppingmallCustomerProductreviewsController } from "./controllers/shoppingMall/customer/productReviews/ShoppingmallCustomerProductreviewsController";
import { ShoppingmallSellerProductreviewsController } from "./controllers/shoppingMall/seller/productReviews/ShoppingmallSellerProductreviewsController";
import { ShoppingmallAdminReviewmoderationqueuesController } from "./controllers/shoppingMall/admin/reviewModerationQueues/ShoppingmallAdminReviewmoderationqueuesController";
import { ShoppingmallAdminSkuinventoriesController } from "./controllers/shoppingMall/admin/skuInventories/ShoppingmallAdminSkuinventoriesController";
import { ShoppingmallSellerSkuinventoriesController } from "./controllers/shoppingMall/seller/skuInventories/ShoppingmallSellerSkuinventoriesController";
import { ShoppingmallCustomerSkuinventoriesController } from "./controllers/shoppingMall/customer/skuInventories/ShoppingmallCustomerSkuinventoriesController";
import { ShoppingmallAdminStockadjustmentsController } from "./controllers/shoppingMall/admin/stockAdjustments/ShoppingmallAdminStockadjustmentsController";
import { ShoppingmallSellerStockadjustmentsController } from "./controllers/shoppingMall/seller/stockAdjustments/ShoppingmallSellerStockadjustmentsController";
import { ShoppingmallAdminLowstockalertsController } from "./controllers/shoppingMall/admin/lowStockAlerts/ShoppingmallAdminLowstockalertsController";
import { ShoppingmallLowstockalertsController } from "./controllers/shoppingMall/lowStockAlerts/ShoppingmallLowstockalertsController";
import { ShoppingmallSellerLowstockalertsController } from "./controllers/shoppingMall/seller/lowStockAlerts/ShoppingmallSellerLowstockalertsController";
import { ShoppingmallAdminOrderhistoriesController } from "./controllers/shoppingMall/admin/orderHistories/ShoppingmallAdminOrderhistoriesController";
import { ShoppingmallAdminOrdercancellationsController } from "./controllers/shoppingMall/admin/orderCancellations/ShoppingmallAdminOrdercancellationsController";
import { ShoppingmallAdminRefundrequestsController } from "./controllers/shoppingMall/admin/refundRequests/ShoppingmallAdminRefundrequestsController";
import { ShoppingmallCustomerReturnshipmentsController } from "./controllers/shoppingMall/customer/returnShipments/ShoppingmallCustomerReturnshipmentsController";
import { ShoppingmallAdminAdminactivitiesController } from "./controllers/shoppingMall/admin/adminActivities/ShoppingmallAdminAdminactivitiesController";
import { ShoppingmallAdminProductapprovalsController } from "./controllers/shoppingMall/admin/productApprovals/ShoppingmallAdminProductapprovalsController";
import { ShoppingmallAdminUserrolesController } from "./controllers/shoppingMall/admin/userRoles/ShoppingmallAdminUserrolesController";
import { ShoppingmallAdminPlatformauditlogsController } from "./controllers/shoppingMall/admin/platformAuditLogs/ShoppingmallAdminPlatformauditlogsController";

@Module({
  controllers: [
    AuthGuestController,
    AuthCustomerController,
    AuthSellerController,
    AuthAdminController,
    ShoppingmallAdminSystemsettingsController,
    ShoppingmallAdminPlatformconfigsController,
    ShoppingmallChannelsController,
    ShoppingmallAdminChannelsController,
    ShoppingmallAdminChannelsChildrenController,
    ShoppingmallChannelsChildrenController,
    ShoppingmallAdminCustomersController,
    ShoppingmallCustomerCustomersController,
    ShoppingmallAdminCustomersessionsController,
    ShoppingmallAdminSellerprofilesController,
    ShoppingmallSellerSellerprofilesController,
    ShoppingmallSellerSellersController,
    ShoppingmallAdminSellersController,
    ShoppingmallAdminSellersessionsController,
    ShoppingmallAdminAdminsController,
    ShoppingmallAdminAdminsessionsController,
    ShoppingmallProductcategoriesController,
    ShoppingmallAdminProductcategoriesController,
    ShoppingmallSellerProductcategoriesController,
    ShoppingmallProductcategoriesChildrenController,
    ShoppingmallAdminProductcategoriesChildrenController,
    ShoppingmallCustomerProductsController,
    ShoppingmallSellerProductsController,
    ShoppingmallAdminProductsController,
    ShoppingmallSellerProductsSkusController,
    ShoppingmallAdminProductsSkusController,
    ShoppingmallCustomerProductsearchindexController,
    ShoppingmallCustomerShoppingcartsController,
    ShoppingmallCustomerShoppingcartsItemsController,
    ShoppingmallCustomerWishlistsController,
    ShoppingmallCustomerWishlistsItemsController,
    ShoppingmallAdminOrdersController,
    ShoppingmallCustomerOrdersController,
    ShoppingmallAdminOrdersItemsController,
    ShoppingmallCustomerOrdersItemsController,
    ShoppingmallSellerOrdersItemsController,
    ShoppingmallAdminPaymentsController,
    ShoppingmallCustomerPaymentsController,
    ShoppingmallAdminShipmenttrackingsController,
    ShoppingmallSellerShipmenttrackingsController,
    ShoppingmallCustomerShipmenttrackingsController,
    ShoppingmallAdminProductreviewsController,
    ShoppingmallCustomerProductreviewsController,
    ShoppingmallSellerProductreviewsController,
    ShoppingmallAdminReviewmoderationqueuesController,
    ShoppingmallAdminSkuinventoriesController,
    ShoppingmallSellerSkuinventoriesController,
    ShoppingmallCustomerSkuinventoriesController,
    ShoppingmallAdminStockadjustmentsController,
    ShoppingmallSellerStockadjustmentsController,
    ShoppingmallAdminLowstockalertsController,
    ShoppingmallLowstockalertsController,
    ShoppingmallSellerLowstockalertsController,
    ShoppingmallAdminOrderhistoriesController,
    ShoppingmallAdminOrdercancellationsController,
    ShoppingmallAdminRefundrequestsController,
    ShoppingmallCustomerReturnshipmentsController,
    ShoppingmallAdminAdminactivitiesController,
    ShoppingmallAdminProductapprovalsController,
    ShoppingmallAdminUserrolesController,
    ShoppingmallAdminPlatformauditlogsController,
  ],
})
export class MyModule {}
