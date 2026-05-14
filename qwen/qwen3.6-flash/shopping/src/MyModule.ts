import { Module } from "@nestjs/common";

import { EcommercemallAdminAdminsController } from "./controllers/ecommerceMall/admin/admins/EcommercemallAdminAdminsController";
import { EcommercemallAdminBansController } from "./controllers/ecommerceMall/admin/bans/EcommercemallAdminBansController";
import { EcommercemallAdminBansCustomer_mappingController } from "./controllers/ecommerceMall/admin/bans/customer-mapping/EcommercemallAdminBansCustomer_mappingController";
import { EcommercemallAdminBansSeller_mappingController } from "./controllers/ecommerceMall/admin/bans/seller-mapping/EcommercemallAdminBansSeller_mappingController";
import { EcommercemallAdminCancellation_requestsSnapshotsController } from "./controllers/ecommerceMall/admin/cancellation-requests/snapshots/EcommercemallAdminCancellation_requestsSnapshotsController";
import { EcommercemallAdminCategoriesController } from "./controllers/ecommerceMall/admin/categories/EcommercemallAdminCategoriesController";
import { EcommercemallAdminCustomersController } from "./controllers/ecommerceMall/admin/customers/EcommercemallAdminCustomersController";
import { EcommercemallAdminInventory_recordsController } from "./controllers/ecommerceMall/admin/inventory-records/EcommercemallAdminInventory_recordsController";
import { EcommercemallAdminOrdersController } from "./controllers/ecommerceMall/admin/orders/EcommercemallAdminOrdersController";
import { EcommercemallAdminOrdersForce_cancelController } from "./controllers/ecommerceMall/admin/orders/force-cancel/EcommercemallAdminOrdersForce_cancelController";
import { EcommercemallAdminOrdersOrder_itemsController } from "./controllers/ecommerceMall/admin/orders/order-items/EcommercemallAdminOrdersOrder_itemsController";
import { EcommercemallAdminOrdersOrder_itemsSnapshotsController } from "./controllers/ecommerceMall/admin/orders/order-items/snapshots/EcommercemallAdminOrdersOrder_itemsSnapshotsController";
import { EcommercemallAdminOrdersOrderitemsController } from "./controllers/ecommerceMall/admin/orders/orderItems/EcommercemallAdminOrdersOrderitemsController";
import { EcommercemallAdminRole_requestsController } from "./controllers/ecommerceMall/admin/role-requests/EcommercemallAdminRole_requestsController";
import { EcommercemallAdminRolerequestsController } from "./controllers/ecommerceMall/admin/roleRequests/EcommercemallAdminRolerequestsController";
import { EcommercemallAdminSellersApproval_historiesController } from "./controllers/ecommerceMall/admin/sellers/approval-histories/EcommercemallAdminSellersApproval_historiesController";
import { EcommercemallAdminSellersApproval_reviewsController } from "./controllers/ecommerceMall/admin/sellers/approval-reviews/EcommercemallAdminSellersApproval_reviewsController";
import { EcommercemallAdminSellersApprovalsController } from "./controllers/ecommerceMall/admin/sellers/approvals/EcommercemallAdminSellersApprovalsController";
import { EcommercemallAdminSellersMetricsController } from "./controllers/ecommerceMall/admin/sellers/metrics/EcommercemallAdminSellersMetricsController";
import { EcommercemallAdminSellersProfile_snapshotsController } from "./controllers/ecommerceMall/admin/sellers/profile-snapshots/EcommercemallAdminSellersProfile_snapshotsController";
import { EcommercemallAdminSellersRequestsController } from "./controllers/ecommerceMall/admin/sellers/requests/EcommercemallAdminSellersRequestsController";
import { EcommercemallAdminShop_categoriesController } from "./controllers/ecommerceMall/admin/shop-categories/EcommercemallAdminShop_categoriesController";
import { EcommercemallAdminSnapshotsController } from "./controllers/ecommerceMall/admin/snapshots/EcommercemallAdminSnapshotsController";
import { EcommercemallAdminUserbansController } from "./controllers/ecommerceMall/admin/userBans/EcommercemallAdminUserbansController";
import { EcommercemallAdminUsersController } from "./controllers/ecommerceMall/admin/users/EcommercemallAdminUsersController";
import { EcommercemallAuthAdminController } from "./controllers/ecommerceMall/auth/admin/EcommercemallAuthAdminController";
import { EcommercemallAuthCustomerController } from "./controllers/ecommerceMall/auth/customer/EcommercemallAuthCustomerController";
import { EcommercemallAuthSellerController } from "./controllers/ecommerceMall/auth/seller/EcommercemallAuthSellerController";
import { EcommercemallCategoriesController } from "./controllers/ecommerceMall/categories/EcommercemallCategoriesController";
import { EcommercemallCustomerAddressesController } from "./controllers/ecommerceMall/customer/addresses/EcommercemallCustomerAddressesController";
import { EcommercemallCustomerAddressesSet_defaultController } from "./controllers/ecommerceMall/customer/addresses/set-default/EcommercemallCustomerAddressesSet_defaultController";
import { EcommercemallCustomerCancellation_requestsController } from "./controllers/ecommerceMall/customer/cancellation-requests/EcommercemallCustomerCancellation_requestsController";
import { EcommercemallCustomerCancellation_requestsSnapshotsController } from "./controllers/ecommerceMall/customer/cancellation-requests/snapshots/EcommercemallCustomerCancellation_requestsSnapshotsController";
import { EcommercemallCustomerCart_itemsController } from "./controllers/ecommerceMall/customer/cart-items/EcommercemallCustomerCart_itemsController";
import { EcommercemallCustomerCategoriesTreeController } from "./controllers/ecommerceMall/customer/categories/tree/EcommercemallCustomerCategoriesTreeController";
import { EcommercemallCustomerEmail_verificationsController } from "./controllers/ecommerceMall/customer/email-verifications/EcommercemallCustomerEmail_verificationsController";
import { EcommercemallCustomerOrder_itemsCancellation_requestsController } from "./controllers/ecommerceMall/customer/order-items/cancellation-requests/EcommercemallCustomerOrder_itemsCancellation_requestsController";
import { EcommercemallCustomerOrder_itemsRefund_requestsController } from "./controllers/ecommerceMall/customer/order-items/refund-requests/EcommercemallCustomerOrder_itemsRefund_requestsController";
import { EcommercemallCustomerOrdersController } from "./controllers/ecommerceMall/customer/orders/EcommercemallCustomerOrdersController";
import { EcommercemallCustomerOrdersOrder_itemsController } from "./controllers/ecommerceMall/customer/orders/order-items/EcommercemallCustomerOrdersOrder_itemsController";
import { EcommercemallCustomerOrdersOrder_itemsSnapshotsController } from "./controllers/ecommerceMall/customer/orders/order-items/snapshots/EcommercemallCustomerOrdersOrder_itemsSnapshotsController";
import { EcommercemallCustomerOrdersOrderitemsController } from "./controllers/ecommerceMall/customer/orders/orderItems/EcommercemallCustomerOrdersOrderitemsController";
import { EcommercemallCustomerOrdersShipmentsController } from "./controllers/ecommerceMall/customer/orders/shipments/EcommercemallCustomerOrdersShipmentsController";
import { EcommercemallCustomerOrdersShipmentsConfirm_deliveryController } from "./controllers/ecommerceMall/customer/orders/shipments/confirm-delivery/EcommercemallCustomerOrdersShipmentsConfirm_deliveryController";
import { EcommercemallCustomerPassword_resetsController } from "./controllers/ecommerceMall/customer/password-resets/EcommercemallCustomerPassword_resetsController";
import { EcommercemallCustomerProductsReviewsController } from "./controllers/ecommerceMall/customer/products/reviews/EcommercemallCustomerProductsReviewsController";
import { EcommercemallCustomerProductsSearchController } from "./controllers/ecommerceMall/customer/products/search/EcommercemallCustomerProductsSearchController";
import { EcommercemallCustomerProductsVariantsStock_statusController } from "./controllers/ecommerceMall/customer/products/variants/stock-status/EcommercemallCustomerProductsVariantsStock_statusController";
import { EcommercemallCustomerProfileController } from "./controllers/ecommerceMall/customer/profile/EcommercemallCustomerProfileController";
import { EcommercemallCustomerRefund_requestsController } from "./controllers/ecommerceMall/customer/refund-requests/EcommercemallCustomerRefund_requestsController";
import { EcommercemallCustomerReviewsController } from "./controllers/ecommerceMall/customer/reviews/EcommercemallCustomerReviewsController";
import { EcommercemallCustomerSessionsController } from "./controllers/ecommerceMall/customer/sessions/EcommercemallCustomerSessionsController";
import { EcommercemallCustomerWishlist_itemsController } from "./controllers/ecommerceMall/customer/wishlist-items/EcommercemallCustomerWishlist_itemsController";
import { EcommercemallCustomerWishlistsController } from "./controllers/ecommerceMall/customer/wishlists/EcommercemallCustomerWishlistsController";
import { EcommercemallProductsController } from "./controllers/ecommerceMall/products/EcommercemallProductsController";
import { EcommercemallProductsReviewsController } from "./controllers/ecommerceMall/products/reviews/EcommercemallProductsReviewsController";
import { EcommercemallProductsVariantsController } from "./controllers/ecommerceMall/products/variants/EcommercemallProductsVariantsController";
import { EcommercemallSellerAccountController } from "./controllers/ecommerceMall/seller/account/EcommercemallSellerAccountController";
import { EcommercemallSellerCancellation_requestsController } from "./controllers/ecommerceMall/seller/cancellation-requests/EcommercemallSellerCancellation_requestsController";
import { EcommercemallSellerCancellation_requestsReviewController } from "./controllers/ecommerceMall/seller/cancellation-requests/review/EcommercemallSellerCancellation_requestsReviewController";
import { EcommercemallSellerCancellation_requestsSnapshotsController } from "./controllers/ecommerceMall/seller/cancellation-requests/snapshots/EcommercemallSellerCancellation_requestsSnapshotsController";
import { EcommercemallSellerCancellation_requestsStatusController } from "./controllers/ecommerceMall/seller/cancellation-requests/status/EcommercemallSellerCancellation_requestsStatusController";
import { EcommercemallSellerDashboardController } from "./controllers/ecommerceMall/seller/dashboard/EcommercemallSellerDashboardController";
import { EcommercemallSellerInventory_recordsController } from "./controllers/ecommerceMall/seller/inventory-records/EcommercemallSellerInventory_recordsController";
import { EcommercemallSellerOrder_itemsController } from "./controllers/ecommerceMall/seller/order-items/EcommercemallSellerOrder_itemsController";
import { EcommercemallSellerOrdersItemsController } from "./controllers/ecommerceMall/seller/orders/items/EcommercemallSellerOrdersItemsController";
import { EcommercemallSellerOrdersOrder_itemsController } from "./controllers/ecommerceMall/seller/orders/order-items/EcommercemallSellerOrdersOrder_itemsController";
import { EcommercemallSellerProductsController } from "./controllers/ecommerceMall/seller/products/EcommercemallSellerProductsController";
import { EcommercemallSellerProductsImagesController } from "./controllers/ecommerceMall/seller/products/images/EcommercemallSellerProductsImagesController";
import { EcommercemallSellerProductsVariantsController } from "./controllers/ecommerceMall/seller/products/variants/EcommercemallSellerProductsVariantsController";
import { EcommercemallSellerProfileController } from "./controllers/ecommerceMall/seller/profile/EcommercemallSellerProfileController";
import { EcommercemallSellerRefund_requestsController } from "./controllers/ecommerceMall/seller/refund-requests/EcommercemallSellerRefund_requestsController";
import { EcommercemallSellerRefund_requests_reviewController } from "./controllers/ecommerceMall/seller/refund-requests/review/EcommercemallSellerRefund_requests_reviewController";
import { EcommercemallSellerRefund_requestsStatusController } from "./controllers/ecommerceMall/seller/refund-requests/status/EcommercemallSellerRefund_requestsStatusController";
import { EcommercemallSellerSellersApproval_historiesController } from "./controllers/ecommerceMall/seller/sellers/approval-histories/EcommercemallSellerSellersApproval_historiesController";
import { EcommercemallSellerSellersApproval_reviewsController } from "./controllers/ecommerceMall/seller/sellers/approval-reviews/EcommercemallSellerSellersApproval_reviewsController";
import { EcommercemallSellerSellersApprovalsController } from "./controllers/ecommerceMall/seller/sellers/approvals/EcommercemallSellerSellersApprovalsController";
import { EcommercemallSellerSellersProfile_snapshotsController } from "./controllers/ecommerceMall/seller/sellers/profile-snapshots/EcommercemallSellerSellersProfile_snapshotsController";
import { EcommercemallSellerShipmentsController } from "./controllers/ecommerceMall/seller/shipments/EcommercemallSellerShipmentsController";
import { EcommercemallSellerShipmentsItemsController } from "./controllers/ecommerceMall/seller/shipments/items/EcommercemallSellerShipmentsItemsController";
import { EcommercemallSellerStatusController } from "./controllers/ecommerceMall/seller/status/EcommercemallSellerStatusController";
import { EcommercemallSellerStorefrontController } from "./controllers/ecommerceMall/seller/storefront/EcommercemallSellerStorefrontController";
import { EcommercemallSellersController } from "./controllers/ecommerceMall/sellers/EcommercemallSellersController";
import { EcommercemallSellersProfileController } from "./controllers/ecommerceMall/sellers/profile/EcommercemallSellersProfileController";
import { EcommercemallShop_categoriesController } from "./controllers/ecommerceMall/shop-categories/EcommercemallShop_categoriesController";

@Module({
  controllers: [
    EcommercemallAuthCustomerController,
    EcommercemallAuthSellerController,
    EcommercemallAuthAdminController,
    EcommercemallAdminCustomersController,
    EcommercemallCustomerProfileController,
    EcommercemallSellersController,
    EcommercemallAdminAdminsController,
    EcommercemallCustomerSessionsController,
    EcommercemallCustomerPassword_resetsController,
    EcommercemallCustomerEmail_verificationsController,
    EcommercemallCategoriesController,
    EcommercemallAdminCategoriesController,
    EcommercemallShop_categoriesController,
    EcommercemallAdminShop_categoriesController,
    EcommercemallProductsController,
    EcommercemallSellerProductsController,
    EcommercemallSellerProductsVariantsController,
    EcommercemallProductsVariantsController,
    EcommercemallSellerProductsImagesController,
    EcommercemallAdminSnapshotsController,
    EcommercemallSellerProfileController,
    EcommercemallSellersProfileController,
    EcommercemallSellerSellersProfile_snapshotsController,
    EcommercemallAdminSellersProfile_snapshotsController,
    EcommercemallAdminSellersApprovalsController,
    EcommercemallSellerSellersApprovalsController,
    EcommercemallAdminSellersApproval_reviewsController,
    EcommercemallSellerSellersApproval_reviewsController,
    EcommercemallAdminSellersApproval_historiesController,
    EcommercemallSellerSellersApproval_historiesController,
    EcommercemallCustomerCart_itemsController,
    EcommercemallCustomerWishlistsController,
    EcommercemallCustomerWishlist_itemsController,
    EcommercemallProductsReviewsController,
    EcommercemallCustomerProductsReviewsController,
    EcommercemallCustomerReviewsController,
    EcommercemallCustomerOrdersController,
    EcommercemallAdminOrdersController,
    EcommercemallCustomerOrdersOrder_itemsController,
    EcommercemallAdminOrdersOrder_itemsController,
    EcommercemallCustomerOrdersOrderitemsController,
    EcommercemallAdminOrdersOrderitemsController,
    EcommercemallSellerOrdersOrder_itemsController,
    EcommercemallCustomerOrdersOrder_itemsSnapshotsController,
    EcommercemallAdminOrdersOrder_itemsSnapshotsController,
    EcommercemallSellerInventory_recordsController,
    EcommercemallAdminInventory_recordsController,
    EcommercemallCustomerAddressesController,
    EcommercemallSellerShipmentsController,
    EcommercemallSellerShipmentsItemsController,
    EcommercemallCustomerCancellation_requestsController,
    EcommercemallCustomerOrder_itemsCancellation_requestsController,
    EcommercemallCustomerCancellation_requestsSnapshotsController,
    EcommercemallSellerCancellation_requestsSnapshotsController,
    EcommercemallAdminCancellation_requestsSnapshotsController,
    EcommercemallSellerCancellation_requestsController,
    EcommercemallCustomerRefund_requestsController,
    EcommercemallCustomerOrder_itemsRefund_requestsController,
    EcommercemallSellerRefund_requestsController,
    EcommercemallAdminRole_requestsController,
    EcommercemallAdminRolerequestsController,
    EcommercemallAdminBansController,
    EcommercemallAdminBansCustomer_mappingController,
    EcommercemallAdminBansSeller_mappingController,
    EcommercemallCustomerProductsSearchController,
    EcommercemallCustomerCategoriesTreeController,
    EcommercemallCustomerProductsVariantsStock_statusController,
    EcommercemallSellerDashboardController,
    EcommercemallSellerStatusController,
    EcommercemallSellerStorefrontController,
    EcommercemallSellerAccountController,
    EcommercemallAdminSellersRequestsController,
    EcommercemallAdminSellersMetricsController,
    EcommercemallCustomerOrdersShipmentsConfirm_deliveryController,
    EcommercemallAdminOrdersForce_cancelController,
    EcommercemallSellerOrder_itemsController,
    EcommercemallSellerCancellation_requestsStatusController,
    EcommercemallSellerRefund_requestsStatusController,
    EcommercemallCustomerOrdersShipmentsController,
    EcommercemallSellerOrdersItemsController,
    EcommercemallCustomerAddressesSet_defaultController,
    EcommercemallSellerCancellation_requestsReviewController,
    EcommercemallSellerRefund_requests_reviewController,
    EcommercemallAdminUserbansController,
    EcommercemallAdminUsersController,
  ],
})
export class MyModule {}
