import { Module } from "@nestjs/common";

import { ShoppingmallAdministratorAdminCategoriesController } from "./controllers/shoppingMall/administrator/admin/categories/ShoppingmallAdministratorAdminCategoriesController";
import { ShoppingmallAdministratorAdministrator_requestsController } from "./controllers/shoppingMall/administrator/administrator-requests/ShoppingmallAdministratorAdministrator_requestsController";
import { ShoppingmallAdministratorAdministratorsController } from "./controllers/shoppingMall/administrator/administrators/ShoppingmallAdministratorAdministratorsController";
import { ShoppingmallAdministratorCancellation_request_snapshotsController } from "./controllers/shoppingMall/administrator/cancellation-request-snapshots/ShoppingmallAdministratorCancellation_request_snapshotsController";
import { ShoppingmallAdministratorCancellation_requestsController } from "./controllers/shoppingMall/administrator/cancellation-requests/ShoppingmallAdministratorCancellation_requestsController";
import { ShoppingmallAdministratorCategoriesController } from "./controllers/shoppingMall/administrator/categories/ShoppingmallAdministratorCategoriesController";
import { ShoppingmallAdministratorCategoriesSubcategoriesController } from "./controllers/shoppingMall/administrator/categories/subcategories/ShoppingmallAdministratorCategoriesSubcategoriesController";
import { ShoppingmallAdministratorCustomersController } from "./controllers/shoppingMall/administrator/customers/ShoppingmallAdministratorCustomersController";
import { ShoppingmallAdministratorRefund_request_snapshotsController } from "./controllers/shoppingMall/administrator/refund-request-snapshots/ShoppingmallAdministratorRefund_request_snapshotsController";
import { ShoppingmallAdministratorReviewsSnapshotsController } from "./controllers/shoppingMall/administrator/reviews/snapshots/ShoppingmallAdministratorReviewsSnapshotsController";
import { ShoppingmallAdministratorSellerCancellation_requestsController } from "./controllers/shoppingMall/administrator/seller/cancellation-requests/ShoppingmallAdministratorSellerCancellation_requestsController";
import { ShoppingmallAdministratorVariantsInventoryController } from "./controllers/shoppingMall/administrator/variants/inventory/ShoppingmallAdministratorVariantsInventoryController";
import { ShoppingmallAuthAdministratorController } from "./controllers/shoppingMall/auth/administrator/ShoppingmallAuthAdministratorController";
import { ShoppingmallAuthCustomerController } from "./controllers/shoppingMall/auth/customer/ShoppingmallAuthCustomerController";
import { ShoppingmallAuthSellerController } from "./controllers/shoppingMall/auth/seller/ShoppingmallAuthSellerController";
import { ShoppingmallCategoriesController } from "./controllers/shoppingMall/categories/ShoppingmallCategoriesController";
import { ShoppingmallCategoriesSubcategoriesController } from "./controllers/shoppingMall/categories/subcategories/ShoppingmallCategoriesSubcategoriesController";
import { ShoppingmallCustomerAddressesController } from "./controllers/shoppingMall/customer/addresses/ShoppingmallCustomerAddressesController";
import { ShoppingmallCustomerAddresses_defaultController } from "./controllers/shoppingMall/customer/addresses/default/ShoppingmallCustomerAddresses_defaultController";
import { ShoppingmallCustomerAdminOrdersController } from "./controllers/shoppingMall/customer/admin/orders/ShoppingmallCustomerAdminOrdersController";
import { ShoppingmallCustomerCancellation_request_snapshotsController } from "./controllers/shoppingMall/customer/cancellation-request-snapshots/ShoppingmallCustomerCancellation_request_snapshotsController";
import { ShoppingmallCustomerCancellation_requestsController } from "./controllers/shoppingMall/customer/cancellation-requests/ShoppingmallCustomerCancellation_requestsController";
import { ShoppingmallCustomerCartsController } from "./controllers/shoppingMall/customer/carts/ShoppingmallCustomerCartsController";
import { ShoppingmallCustomerCartsItemsController } from "./controllers/shoppingMall/customer/carts/items/ShoppingmallCustomerCartsItemsController";
import { ShoppingmallCustomerCheckoutController } from "./controllers/shoppingMall/customer/checkout/ShoppingmallCustomerCheckoutController";
import { ShoppingmallCustomerCustomersCartItemsController } from "./controllers/shoppingMall/customer/customers/cart/items/ShoppingmallCustomerCustomersCartItemsController";
import { ShoppingmallCustomerCustomersOrdersItemsCancellation_requestController } from "./controllers/shoppingMall/customer/customers/orders/items/cancellation-request/ShoppingmallCustomerCustomersOrdersItemsCancellation_requestController";
import { ShoppingmallCustomerOrdersController } from "./controllers/shoppingMall/customer/orders/ShoppingmallCustomerOrdersController";
import { ShoppingmallCustomerOrdersItemsController } from "./controllers/shoppingMall/customer/orders/items/ShoppingmallCustomerOrdersItemsController";
import { ShoppingmallCustomerOrdersItemsSnapshotController } from "./controllers/shoppingMall/customer/orders/items/snapshot/ShoppingmallCustomerOrdersItemsSnapshotController";
import { ShoppingmallCustomerOrdersShipmentsController } from "./controllers/shoppingMall/customer/orders/shipments/ShoppingmallCustomerOrdersShipmentsController";
import { ShoppingmallCustomerProfileController } from "./controllers/shoppingMall/customer/profile/ShoppingmallCustomerProfileController";
import { ShoppingmallCustomerRefund_requestsController } from "./controllers/shoppingMall/customer/refund-requests/ShoppingmallCustomerRefund_requestsController";
import { ShoppingmallCustomerRefund_requestsSnapshotsController } from "./controllers/shoppingMall/customer/refund-requests/snapshots/ShoppingmallCustomerRefund_requestsSnapshotsController";
import { ShoppingmallCustomerReviewsController } from "./controllers/shoppingMall/customer/reviews/ShoppingmallCustomerReviewsController";
import { ShoppingmallCustomerReviewsSnapshotsController } from "./controllers/shoppingMall/customer/reviews/snapshots/ShoppingmallCustomerReviewsSnapshotsController";
import { ShoppingmallCustomerSellerCancellation_requestsController } from "./controllers/shoppingMall/customer/seller/cancellation-requests/ShoppingmallCustomerSellerCancellation_requestsController";
import { ShoppingmallCustomerSellersController } from "./controllers/shoppingMall/customer/sellers/ShoppingmallCustomerSellersController";
import { ShoppingmallCustomerSessionsController } from "./controllers/shoppingMall/customer/sessions/ShoppingmallCustomerSessionsController";
import { ShoppingmallCustomerShipmentsConfirm_deliveryController } from "./controllers/shoppingMall/customer/shipments/confirm-delivery/ShoppingmallCustomerShipmentsConfirm_deliveryController";
import { ShoppingmallCustomerWishlistsController } from "./controllers/shoppingMall/customer/wishlists/ShoppingmallCustomerWishlistsController";
import { ShoppingmallCustomerWishlistsItemsController } from "./controllers/shoppingMall/customer/wishlists/items/ShoppingmallCustomerWishlistsItemsController";
import { ShoppingmallProductsController } from "./controllers/shoppingMall/products/ShoppingmallProductsController";
import { ShoppingmallProductsImagesController } from "./controllers/shoppingMall/products/images/ShoppingmallProductsImagesController";
import { ShoppingmallProductsReview_statsController } from "./controllers/shoppingMall/products/review-stats/ShoppingmallProductsReview_statsController";
import { ShoppingmallProductsSearchController } from "./controllers/shoppingMall/products/search/ShoppingmallProductsSearchController";
import { ShoppingmallProductsSnapshotsController } from "./controllers/shoppingMall/products/snapshots/ShoppingmallProductsSnapshotsController";
import { ShoppingmallProductsVariantsController } from "./controllers/shoppingMall/products/variants/ShoppingmallProductsVariantsController";
import { ShoppingmallReviewsController } from "./controllers/shoppingMall/reviews/ShoppingmallReviewsController";
import { ShoppingmallSellerCancellation_request_snapshotsController } from "./controllers/shoppingMall/seller/cancellation-request-snapshots/ShoppingmallSellerCancellation_request_snapshotsController";
import { ShoppingmallSellerCancellation_requestsController } from "./controllers/shoppingMall/seller/cancellation-requests/ShoppingmallSellerCancellation_requestsController";
import { ShoppingmallSellerCustomersProfileController } from "./controllers/shoppingMall/seller/customers/profile/ShoppingmallSellerCustomersProfileController";
import { ShoppingmallSellerDashboardController } from "./controllers/shoppingMall/seller/dashboard/ShoppingmallSellerDashboardController";
import { ShoppingmallSellerOrder_itemsController } from "./controllers/shoppingMall/seller/order-items/ShoppingmallSellerOrder_itemsController";
import { ShoppingmallSellerOrderitemsController } from "./controllers/shoppingMall/seller/orderItems/ShoppingmallSellerOrderitemsController";
import { ShoppingmallSellerPasswordController } from "./controllers/shoppingMall/seller/password/ShoppingmallSellerPasswordController";
import { ShoppingmallSellerProductsController } from "./controllers/shoppingMall/seller/products/ShoppingmallSellerProductsController";
import { ShoppingmallSellerProductsImagesController } from "./controllers/shoppingMall/seller/products/images/ShoppingmallSellerProductsImagesController";
import { ShoppingmallSellerProductsVariantsController } from "./controllers/shoppingMall/seller/products/variants/ShoppingmallSellerProductsVariantsController";
import { ShoppingmallSellerRefund_requestsController } from "./controllers/shoppingMall/seller/refund-requests/ShoppingmallSellerRefund_requestsController";
import { ShoppingmallSellerController } from "./controllers/shoppingMall/seller/resubmit/ShoppingmallSellerController";
import { ShoppingmallSellerSellerCancellation_requestsController } from "./controllers/shoppingMall/seller/seller/cancellation-requests/ShoppingmallSellerSellerCancellation_requestsController";
import { ShoppingmallSellerSellerProductsController } from "./controllers/shoppingMall/seller/seller/products/ShoppingmallSellerSellerProductsController";
import { ShoppingmallSellerSellerProductsVariantsController } from "./controllers/shoppingMall/seller/seller/products/variants/ShoppingmallSellerSellerProductsVariantsController";
import { ShoppingmallSellerSellerShipmentsController } from "./controllers/shoppingMall/seller/seller/shipments/ShoppingmallSellerSellerShipmentsController";
import { ShoppingmallSellerSellersApproval_statusController } from "./controllers/shoppingMall/seller/sellers/approval-status/ShoppingmallSellerSellersApproval_statusController";
import { ShoppingmallSellerShipmentsController } from "./controllers/shoppingMall/seller/shipments/ShoppingmallSellerShipmentsController";
import { ShoppingmallSellerVariantsInventoryController } from "./controllers/shoppingMall/seller/variants/inventory/ShoppingmallSellerVariantsInventoryController";

@Module({
  controllers: [
    ShoppingmallAuthCustomerController,
    ShoppingmallAuthSellerController,
    ShoppingmallAuthAdministratorController,
    ShoppingmallAdministratorCustomersController,
    ShoppingmallCustomerProfileController,
    ShoppingmallCustomerSessionsController,
    ShoppingmallCustomerSellersController,
    ShoppingmallSellerPasswordController,
    ShoppingmallSellerCustomersProfileController,
    ShoppingmallAdministratorAdministratorsController,
    ShoppingmallCategoriesController,
    ShoppingmallCategoriesSubcategoriesController,
    ShoppingmallAdministratorCategoriesController,
    ShoppingmallAdministratorCategoriesSubcategoriesController,
    ShoppingmallAdministratorAdminCategoriesController,
    ShoppingmallProductsController,
    ShoppingmallSellerSellerProductsController,
    ShoppingmallSellerProductsController,
    ShoppingmallProductsImagesController,
    ShoppingmallSellerProductsImagesController,
    ShoppingmallProductsVariantsController,
    ShoppingmallSellerProductsVariantsController,
    ShoppingmallSellerSellerProductsVariantsController,
    ShoppingmallProductsSnapshotsController,
    ShoppingmallSellerVariantsInventoryController,
    ShoppingmallAdministratorVariantsInventoryController,
    ShoppingmallCustomerCartsController,
    ShoppingmallCustomerCustomersCartItemsController,
    ShoppingmallCustomerCartsItemsController,
    ShoppingmallCustomerWishlistsController,
    ShoppingmallCustomerWishlistsItemsController,
    ShoppingmallCustomerAdminOrdersController,
    ShoppingmallCustomerOrdersController,
    ShoppingmallCustomerOrdersItemsController,
    ShoppingmallCustomerOrdersItemsSnapshotController,
    ShoppingmallSellerOrder_itemsController,
    ShoppingmallSellerOrderitemsController,
    ShoppingmallSellerShipmentsController,
    ShoppingmallSellerSellerShipmentsController,
    ShoppingmallCustomerOrdersShipmentsController,
    ShoppingmallCustomerSellerCancellation_requestsController,
    ShoppingmallSellerSellerCancellation_requestsController,
    ShoppingmallAdministratorSellerCancellation_requestsController,
    ShoppingmallCustomerCustomersOrdersItemsCancellation_requestController,
    ShoppingmallCustomerCancellation_requestsController,
    ShoppingmallSellerCancellation_requestsController,
    ShoppingmallAdministratorCancellation_requestsController,
    ShoppingmallCustomerCancellation_request_snapshotsController,
    ShoppingmallSellerCancellation_request_snapshotsController,
    ShoppingmallAdministratorCancellation_request_snapshotsController,
    ShoppingmallCustomerRefund_requestsController,
    ShoppingmallCustomerRefund_requestsSnapshotsController,
    ShoppingmallAdministratorRefund_request_snapshotsController,
    ShoppingmallReviewsController,
    ShoppingmallCustomerReviewsController,
    ShoppingmallCustomerReviewsSnapshotsController,
    ShoppingmallAdministratorReviewsSnapshotsController,
    ShoppingmallCustomerAddressesController,
    ShoppingmallCustomerAddresses_defaultController,
    ShoppingmallSellerController,
    ShoppingmallSellerSellersApproval_statusController,
    ShoppingmallSellerDashboardController,
    ShoppingmallAdministratorAdministrator_requestsController,
    ShoppingmallProductsSearchController,
    ShoppingmallCustomerCheckoutController,
    ShoppingmallCustomerShipmentsConfirm_deliveryController,
    ShoppingmallSellerRefund_requestsController,
    ShoppingmallProductsReview_statsController,
  ],
})
export class MyModule {}
