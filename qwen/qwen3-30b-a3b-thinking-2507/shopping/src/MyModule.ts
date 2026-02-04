import { Module } from "@nestjs/common";

import { ShoppingmallAdminAdminsController } from "./controllers/shoppingMall/admin/admins/ShoppingmallAdminAdminsController";
import { ShoppingmallAdminAnalyticsSalesController } from "./controllers/shoppingMall/admin/analytics/sales/ShoppingmallAdminAnalyticsSalesController";
import { ShoppingmallAdminChannelsController } from "./controllers/shoppingMall/admin/channels/ShoppingmallAdminChannelsController";
import { ShoppingmallAdminConfigurationsController } from "./controllers/shoppingMall/admin/configurations/ShoppingmallAdminConfigurationsController";
import { ShoppingmallAdminConfigurationsStatusController } from "./controllers/shoppingMall/admin/configurations/status/ShoppingmallAdminConfigurationsStatusController";
import { ShoppingmallAdminCustomersController } from "./controllers/shoppingMall/admin/customers/ShoppingmallAdminCustomersController";
import { ShoppingmallAdminOrder_itemsSnapshotsController } from "./controllers/shoppingMall/admin/order-items/snapshots/ShoppingmallAdminOrder_itemsSnapshotsController";
import { ShoppingmallAdminOrdersController } from "./controllers/shoppingMall/admin/orders/ShoppingmallAdminOrdersController";
import { ShoppingmallAdminOrdersCancellationsController } from "./controllers/shoppingMall/admin/orders/cancellations/ShoppingmallAdminOrdersCancellationsController";
import { ShoppingmallAdminOrdersItemsController } from "./controllers/shoppingMall/admin/orders/items/ShoppingmallAdminOrdersItemsController";
import { ShoppingmallAdminOrdersOrder_itemsSnapshotsController } from "./controllers/shoppingMall/admin/orders/order-items/snapshots/ShoppingmallAdminOrdersOrder_itemsSnapshotsController";
import { ShoppingmallAdminOrdersRefundsController } from "./controllers/shoppingMall/admin/orders/refunds/ShoppingmallAdminOrdersRefundsController";
import { ShoppingmallAdminOrdersShipmentsController } from "./controllers/shoppingMall/admin/orders/shipments/ShoppingmallAdminOrdersShipmentsController";
import { ShoppingmallAdminPromo_codesController } from "./controllers/shoppingMall/admin/promo-codes/ShoppingmallAdminPromo_codesController";
import { ShoppingmallAdminPromotionsController } from "./controllers/shoppingMall/admin/promotions/ShoppingmallAdminPromotionsController";
import { ShoppingmallAdminReportsMonthlyController } from "./controllers/shoppingMall/admin/reports/monthly/ShoppingmallAdminReportsMonthlyController";
import { ShoppingmallAdminSectionsController } from "./controllers/shoppingMall/admin/sections/ShoppingmallAdminSectionsController";
import { ShoppingmallAdminSectionsHierarchyController } from "./controllers/shoppingMall/admin/sections/hierarchy/ShoppingmallAdminSectionsHierarchyController";
import { ShoppingmallAdminSellersController } from "./controllers/shoppingMall/admin/sellers/ShoppingmallAdminSellersController";
import { ShoppingmallAnalyticsTrendingController } from "./controllers/shoppingMall/analytics/trending/ShoppingmallAnalyticsTrendingController";
import { ShoppingmallAuthAdminController } from "./controllers/shoppingMall/auth/admin/ShoppingmallAuthAdminController";
import { ShoppingmallAuthCustomerController } from "./controllers/shoppingMall/auth/customer/ShoppingmallAuthCustomerController";
import { ShoppingmallAuthSellerController } from "./controllers/shoppingMall/auth/seller/ShoppingmallAuthSellerController";
import { ShoppingmallCategoriesController } from "./controllers/shoppingMall/categories/ShoppingmallCategoriesController";
import { ShoppingmallCustomerAddressesController } from "./controllers/shoppingMall/customer/addresses/ShoppingmallCustomerAddressesController";
import { ShoppingmallCustomerAddresses_defaultController } from "./controllers/shoppingMall/customer/addresses/default/ShoppingmallCustomerAddresses_defaultController";
import { ShoppingmallCustomerCartsController } from "./controllers/shoppingMall/customer/carts/ShoppingmallCustomerCartsController";
import { ShoppingmallCustomerCartsItemsController } from "./controllers/shoppingMall/customer/carts/items/ShoppingmallCustomerCartsItemsController";
import { ShoppingmallCustomerCartsSnapshotsController } from "./controllers/shoppingMall/customer/carts/snapshots/ShoppingmallCustomerCartsSnapshotsController";
import { ShoppingmallCustomerEmail_verificationsController } from "./controllers/shoppingMall/customer/email-verifications/ShoppingmallCustomerEmail_verificationsController";
import { ShoppingmallCustomerOrder_itemsSnapshotsController } from "./controllers/shoppingMall/customer/order-items/snapshots/ShoppingmallCustomerOrder_itemsSnapshotsController";
import { ShoppingmallCustomerOrdersController } from "./controllers/shoppingMall/customer/orders/ShoppingmallCustomerOrdersController";
import { ShoppingmallCustomerOrdersSnapshotsController } from "./controllers/shoppingMall/customer/orders/snapshots/ShoppingmallCustomerOrdersSnapshotsController";
import { ShoppingmallCustomerPassword_resetsController } from "./controllers/shoppingMall/customer/password-resets/ShoppingmallCustomerPassword_resetsController";
import { ShoppingmallCustomerProfileController } from "./controllers/shoppingMall/customer/profile/ShoppingmallCustomerProfileController";
import { ShoppingmallCustomerSessionsController } from "./controllers/shoppingMall/customer/sessions/ShoppingmallCustomerSessionsController";
import { ShoppingmallCustomerWishlistController } from "./controllers/shoppingMall/customer/wishlist/ShoppingmallCustomerWishlistController";
import { ShoppingmallCustomerWishlistSnapshotsController } from "./controllers/shoppingMall/customer/wishlist/snapshots/ShoppingmallCustomerWishlistSnapshotsController";
import { ShoppingmallProductsController } from "./controllers/shoppingMall/products/ShoppingmallProductsController";
import { ShoppingmallSellerAccount_status_historiesController } from "./controllers/shoppingMall/seller/account-status-histories/ShoppingmallSellerAccount_status_historiesController";
import { ShoppingmallSellerAnalyticsOrdersSalesController } from "./controllers/shoppingMall/seller/analytics/orders/sales/ShoppingmallSellerAnalyticsOrdersSalesController";
import { ShoppingmallSellerCategoriesController } from "./controllers/shoppingMall/seller/categories/ShoppingmallSellerCategoriesController";
import { ShoppingmallSellerDashboardController } from "./controllers/shoppingMall/seller/dashboard/ShoppingmallSellerDashboardController";
import { ShoppingmallSellerOrder_itemsSnapshotsController } from "./controllers/shoppingMall/seller/order-items/snapshots/ShoppingmallSellerOrder_itemsSnapshotsController";
import { ShoppingmallSellerOrdersController } from "./controllers/shoppingMall/seller/orders/ShoppingmallSellerOrdersController";
import { ShoppingmallSellerOrdersSnapshotsController } from "./controllers/shoppingMall/seller/orders/snapshots/ShoppingmallSellerOrdersSnapshotsController";
import { ShoppingmallSellerProductsController } from "./controllers/shoppingMall/seller/products/ShoppingmallSellerProductsController";
import { ShoppingmallSellerProductsImagesController } from "./controllers/shoppingMall/seller/products/images/ShoppingmallSellerProductsImagesController";
import { ShoppingmallSellerProductsSnapshotsController } from "./controllers/shoppingMall/seller/products/snapshots/ShoppingmallSellerProductsSnapshotsController";
import { ShoppingmallSellerProductsVariantsController } from "./controllers/shoppingMall/seller/products/variants/ShoppingmallSellerProductsVariantsController";
import { ShoppingmallSellerProductsVariantsOptionsController } from "./controllers/shoppingMall/seller/products/variants/options/ShoppingmallSellerProductsVariantsOptionsController";
import { ShoppingmallSellerProductsView_statsController } from "./controllers/shoppingMall/seller/products/view-stats/ShoppingmallSellerProductsView_statsController";
import { ShoppingmallSellerProfile_snapshotsController } from "./controllers/shoppingMall/seller/profile-snapshots/ShoppingmallSellerProfile_snapshotsController";

@Module({
  controllers: [
    ShoppingmallAuthCustomerController,
    ShoppingmallAuthSellerController,
    ShoppingmallAuthAdminController,
    ShoppingmallAdminCustomersController,
    ShoppingmallCustomerProfileController,
    ShoppingmallCustomerSessionsController,
    ShoppingmallCustomerEmail_verificationsController,
    ShoppingmallCustomerPassword_resetsController,
    ShoppingmallAdminSellersController,
    ShoppingmallAdminAdminsController,
    ShoppingmallSellerAccount_status_historiesController,
    ShoppingmallSellerProfile_snapshotsController,
    ShoppingmallProductsController,
    ShoppingmallSellerProductsController,
    ShoppingmallSellerProductsVariantsController,
    ShoppingmallSellerProductsImagesController,
    ShoppingmallSellerProductsView_statsController,
    ShoppingmallSellerProductsSnapshotsController,
    ShoppingmallCategoriesController,
    ShoppingmallSellerCategoriesController,
    ShoppingmallSellerProductsVariantsOptionsController,
    ShoppingmallCustomerOrdersController,
    ShoppingmallSellerOrdersController,
    ShoppingmallCustomerOrder_itemsSnapshotsController,
    ShoppingmallSellerOrder_itemsSnapshotsController,
    ShoppingmallAdminOrder_itemsSnapshotsController,
    ShoppingmallAdminPromotionsController,
    ShoppingmallAdminPromo_codesController,
    ShoppingmallCustomerCartsController,
    ShoppingmallCustomerCartsItemsController,
    ShoppingmallCustomerCartsSnapshotsController,
    ShoppingmallAdminOrdersController,
    ShoppingmallAdminOrdersItemsController,
    ShoppingmallAdminOrdersShipmentsController,
    ShoppingmallAdminOrdersRefundsController,
    ShoppingmallAdminOrdersOrder_itemsSnapshotsController,
    ShoppingmallAdminOrdersCancellationsController,
    ShoppingmallAdminChannelsController,
    ShoppingmallAdminSectionsController,
    ShoppingmallAdminConfigurationsController,
    ShoppingmallCustomerAddressesController,
    ShoppingmallCustomerWishlistController,
    ShoppingmallCustomerWishlistSnapshotsController,
    ShoppingmallAnalyticsTrendingController,
    ShoppingmallSellerDashboardController,
    ShoppingmallAdminAnalyticsSalesController,
    ShoppingmallAdminReportsMonthlyController,
    ShoppingmallSellerAnalyticsOrdersSalesController,
    ShoppingmallCustomerOrdersSnapshotsController,
    ShoppingmallSellerOrdersSnapshotsController,
    ShoppingmallAdminConfigurationsStatusController,
    ShoppingmallAdminSectionsHierarchyController,
    ShoppingmallCustomerAddresses_defaultController,
  ],
})
export class MyModule {}
