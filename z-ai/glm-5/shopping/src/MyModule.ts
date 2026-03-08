import { Module } from "@nestjs/common";

import { ShoppingmallAdministratorAdministratorsController } from "./controllers/shoppingMall/administrator/administrators/ShoppingmallAdministratorAdministratorsController";
import { ShoppingmallAdministratorCategoriesController } from "./controllers/shoppingMall/administrator/categories/ShoppingmallAdministratorCategoriesController";
import { ShoppingmallAdministratorCustomersController } from "./controllers/shoppingMall/administrator/customers/ShoppingmallAdministratorCustomersController";
import { ShoppingmallAdministratorOrderitemsForce_cancelController } from "./controllers/shoppingMall/administrator/orderItems/force-cancel/ShoppingmallAdministratorOrderitemsForce_cancelController";
import { ShoppingmallAdministratorOrderitemsForce_refundController } from "./controllers/shoppingMall/administrator/orderItems/force-refund/ShoppingmallAdministratorOrderitemsForce_refundController";
import { ShoppingmallAdministratorOrdersForce_cancelController } from "./controllers/shoppingMall/administrator/orders/force-cancel/ShoppingmallAdministratorOrdersForce_cancelController";
import { ShoppingmallAdministratorOrdersForce_refundController } from "./controllers/shoppingMall/administrator/orders/force-refund/ShoppingmallAdministratorOrdersForce_refundController";
import { ShoppingmallAdministratorPassword_resetsController } from "./controllers/shoppingMall/administrator/password-resets/ShoppingmallAdministratorPassword_resetsController";
import { ShoppingmallAdministratorProductsController } from "./controllers/shoppingMall/administrator/products/ShoppingmallAdministratorProductsController";
import { ShoppingmallAdministratorProductsSnapshotsController } from "./controllers/shoppingMall/administrator/products/snapshots/ShoppingmallAdministratorProductsSnapshotsController";
import { ShoppingmallAdministratorProductsSnapshotsSkusController } from "./controllers/shoppingMall/administrator/products/snapshots/skus/ShoppingmallAdministratorProductsSnapshotsSkusController";
import { ShoppingmallAdministratorRefund_request_snapshotsController } from "./controllers/shoppingMall/administrator/refund-request-snapshots/ShoppingmallAdministratorRefund_request_snapshotsController";
import { ShoppingmallAdministratorRequestsController } from "./controllers/shoppingMall/administrator/requests/ShoppingmallAdministratorRequestsController";
import { ShoppingmallAdministratorReviewsSnapshotsController } from "./controllers/shoppingMall/administrator/reviews/snapshots/ShoppingmallAdministratorReviewsSnapshotsController";
import { ShoppingmallAdministratorVariantsInventory_recordsController } from "./controllers/shoppingMall/administrator/variants/inventory-records/ShoppingmallAdministratorVariantsInventory_recordsController";
import { ShoppingmallAdministratorVariantsStockController } from "./controllers/shoppingMall/administrator/variants/stock/ShoppingmallAdministratorVariantsStockController";
import { ShoppingmallAuthAdministratorController } from "./controllers/shoppingMall/auth/administrator/ShoppingmallAuthAdministratorController";
import { ShoppingmallAuthCustomerController } from "./controllers/shoppingMall/auth/customer/ShoppingmallAuthCustomerController";
import { ShoppingmallAuthSellerController } from "./controllers/shoppingMall/auth/seller/ShoppingmallAuthSellerController";
import { ShoppingmallCategoriesController } from "./controllers/shoppingMall/categories/ShoppingmallCategoriesController";
import { ShoppingmallCustomerAddressesController } from "./controllers/shoppingMall/customer/addresses/ShoppingmallCustomerAddressesController";
import { ShoppingmallCustomerAddresses_defaultController } from "./controllers/shoppingMall/customer/addresses/default/ShoppingmallCustomerAddresses_defaultController";
import { ShoppingmallCustomerCancellation_request_snapshotsController } from "./controllers/shoppingMall/customer/cancellation-request-snapshots/ShoppingmallCustomerCancellation_request_snapshotsController";
import { ShoppingmallCustomerCancellation_requestsController } from "./controllers/shoppingMall/customer/cancellation-requests/ShoppingmallCustomerCancellation_requestsController";
import { ShoppingmallCustomerCartController } from "./controllers/shoppingMall/customer/cart/ShoppingmallCustomerCartController";
import { ShoppingmallCustomerCartItemsController } from "./controllers/shoppingMall/customer/cart/items/ShoppingmallCustomerCartItemsController";
import { ShoppingmallCustomerCheckoutController } from "./controllers/shoppingMall/customer/checkout/ShoppingmallCustomerCheckoutController";
import { ShoppingmallCustomerOrderitemsnapshotsController } from "./controllers/shoppingMall/customer/orderItemSnapshots/ShoppingmallCustomerOrderitemsnapshotsController";
import { ShoppingmallCustomerOrderitemsController } from "./controllers/shoppingMall/customer/orderItems/ShoppingmallCustomerOrderitemsController";
import { ShoppingmallCustomerOrdersController } from "./controllers/shoppingMall/customer/orders/ShoppingmallCustomerOrdersController";
import { ShoppingmallCustomerOrdersShipmentsController } from "./controllers/shoppingMall/customer/orders/shipments/ShoppingmallCustomerOrdersShipmentsController";
import { ShoppingmallCustomerProfileController } from "./controllers/shoppingMall/customer/profile/ShoppingmallCustomerProfileController";
import { ShoppingmallCustomerRefund_request_snapshotsController } from "./controllers/shoppingMall/customer/refund-request-snapshots/ShoppingmallCustomerRefund_request_snapshotsController";
import { ShoppingmallCustomerRefund_requestsController } from "./controllers/shoppingMall/customer/refund-requests/ShoppingmallCustomerRefund_requestsController";
import { ShoppingmallCustomerRequestsController } from "./controllers/shoppingMall/customer/requests/ShoppingmallCustomerRequestsController";
import { ShoppingmallCustomerReviewsController } from "./controllers/shoppingMall/customer/reviews/ShoppingmallCustomerReviewsController";
import { ShoppingmallCustomerReviewsSnapshotsController } from "./controllers/shoppingMall/customer/reviews/snapshots/ShoppingmallCustomerReviewsSnapshotsController";
import { ShoppingmallCustomerSessionsController } from "./controllers/shoppingMall/customer/sessions/ShoppingmallCustomerSessionsController";
import { ShoppingmallCustomerShipmentsDeliveryController } from "./controllers/shoppingMall/customer/shipments/delivery/ShoppingmallCustomerShipmentsDeliveryController";
import { ShoppingmallCustomerWishlistsController } from "./controllers/shoppingMall/customer/wishlists/ShoppingmallCustomerWishlistsController";
import { ShoppingmallCustomerWishlistsItemsController } from "./controllers/shoppingMall/customer/wishlists/items/ShoppingmallCustomerWishlistsItemsController";
import { ShoppingmallProductsController } from "./controllers/shoppingMall/products/ShoppingmallProductsController";
import { ShoppingmallProductsImagesController } from "./controllers/shoppingMall/products/images/ShoppingmallProductsImagesController";
import { ShoppingmallProductsReviewsController } from "./controllers/shoppingMall/products/reviews/ShoppingmallProductsReviewsController";
import { ShoppingmallProductsVariantsController } from "./controllers/shoppingMall/products/variants/ShoppingmallProductsVariantsController";
import { ShoppingmallReviewsController } from "./controllers/shoppingMall/reviews/ShoppingmallReviewsController";
import { ShoppingmallSellerCancellation_requestsController } from "./controllers/shoppingMall/seller/cancellation-requests/ShoppingmallSellerCancellation_requestsController";
import { ShoppingmallSellerDashboardController } from "./controllers/shoppingMall/seller/dashboard/ShoppingmallSellerDashboardController";
import { ShoppingmallSellerInventorySummaryController } from "./controllers/shoppingMall/seller/inventory/summary/ShoppingmallSellerInventorySummaryController";
import { ShoppingmallSellerProductsController } from "./controllers/shoppingMall/seller/products/ShoppingmallSellerProductsController";
import { ShoppingmallSellerProductsImagesController } from "./controllers/shoppingMall/seller/products/images/ShoppingmallSellerProductsImagesController";
import { ShoppingmallSellerProductsSnapshotsController } from "./controllers/shoppingMall/seller/products/snapshots/ShoppingmallSellerProductsSnapshotsController";
import { ShoppingmallSellerProductsSnapshotsSkusController } from "./controllers/shoppingMall/seller/products/snapshots/skus/ShoppingmallSellerProductsSnapshotsSkusController";
import { ShoppingmallSellerProductsVariantsController } from "./controllers/shoppingMall/seller/products/variants/ShoppingmallSellerProductsVariantsController";
import { ShoppingmallSellerRefund_request_snapshotsController } from "./controllers/shoppingMall/seller/refund-request-snapshots/ShoppingmallSellerRefund_request_snapshotsController";
import { ShoppingmallSellerRefund_request_statisticsController } from "./controllers/shoppingMall/seller/refund-request-statistics/ShoppingmallSellerRefund_request_statisticsController";
import { ShoppingmallSellerRefund_requestsController } from "./controllers/shoppingMall/seller/refund-requests/ShoppingmallSellerRefund_requestsController";
import { ShoppingmallSellerRequestsController } from "./controllers/shoppingMall/seller/requests/ShoppingmallSellerRequestsController";
import { ShoppingmallSellerShipmentsController } from "./controllers/shoppingMall/seller/shipments/ShoppingmallSellerShipmentsController";
import { ShoppingmallSellerVariantsInventory_recordsController } from "./controllers/shoppingMall/seller/variants/inventory-records/ShoppingmallSellerVariantsInventory_recordsController";
import { ShoppingmallSellerVariantsStockController } from "./controllers/shoppingMall/seller/variants/stock/ShoppingmallSellerVariantsStockController";
import { ShoppingmallSellersController } from "./controllers/shoppingMall/sellers/ShoppingmallSellersController";

@Module({
  controllers: [
    ShoppingmallAuthCustomerController,
    ShoppingmallAuthSellerController,
    ShoppingmallAuthAdministratorController,
    ShoppingmallAdministratorCustomersController,
    ShoppingmallCustomerProfileController,
    ShoppingmallCustomerSessionsController,
    ShoppingmallSellersController,
    ShoppingmallAdministratorAdministratorsController,
    ShoppingmallAdministratorPassword_resetsController,
    ShoppingmallAdministratorRequestsController,
    ShoppingmallCustomerRequestsController,
    ShoppingmallSellerRequestsController,
    ShoppingmallAdministratorCategoriesController,
    ShoppingmallCategoriesController,
    ShoppingmallProductsController,
    ShoppingmallSellerProductsController,
    ShoppingmallAdministratorProductsController,
    ShoppingmallProductsImagesController,
    ShoppingmallSellerProductsImagesController,
    ShoppingmallProductsVariantsController,
    ShoppingmallSellerProductsVariantsController,
    ShoppingmallSellerProductsSnapshotsController,
    ShoppingmallAdministratorProductsSnapshotsController,
    ShoppingmallSellerProductsSnapshotsSkusController,
    ShoppingmallAdministratorProductsSnapshotsSkusController,
    ShoppingmallSellerVariantsInventory_recordsController,
    ShoppingmallAdministratorVariantsInventory_recordsController,
    ShoppingmallCustomerCartController,
    ShoppingmallCustomerCartItemsController,
    ShoppingmallCustomerWishlistsController,
    ShoppingmallCustomerWishlistsItemsController,
    ShoppingmallCustomerOrdersController,
    ShoppingmallCustomerOrderitemsController,
    ShoppingmallCustomerOrderitemsnapshotsController,
    ShoppingmallSellerShipmentsController,
    ShoppingmallCustomerOrdersShipmentsController,
    ShoppingmallCustomerShipmentsDeliveryController,
    ShoppingmallCustomerCancellation_requestsController,
    ShoppingmallSellerCancellation_requestsController,
    ShoppingmallCustomerCancellation_request_snapshotsController,
    ShoppingmallCustomerRefund_requestsController,
    ShoppingmallSellerRefund_requestsController,
    ShoppingmallCustomerRefund_request_snapshotsController,
    ShoppingmallSellerRefund_request_snapshotsController,
    ShoppingmallAdministratorRefund_request_snapshotsController,
    ShoppingmallProductsReviewsController,
    ShoppingmallCustomerReviewsController,
    ShoppingmallReviewsController,
    ShoppingmallCustomerReviewsSnapshotsController,
    ShoppingmallAdministratorReviewsSnapshotsController,
    ShoppingmallCustomerAddressesController,
    ShoppingmallSellerDashboardController,
    ShoppingmallSellerVariantsStockController,
    ShoppingmallAdministratorVariantsStockController,
    ShoppingmallSellerInventorySummaryController,
    ShoppingmallCustomerCheckoutController,
    ShoppingmallAdministratorOrdersForce_cancelController,
    ShoppingmallAdministratorOrdersForce_refundController,
    ShoppingmallAdministratorOrderitemsForce_cancelController,
    ShoppingmallAdministratorOrderitemsForce_refundController,
    ShoppingmallSellerRefund_request_statisticsController,
    ShoppingmallCustomerAddresses_defaultController,
  ],
})
export class MyModule {}
