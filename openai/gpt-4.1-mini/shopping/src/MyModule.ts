import { Module } from "@nestjs/common";

import { AuthGuestController } from "./controllers/auth/guest/AuthGuestController";
import { AuthCustomerController } from "./controllers/auth/customer/AuthCustomerController";
import { AuthSellerController } from "./controllers/auth/seller/AuthSellerController";
import { AuthAdminController } from "./controllers/auth/admin/AuthAdminController";
import { ShoppingmallShoppingmallCategoriesController } from "./controllers/shoppingMall/shoppingMall/categories/ShoppingmallShoppingmallCategoriesController";
import { ShoppingmallAdminShoppingmallCategoriesController } from "./controllers/shoppingMall/admin/shoppingMall/categories/ShoppingmallAdminShoppingmallCategoriesController";
import { ShoppingmallAdminShoppingmallConfigurationsController } from "./controllers/shoppingMall/admin/shoppingMall/configurations/ShoppingmallAdminShoppingmallConfigurationsController";
import { ShoppingmallShoppingmallConfigurationsController } from "./controllers/shoppingMall/shoppingMall/configurations/ShoppingmallShoppingmallConfigurationsController";
import { ShoppingmallAdminGuestsController } from "./controllers/shoppingMall/admin/guests/ShoppingmallAdminGuestsController";
import { ShoppingmallGuestsController } from "./controllers/shoppingMall/guests/ShoppingmallGuestsController";
import { ShoppingmallAdminCustomersController } from "./controllers/shoppingMall/admin/customers/ShoppingmallAdminCustomersController";
import { ShoppingmallCustomerCustomersController } from "./controllers/shoppingMall/customer/customers/ShoppingmallCustomerCustomersController";
import { ShoppingmallCustomersController } from "./controllers/shoppingMall/customers/ShoppingmallCustomersController";
import { ShoppingmallAdminSellersController } from "./controllers/shoppingMall/admin/sellers/ShoppingmallAdminSellersController";
import { ShoppingmallAdminAdminsController } from "./controllers/shoppingMall/admin/admins/ShoppingmallAdminAdminsController";
import { ShoppingmallProductsController } from "./controllers/shoppingMall/products/ShoppingmallProductsController";
import { ShoppingmallSellerProductsController } from "./controllers/shoppingMall/seller/products/ShoppingmallSellerProductsController";
import { ShoppingmallAdminProductsController } from "./controllers/shoppingMall/admin/products/ShoppingmallAdminProductsController";
import { ShoppingmallSellerProductsSkusController } from "./controllers/shoppingMall/seller/products/skus/ShoppingmallSellerProductsSkusController";
import { ShoppingmallAdminProductsSkusController } from "./controllers/shoppingMall/admin/products/skus/ShoppingmallAdminProductsSkusController";
import { ShoppingmallProductsSkusController } from "./controllers/shoppingMall/products/skus/ShoppingmallProductsSkusController";
import { ShoppingmallSellerInventoryController } from "./controllers/shoppingMall/seller/inventory/ShoppingmallSellerInventoryController";
import { ShoppingmallAdminInventoryController } from "./controllers/shoppingMall/admin/inventory/ShoppingmallAdminInventoryController";
import { ShoppingmallCustomerShoppingcartsController } from "./controllers/shoppingMall/customer/shoppingCarts/ShoppingmallCustomerShoppingcartsController";
import { ShoppingmallGuestShoppingcartsController } from "./controllers/shoppingMall/guest/shoppingCarts/ShoppingmallGuestShoppingcartsController";
import { ShoppingmallCustomerShoppingcartsCartitemsController } from "./controllers/shoppingMall/customer/shoppingCarts/cartItems/ShoppingmallCustomerShoppingcartsCartitemsController";
import { ShoppingmallCustomerWishlistsController } from "./controllers/shoppingMall/customer/wishlists/ShoppingmallCustomerWishlistsController";
import { ShoppingmallCustomerWishlistsWishlistitemsController } from "./controllers/shoppingMall/customer/wishlists/wishlistItems/ShoppingmallCustomerWishlistsWishlistitemsController";
import { ShoppingmallCustomerOrdersController } from "./controllers/shoppingMall/customer/orders/ShoppingmallCustomerOrdersController";
import { ShoppingmallSellerOrdersController } from "./controllers/shoppingMall/seller/orders/ShoppingmallSellerOrdersController";
import { ShoppingmallAdminOrdersController } from "./controllers/shoppingMall/admin/orders/ShoppingmallAdminOrdersController";
import { ShoppingmallSellerOrdersItemsController } from "./controllers/shoppingMall/seller/orders/items/ShoppingmallSellerOrdersItemsController";
import { ShoppingmallAdminOrdersItemsController } from "./controllers/shoppingMall/admin/orders/items/ShoppingmallAdminOrdersItemsController";
import { ShoppingmallCustomerOrdersItemsController } from "./controllers/shoppingMall/customer/orders/items/ShoppingmallCustomerOrdersItemsController";
import { ShoppingmallCustomerOrdersPaymentsController } from "./controllers/shoppingMall/customer/orders/payments/ShoppingmallCustomerOrdersPaymentsController";
import { ShoppingmallSellerOrdersPaymentsController } from "./controllers/shoppingMall/seller/orders/payments/ShoppingmallSellerOrdersPaymentsController";
import { ShoppingmallAdminOrdersPaymentsController } from "./controllers/shoppingMall/admin/orders/payments/ShoppingmallAdminOrdersPaymentsController";
import { ShoppingmallAdminOrdersStatusesController } from "./controllers/shoppingMall/admin/orders/statuses/ShoppingmallAdminOrdersStatusesController";
import { ShoppingmallSellerOrdersStatusesController } from "./controllers/shoppingMall/seller/orders/statuses/ShoppingmallSellerOrdersStatusesController";
import { ShoppingmallCustomerOrdersStatusesController } from "./controllers/shoppingMall/customer/orders/statuses/ShoppingmallCustomerOrdersStatusesController";
import { ShoppingmallAdminOrdersRefundrequestsController } from "./controllers/shoppingMall/admin/orders/refundRequests/ShoppingmallAdminOrdersRefundrequestsController";
import { ShoppingmallCustomerOrdersRefundrequestsController } from "./controllers/shoppingMall/customer/orders/refundRequests/ShoppingmallCustomerOrdersRefundrequestsController";
import { ShoppingmallAdminOrdersCancellationrequestsController } from "./controllers/shoppingMall/admin/orders/cancellationRequests/ShoppingmallAdminOrdersCancellationrequestsController";
import { ShoppingmallCustomerOrdersCancellationrequestsController } from "./controllers/shoppingMall/customer/orders/cancellationRequests/ShoppingmallCustomerOrdersCancellationrequestsController";
import { ShoppingmallSellerOrdersCancellationrequestsController } from "./controllers/shoppingMall/seller/orders/cancellationRequests/ShoppingmallSellerOrdersCancellationrequestsController";
import { ShoppingmallAdminProductreviewsController } from "./controllers/shoppingMall/admin/productReviews/ShoppingmallAdminProductreviewsController";
import { ShoppingmallCustomerProductreviewsController } from "./controllers/shoppingMall/customer/productReviews/ShoppingmallCustomerProductreviewsController";
import { ShoppingmallAdminProductreviewsReviewmoderationsController } from "./controllers/shoppingMall/admin/productReviews/reviewModerations/ShoppingmallAdminProductreviewsReviewmoderationsController";
import { ShoppingmallAdminAdmindashboardController } from "./controllers/shoppingMall/admin/adminDashboard/ShoppingmallAdminAdmindashboardController";
import { ShoppingmallAdminAuditlogsController } from "./controllers/shoppingMall/admin/auditLogs/ShoppingmallAdminAuditlogsController";
import { ShoppingmallAuditlogsController } from "./controllers/shoppingMall/auditLogs/ShoppingmallAuditlogsController";
import { ShoppingmallAdminReportsController } from "./controllers/shoppingMall/admin/reports/ShoppingmallAdminReportsController";

@Module({
  controllers: [
    AuthGuestController,
    AuthCustomerController,
    AuthSellerController,
    AuthAdminController,
    ShoppingmallShoppingmallCategoriesController,
    ShoppingmallAdminShoppingmallCategoriesController,
    ShoppingmallAdminShoppingmallConfigurationsController,
    ShoppingmallShoppingmallConfigurationsController,
    ShoppingmallAdminGuestsController,
    ShoppingmallGuestsController,
    ShoppingmallAdminCustomersController,
    ShoppingmallCustomerCustomersController,
    ShoppingmallCustomersController,
    ShoppingmallAdminSellersController,
    ShoppingmallAdminAdminsController,
    ShoppingmallProductsController,
    ShoppingmallSellerProductsController,
    ShoppingmallAdminProductsController,
    ShoppingmallSellerProductsSkusController,
    ShoppingmallAdminProductsSkusController,
    ShoppingmallProductsSkusController,
    ShoppingmallSellerInventoryController,
    ShoppingmallAdminInventoryController,
    ShoppingmallCustomerShoppingcartsController,
    ShoppingmallGuestShoppingcartsController,
    ShoppingmallCustomerShoppingcartsCartitemsController,
    ShoppingmallCustomerWishlistsController,
    ShoppingmallCustomerWishlistsWishlistitemsController,
    ShoppingmallCustomerOrdersController,
    ShoppingmallSellerOrdersController,
    ShoppingmallAdminOrdersController,
    ShoppingmallSellerOrdersItemsController,
    ShoppingmallAdminOrdersItemsController,
    ShoppingmallCustomerOrdersItemsController,
    ShoppingmallCustomerOrdersPaymentsController,
    ShoppingmallSellerOrdersPaymentsController,
    ShoppingmallAdminOrdersPaymentsController,
    ShoppingmallAdminOrdersStatusesController,
    ShoppingmallSellerOrdersStatusesController,
    ShoppingmallCustomerOrdersStatusesController,
    ShoppingmallAdminOrdersRefundrequestsController,
    ShoppingmallCustomerOrdersRefundrequestsController,
    ShoppingmallAdminOrdersCancellationrequestsController,
    ShoppingmallCustomerOrdersCancellationrequestsController,
    ShoppingmallSellerOrdersCancellationrequestsController,
    ShoppingmallAdminProductreviewsController,
    ShoppingmallCustomerProductreviewsController,
    ShoppingmallAdminProductreviewsReviewmoderationsController,
    ShoppingmallAdminAdmindashboardController,
    ShoppingmallAdminAuditlogsController,
    ShoppingmallAuditlogsController,
    ShoppingmallAdminReportsController,
  ],
})
export class MyModule {}
