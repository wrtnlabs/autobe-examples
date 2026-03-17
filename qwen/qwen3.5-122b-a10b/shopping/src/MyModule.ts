import { Module } from "@nestjs/common";

import { EcommercemallAdminAdminsController } from "./controllers/ecommerceMall/admin/admins/EcommercemallAdminAdminsController";
import { EcommercemallAdminAnalyticsController } from "./controllers/ecommerceMall/admin/analytics/EcommercemallAdminAnalyticsController";
import { EcommercemallAdminAnalyticsCategoriesController } from "./controllers/ecommerceMall/admin/analytics/categories/EcommercemallAdminAnalyticsCategoriesController";
import { EcommercemallAdminCancellation_requestsPendingController } from "./controllers/ecommerceMall/admin/cancellation-requests/pending/EcommercemallAdminCancellation_requestsPendingController";
import { EcommercemallAdminCategoriesController } from "./controllers/ecommerceMall/admin/categories/EcommercemallAdminCategoriesController";
import { EcommercemallAdminCategory_snapshotsController } from "./controllers/ecommerceMall/admin/category-snapshots/EcommercemallAdminCategory_snapshotsController";
import { EcommercemallAdminCustomersController } from "./controllers/ecommerceMall/admin/customers/EcommercemallAdminCustomersController";
import { EcommercemallAdminCustomersOrdersController } from "./controllers/ecommerceMall/admin/customers/orders/EcommercemallAdminCustomersOrdersController";
import { EcommercemallAdminOrder_itemsCancelController } from "./controllers/ecommerceMall/admin/order-items/cancel/EcommercemallAdminOrder_itemsCancelController";
import { EcommercemallAdminOrder_itemsCancellation_requestsController } from "./controllers/ecommerceMall/admin/order-items/cancellation-requests/EcommercemallAdminOrder_itemsCancellation_requestsController";
import { EcommercemallAdminOrder_itemsRefund_requestsController } from "./controllers/ecommerceMall/admin/order-items/refund-requests/EcommercemallAdminOrder_itemsRefund_requestsController";
import { EcommercemallAdminOrder_itemsRefundController } from "./controllers/ecommerceMall/admin/order-items/refund/EcommercemallAdminOrder_itemsRefundController";
import { EcommercemallAdminOrdersController } from "./controllers/ecommerceMall/admin/orders/EcommercemallAdminOrdersController";
import { EcommercemallAdminOrdersForce_cancelController } from "./controllers/ecommerceMall/admin/orders/force-cancel/EcommercemallAdminOrdersForce_cancelController";
import { EcommercemallAdminOrdersForce_refundController } from "./controllers/ecommerceMall/admin/orders/force-refund/EcommercemallAdminOrdersForce_refundController";
import { EcommercemallAdminOrdersItemsForce_cancelController } from "./controllers/ecommerceMall/admin/orders/items/force-cancel/EcommercemallAdminOrdersItemsForce_cancelController";
import { EcommercemallAdminOrdersItemsForce_refundController } from "./controllers/ecommerceMall/admin/orders/items/force-refund/EcommercemallAdminOrdersItemsForce_refundController";
import { EcommercemallAdminProductsForce_deleteController } from "./controllers/ecommerceMall/admin/products/force-delete/EcommercemallAdminProductsForce_deleteController";
import { EcommercemallAdminRefund_requestsPendingController } from "./controllers/ecommerceMall/admin/refund-requests/pending/EcommercemallAdminRefund_requestsPendingController";
import { EcommercemallAdminReviewsSnapshotsController } from "./controllers/ecommerceMall/admin/reviews/snapshots/EcommercemallAdminReviewsSnapshotsController";
import { EcommercemallAdminSellersController } from "./controllers/ecommerceMall/admin/sellers/EcommercemallAdminSellersController";
import { EcommercemallAdminSellersApprovalsController } from "./controllers/ecommerceMall/admin/sellers/approvals/EcommercemallAdminSellersApprovalsController";
import { EcommercemallAdminShipmentsController } from "./controllers/ecommerceMall/admin/shipments/search/EcommercemallAdminShipmentsController";
import { EcommercemallAdminVariantsInventory_recordsController } from "./controllers/ecommerceMall/admin/variants/inventory-records/EcommercemallAdminVariantsInventory_recordsController";
import { EcommercemallAuthAdminController } from "./controllers/ecommerceMall/auth/admin/EcommercemallAuthAdminController";
import { EcommercemallAuthCustomerController } from "./controllers/ecommerceMall/auth/customer/EcommercemallAuthCustomerController";
import { EcommercemallAuthCustomerLoginController } from "./controllers/ecommerceMall/auth/customer/login/EcommercemallAuthCustomerLoginController";
import { EcommercemallAuthSellerController } from "./controllers/ecommerceMall/auth/seller/EcommercemallAuthSellerController";
import { EcommercemallAuthSellerLoginController } from "./controllers/ecommerceMall/auth/seller/login/EcommercemallAuthSellerLoginController";
import { EcommercemallCategoriesController } from "./controllers/ecommerceMall/categories/EcommercemallCategoriesController";
import { EcommercemallCategoriesProductsController } from "./controllers/ecommerceMall/categories/products/EcommercemallCategoriesProductsController";
import { EcommercemallCustomerAddressesController } from "./controllers/ecommerceMall/customer/addresses/EcommercemallCustomerAddressesController";
import { EcommercemallCustomerBulk_removeController } from "./controllers/ecommerceMall/customer/bulk-remove/EcommercemallCustomerBulk_removeController";
import { EcommercemallCustomerCart_itemsController } from "./controllers/ecommerceMall/customer/cart-items/EcommercemallCustomerCart_itemsController";
import { EcommercemallCustomerCartController } from "./controllers/ecommerceMall/customer/cart/EcommercemallCustomerCartController";
import { EcommercemallCustomerOrder_itemsCancellation_requestsController } from "./controllers/ecommerceMall/customer/order-items/cancellation-requests/EcommercemallCustomerOrder_itemsCancellation_requestsController";
import { EcommercemallCustomerOrder_itemsRefund_requestsController } from "./controllers/ecommerceMall/customer/order-items/refund-requests/EcommercemallCustomerOrder_itemsRefund_requestsController";
import { EcommercemallCustomerOrdersController } from "./controllers/ecommerceMall/customer/orders/EcommercemallCustomerOrdersController";
import { EcommercemallCustomerOrdersItemsController } from "./controllers/ecommerceMall/customer/orders/items/EcommercemallCustomerOrdersItemsController";
import { EcommercemallCustomerOrdersItemsSnapshotsController } from "./controllers/ecommerceMall/customer/orders/items/snapshots/EcommercemallCustomerOrdersItemsSnapshotsController";
import { EcommercemallCustomerOrdersShipmentsController } from "./controllers/ecommerceMall/customer/orders/shipments/EcommercemallCustomerOrdersShipmentsController";
import { EcommercemallCustomerProfileController } from "./controllers/ecommerceMall/customer/profile/EcommercemallCustomerProfileController";
import { EcommercemallCustomerReviewsController } from "./controllers/ecommerceMall/customer/reviews/EcommercemallCustomerReviewsController";
import { EcommercemallCustomerReviewsMyController } from "./controllers/ecommerceMall/customer/reviews/my/EcommercemallCustomerReviewsMyController";
import { EcommercemallCustomerReviewsMySnapshotsController } from "./controllers/ecommerceMall/customer/reviews/my/snapshots/EcommercemallCustomerReviewsMySnapshotsController";
import { EcommercemallCustomerReviewsSnapshotsController } from "./controllers/ecommerceMall/customer/reviews/snapshots/EcommercemallCustomerReviewsSnapshotsController";
import { EcommercemallCustomerSessionsController } from "./controllers/ecommerceMall/customer/sessions/EcommercemallCustomerSessionsController";
import { EcommercemallCustomerShipmentsConfirm_deliveryController } from "./controllers/ecommerceMall/customer/shipments/confirm-delivery/EcommercemallCustomerShipmentsConfirm_deliveryController";
import { EcommercemallCustomerWishlistsController } from "./controllers/ecommerceMall/customer/wishlists/EcommercemallCustomerWishlistsController";
import { EcommercemallProductsController } from "./controllers/ecommerceMall/products/EcommercemallProductsController";
import { EcommercemallProductsImagesController } from "./controllers/ecommerceMall/products/images/EcommercemallProductsImagesController";
import { EcommercemallProductsReviewsController } from "./controllers/ecommerceMall/products/reviews/EcommercemallProductsReviewsController";
import { EcommercemallProductsReviewsSummaryController } from "./controllers/ecommerceMall/products/reviews/summary/EcommercemallProductsReviewsSummaryController";
import { EcommercemallProductsSnapshotsController } from "./controllers/ecommerceMall/products/snapshots/EcommercemallProductsSnapshotsController";
import { EcommercemallProductsVariantsController } from "./controllers/ecommerceMall/products/variants/EcommercemallProductsVariantsController";
import { EcommercemallController } from "./controllers/ecommerceMall/search/EcommercemallController";
import { EcommercemallSellerAnalyticsSalesController } from "./controllers/ecommerceMall/seller/analytics/sales/EcommercemallSellerAnalyticsSalesController";
import { EcommercemallSellerController } from "./controllers/ecommerceMall/seller/dashboard/EcommercemallSellerController";
import { EcommercemallSeller_dashboardCancellation_requestsController } from "./controllers/ecommerceMall/seller/dashboard/cancellation-requests/EcommercemallSeller_dashboardCancellation_requestsController";
import { EcommercemallSeller_dashboardRefund_requestsController } from "./controllers/ecommerceMall/seller/dashboard/refund-requests/EcommercemallSeller_dashboardRefund_requestsController";
import { EcommercemallSellerInventorySummaryController } from "./controllers/ecommerceMall/seller/inventory/summary/EcommercemallSellerInventorySummaryController";
import { EcommercemallSellerOrder_itemsController } from "./controllers/ecommerceMall/seller/order-items/EcommercemallSellerOrder_itemsController";
import { EcommercemallSellerOrder_itemsCancellation_requestsController } from "./controllers/ecommerceMall/seller/order-items/cancellation-requests/EcommercemallSellerOrder_itemsCancellation_requestsController";
import { EcommercemallSellerOrder_itemsPending_shipmentsController } from "./controllers/ecommerceMall/seller/order-items/pending-shipments/EcommercemallSellerOrder_itemsPending_shipmentsController";
import { EcommercemallSellerOrder_itemsRefund_requestsController } from "./controllers/ecommerceMall/seller/order-items/refund-requests/EcommercemallSellerOrder_itemsRefund_requestsController";
import { EcommercemallSellerProductsController } from "./controllers/ecommerceMall/seller/products/EcommercemallSellerProductsController";
import { EcommercemallSellerProductsImagesController } from "./controllers/ecommerceMall/seller/products/images/EcommercemallSellerProductsImagesController";
import { EcommercemallSellerProductsVariantsController } from "./controllers/ecommerceMall/seller/products/variants/EcommercemallSellerProductsVariantsController";
import { EcommercemallSellerProfileSnapshotsController } from "./controllers/ecommerceMall/seller/profile/snapshots/EcommercemallSellerProfileSnapshotsController";
import { EcommercemallSellerShipmentsController } from "./controllers/ecommerceMall/seller/shipments/EcommercemallSellerShipmentsController";
import { EcommercemallSellerShipmentsNeeds_shippingController } from "./controllers/ecommerceMall/seller/shipments/needs-shipping/EcommercemallSellerShipmentsNeeds_shippingController";
import { EcommercemallSellerSnapshotsController } from "./controllers/ecommerceMall/seller/snapshots/EcommercemallSellerSnapshotsController";
import { EcommercemallSellerVariantsInventory_recordsController } from "./controllers/ecommerceMall/seller/variants/inventory-records/EcommercemallSellerVariantsInventory_recordsController";

@Module({
  controllers: [
    EcommercemallAuthCustomerController,
    EcommercemallAuthCustomerLoginController,
    EcommercemallAuthSellerController,
    EcommercemallAuthSellerLoginController,
    EcommercemallAuthAdminController,
    EcommercemallAdminCustomersController,
    EcommercemallCustomerProfileController,
    EcommercemallCustomerSessionsController,
    EcommercemallAdminSellersController,
    EcommercemallAdminAdminsController,
    EcommercemallSellerSnapshotsController,
    EcommercemallProductsController,
    EcommercemallSellerProductsController,
    EcommercemallProductsVariantsController,
    EcommercemallSellerProductsVariantsController,
    EcommercemallProductsImagesController,
    EcommercemallSellerProductsImagesController,
    EcommercemallProductsSnapshotsController,
    EcommercemallCategoriesController,
    EcommercemallAdminCategoriesController,
    EcommercemallAdminCategory_snapshotsController,
    EcommercemallCustomerOrdersController,
    EcommercemallCustomerOrdersItemsController,
    EcommercemallCustomerOrdersItemsSnapshotsController,
    EcommercemallSellerOrder_itemsController,
    EcommercemallSellerShipmentsController,
    EcommercemallCustomerOrdersShipmentsController,
    EcommercemallCustomerCart_itemsController,
    EcommercemallCustomerWishlistsController,
    EcommercemallCustomerReviewsController,
    EcommercemallProductsReviewsController,
    EcommercemallCustomerReviewsSnapshotsController,
    EcommercemallCustomerAddressesController,
    EcommercemallSellerVariantsInventory_recordsController,
    EcommercemallAdminVariantsInventory_recordsController,
    EcommercemallCustomerOrder_itemsCancellation_requestsController,
    EcommercemallSellerOrder_itemsCancellation_requestsController,
    EcommercemallAdminOrder_itemsCancellation_requestsController,
    EcommercemallCustomerOrder_itemsRefund_requestsController,
    EcommercemallSellerOrder_itemsRefund_requestsController,
    EcommercemallAdminOrder_itemsRefund_requestsController,
    EcommercemallAdminOrdersController,
    EcommercemallSellerController,
    EcommercemallSellerAnalyticsSalesController,
    EcommercemallSellerOrder_itemsPending_shipmentsController,
    EcommercemallSellerProfileSnapshotsController,
    EcommercemallController,
    EcommercemallAdminAnalyticsController,
    EcommercemallCategoriesProductsController,
    EcommercemallAdminAnalyticsCategoriesController,
    EcommercemallAdminOrdersItemsForce_cancelController,
    EcommercemallAdminOrdersForce_cancelController,
    EcommercemallAdminOrdersItemsForce_refundController,
    EcommercemallAdminOrdersForce_refundController,
    EcommercemallAdminCustomersOrdersController,
    EcommercemallSellerShipmentsNeeds_shippingController,
    EcommercemallAdminShipmentsController,
    EcommercemallCustomerShipmentsConfirm_deliveryController,
    EcommercemallCustomerCartController,
    EcommercemallCustomerBulk_removeController,
    EcommercemallProductsReviewsSummaryController,
    EcommercemallCustomerReviewsMyController,
    EcommercemallCustomerReviewsMySnapshotsController,
    EcommercemallAdminReviewsSnapshotsController,
    EcommercemallSellerInventorySummaryController,
    EcommercemallSeller_dashboardCancellation_requestsController,
    EcommercemallSeller_dashboardRefund_requestsController,
    EcommercemallAdminCancellation_requestsPendingController,
    EcommercemallAdminRefund_requestsPendingController,
    EcommercemallAdminSellersApprovalsController,
    EcommercemallAdminOrder_itemsCancelController,
    EcommercemallAdminOrder_itemsRefundController,
    EcommercemallAdminProductsForce_deleteController,
  ],
})
export class MyModule {}
