import { Module } from "@nestjs/common";

import { EcommercemallAdminAdmin_request_requestsController } from "./controllers/ecommerceMall/admin/admin-request-requests/EcommercemallAdminAdmin_request_requestsController";
import { EcommercemallAdminAdmin_request_snapshotsController } from "./controllers/ecommerceMall/admin/admin-request-snapshots/EcommercemallAdminAdmin_request_snapshotsController";
import { EcommercemallAdminAdmin_requestsController } from "./controllers/ecommerceMall/admin/admin-requests/EcommercemallAdminAdmin_requestsController";
import { EcommercemallAdminAdmin_requestsSnapshotsController } from "./controllers/ecommerceMall/admin/admin-requests/snapshots/EcommercemallAdminAdmin_requestsSnapshotsController";
import { EcommercemallAdminAdminsController } from "./controllers/ecommerceMall/admin/admins/EcommercemallAdminAdminsController";
import { EcommercemallAdminAudit_logsController } from "./controllers/ecommerceMall/admin/audit-logs/EcommercemallAdminAudit_logsController";
import { EcommercemallAdminAudit_trailsController } from "./controllers/ecommerceMall/admin/audit-trails/EcommercemallAdminAudit_trailsController";
import { EcommercemallAdminCategoriesController } from "./controllers/ecommerceMall/admin/categories/EcommercemallAdminCategoriesController";
import { EcommercemallAdminCategorysnapshotsController } from "./controllers/ecommerceMall/admin/categorySnapshots/EcommercemallAdminCategorysnapshotsController";
import { EcommercemallAdminCustomersController } from "./controllers/ecommerceMall/admin/customers/EcommercemallAdminCustomersController";
import { EcommercemallAdminObservabilityDashboardController } from "./controllers/ecommerceMall/admin/observability/dashboard/EcommercemallAdminObservabilityDashboardController";
import { EcommercemallAdminOrder_item_snapshotsController } from "./controllers/ecommerceMall/admin/order-item-snapshots/EcommercemallAdminOrder_item_snapshotsController";
import { EcommercemallAdminOrder_itemsController } from "./controllers/ecommerceMall/admin/order-items/EcommercemallAdminOrder_itemsController";
import { EcommercemallAdminOrderitemsnapshotsController } from "./controllers/ecommerceMall/admin/orderItemSnapshots/EcommercemallAdminOrderitemsnapshotsController";
import { EcommercemallAdminOrderitemsController } from "./controllers/ecommerceMall/admin/orderItems/EcommercemallAdminOrderitemsController";
import { EcommercemallAdminOrdersController } from "./controllers/ecommerceMall/admin/orders/EcommercemallAdminOrdersController";
import { EcommercemallAdminOrdersMetricsController } from "./controllers/ecommerceMall/admin/orders/metrics/EcommercemallAdminOrdersMetricsController";
import { EcommercemallAdminProduct_variantsStock_statusController } from "./controllers/ecommerceMall/admin/product-variants/stock-status/EcommercemallAdminProduct_variantsStock_statusController";
import { EcommercemallAdminSellersController } from "./controllers/ecommerceMall/admin/sellers/EcommercemallAdminSellersController";
import { EcommercemallAdminSellersSuspendController } from "./controllers/ecommerceMall/admin/sellers/suspend/EcommercemallAdminSellersSuspendController";
import { EcommercemallAdminShipmentitemsItemsController } from "./controllers/ecommerceMall/admin/shipmentItems/items/EcommercemallAdminShipmentitemsItemsController";
import { EcommercemallAdminShipmentsController } from "./controllers/ecommerceMall/admin/shipments/EcommercemallAdminShipmentsController";
import { EcommercemallAdminSnapshot_auditsController } from "./controllers/ecommerceMall/admin/snapshot-audits/EcommercemallAdminSnapshot_auditsController";
import { EcommercemallAuthAdminController } from "./controllers/ecommerceMall/auth/admin/EcommercemallAuthAdminController";
import { EcommercemallAuthCustomerController } from "./controllers/ecommerceMall/auth/customer/EcommercemallAuthCustomerController";
import { EcommercemallAuthSellerController } from "./controllers/ecommerceMall/auth/seller/EcommercemallAuthSellerController";
import { EcommercemallCategoriesController } from "./controllers/ecommerceMall/categories/EcommercemallCategoriesController";
import { EcommercemallCustomerAdmin_requestsController } from "./controllers/ecommerceMall/customer/admin-requests/EcommercemallCustomerAdmin_requestsController";
import { EcommercemallCustomerAnalyticsController } from "./controllers/ecommerceMall/customer/analytics/EcommercemallCustomerAnalyticsController";
import { EcommercemallCustomerCancellation_requestsController } from "./controllers/ecommerceMall/customer/cancellation-requests/EcommercemallCustomerCancellation_requestsController";
import { EcommercemallCustomerCartsController } from "./controllers/ecommerceMall/customer/carts/EcommercemallCustomerCartsController";
import { EcommercemallCustomerCartsCartitemsController } from "./controllers/ecommerceMall/customer/carts/cartItems/EcommercemallCustomerCartsCartitemsController";
import { EcommercemallCustomerOrder_item_snapshotsController } from "./controllers/ecommerceMall/customer/order-item-snapshots/EcommercemallCustomerOrder_item_snapshotsController";
import { EcommercemallCustomerOrder_itemsController } from "./controllers/ecommerceMall/customer/order-items/EcommercemallCustomerOrder_itemsController";
import { EcommercemallCustomerOrderitemsnapshotsController } from "./controllers/ecommerceMall/customer/orderItemSnapshots/EcommercemallCustomerOrderitemsnapshotsController";
import { EcommercemallCustomerOrderitemsController } from "./controllers/ecommerceMall/customer/orderItems/EcommercemallCustomerOrderitemsController";
import { EcommercemallCustomerOrdersController } from "./controllers/ecommerceMall/customer/orders/EcommercemallCustomerOrdersController";
import { EcommercemallCustomerProfileController } from "./controllers/ecommerceMall/customer/profile/EcommercemallCustomerProfileController";
import { EcommercemallCustomerRefund_requestsController } from "./controllers/ecommerceMall/customer/refund-requests/EcommercemallCustomerRefund_requestsController";
import { EcommercemallCustomerReviewsController } from "./controllers/ecommerceMall/customer/reviews/EcommercemallCustomerReviewsController";
import { EcommercemallCustomerReviewsDashboardController } from "./controllers/ecommerceMall/customer/reviews/dashboard/EcommercemallCustomerReviewsDashboardController";
import { EcommercemallCustomerSessionsController } from "./controllers/ecommerceMall/customer/sessions/EcommercemallCustomerSessionsController";
import { EcommercemallCustomerShipmentitemsItemsController } from "./controllers/ecommerceMall/customer/shipmentItems/items/EcommercemallCustomerShipmentitemsItemsController";
import { EcommercemallCustomerShipmentsController } from "./controllers/ecommerceMall/customer/shipments/EcommercemallCustomerShipmentsController";
import { EcommercemallCustomerWishlistsController } from "./controllers/ecommerceMall/customer/wishlists/EcommercemallCustomerWishlistsController";
import { EcommercemallProductsController } from "./controllers/ecommerceMall/products/EcommercemallProductsController";
import { EcommercemallProductsImagesController } from "./controllers/ecommerceMall/products/images/EcommercemallProductsImagesController";
import { EcommercemallProductsReviewsController } from "./controllers/ecommerceMall/products/reviews/EcommercemallProductsReviewsController";
import { EcommercemallProductsSnapshotsController } from "./controllers/ecommerceMall/products/snapshots/EcommercemallProductsSnapshotsController";
import { EcommercemallProductsVariant_snapshotsController } from "./controllers/ecommerceMall/products/variant-snapshots/EcommercemallProductsVariant_snapshotsController";
import { EcommercemallProductsVariantsController } from "./controllers/ecommerceMall/products/variants/EcommercemallProductsVariantsController";
import { EcommercemallReviewsController } from "./controllers/ecommerceMall/reviews/EcommercemallReviewsController";
import { EcommercemallSellerAdmin_requestsController } from "./controllers/ecommerceMall/seller/admin-requests/EcommercemallSellerAdmin_requestsController";
import { EcommercemallSellerAnalyticsSalesController } from "./controllers/ecommerceMall/seller/analytics/sales/EcommercemallSellerAnalyticsSalesController";
import { EcommercemallSellerAnalyticsShippingController } from "./controllers/ecommerceMall/seller/analytics/shipping/EcommercemallSellerAnalyticsShippingController";
import { EcommercemallSellerCancellationrequestsDashboardController } from "./controllers/ecommerceMall/seller/cancellationRequests/dashboard/EcommercemallSellerCancellationrequestsDashboardController";
import { EcommercemallSellerOrder_item_snapshotsController } from "./controllers/ecommerceMall/seller/order-item-snapshots/EcommercemallSellerOrder_item_snapshotsController";
import { EcommercemallSellerOrder_itemsController } from "./controllers/ecommerceMall/seller/order-items/EcommercemallSellerOrder_itemsController";
import { EcommercemallSellerOrderitemsnapshotsController } from "./controllers/ecommerceMall/seller/orderItemSnapshots/EcommercemallSellerOrderitemsnapshotsController";
import { EcommercemallSellerOrderitemsController } from "./controllers/ecommerceMall/seller/orderItems/EcommercemallSellerOrderitemsController";
import { EcommercemallSellerProduct_variantsStock_statusController } from "./controllers/ecommerceMall/seller/product-variants/stock-status/EcommercemallSellerProduct_variantsStock_statusController";
import { EcommercemallSellerProductsController } from "./controllers/ecommerceMall/seller/products/EcommercemallSellerProductsController";
import { EcommercemallSellerProductsImagesController } from "./controllers/ecommerceMall/seller/products/images/EcommercemallSellerProductsImagesController";
import { EcommercemallSellerProductsVariantsController } from "./controllers/ecommerceMall/seller/products/variants/EcommercemallSellerProductsVariantsController";
import { EcommercemallSellerRefundrequestsDashboardController } from "./controllers/ecommerceMall/seller/refundRequests/dashboard/EcommercemallSellerRefundrequestsDashboardController";
import { EcommercemallSellerShipmentitemsItemsController } from "./controllers/ecommerceMall/seller/shipmentItems/items/EcommercemallSellerShipmentitemsItemsController";
import { EcommercemallSellerShipmentsController } from "./controllers/ecommerceMall/seller/shipments/EcommercemallSellerShipmentsController";
import { EcommercemallSellerVariantsInventory_historyController } from "./controllers/ecommerceMall/seller/variants/inventory-history/EcommercemallSellerVariantsInventory_historyController";
import { EcommercemallSellerVariantsInventory_recordsController } from "./controllers/ecommerceMall/seller/variants/inventory-records/EcommercemallSellerVariantsInventory_recordsController";

@Module({
  controllers: [
    EcommercemallAuthCustomerController,
    EcommercemallAuthSellerController,
    EcommercemallAuthAdminController,
    EcommercemallAdminCustomersController,
    EcommercemallCustomerProfileController,
    EcommercemallCustomerSessionsController,
    EcommercemallAdminSellersController,
    EcommercemallAdminAdminsController,
    EcommercemallAdminAudit_logsController,
    EcommercemallCustomerWishlistsController,
    EcommercemallCustomerCartsController,
    EcommercemallCustomerCartsCartitemsController,
    EcommercemallCustomerOrdersController,
    EcommercemallAdminOrdersController,
    EcommercemallCustomerOrderitemsController,
    EcommercemallSellerOrderitemsController,
    EcommercemallAdminOrderitemsController,
    EcommercemallCustomerOrder_itemsController,
    EcommercemallSellerOrder_itemsController,
    EcommercemallAdminOrder_itemsController,
    EcommercemallCustomerShipmentsController,
    EcommercemallSellerShipmentsController,
    EcommercemallAdminShipmentsController,
    EcommercemallCustomerOrderitemsnapshotsController,
    EcommercemallSellerOrderitemsnapshotsController,
    EcommercemallAdminOrderitemsnapshotsController,
    EcommercemallCustomerOrder_item_snapshotsController,
    EcommercemallSellerOrder_item_snapshotsController,
    EcommercemallAdminOrder_item_snapshotsController,
    EcommercemallCustomerShipmentitemsItemsController,
    EcommercemallSellerShipmentitemsItemsController,
    EcommercemallAdminShipmentitemsItemsController,
    EcommercemallCustomerCancellation_requestsController,
    EcommercemallCustomerRefund_requestsController,
    EcommercemallReviewsController,
    EcommercemallCustomerReviewsController,
    EcommercemallSellerVariantsInventory_recordsController,
    EcommercemallCustomerAdmin_requestsController,
    EcommercemallSellerAdmin_requestsController,
    EcommercemallAdminAdmin_requestsController,
    EcommercemallAdminAdmin_request_snapshotsController,
    EcommercemallAdminSnapshot_auditsController,
    EcommercemallCategoriesController,
    EcommercemallAdminCategoriesController,
    EcommercemallAdminCategorysnapshotsController,
    EcommercemallProductsController,
    EcommercemallSellerProductsController,
    EcommercemallProductsVariantsController,
    EcommercemallSellerProductsVariantsController,
    EcommercemallProductsImagesController,
    EcommercemallSellerProductsImagesController,
    EcommercemallProductsSnapshotsController,
    EcommercemallProductsVariant_snapshotsController,
    EcommercemallAdminAdmin_request_requestsController,
    EcommercemallAdminSellersSuspendController,
    EcommercemallAdminObservabilityDashboardController,
    EcommercemallCustomerAnalyticsController,
    EcommercemallSellerAnalyticsSalesController,
    EcommercemallSellerAnalyticsShippingController,
    EcommercemallAdminOrdersMetricsController,
    EcommercemallCustomerReviewsDashboardController,
    EcommercemallSellerCancellationrequestsDashboardController,
    EcommercemallSellerRefundrequestsDashboardController,
    EcommercemallProductsReviewsController,
    EcommercemallSellerVariantsInventory_historyController,
    EcommercemallAdminAdmin_requestsSnapshotsController,
    EcommercemallAdminAudit_trailsController,
    EcommercemallSellerProduct_variantsStock_statusController,
    EcommercemallAdminProduct_variantsStock_statusController,
  ],
})
export class MyModule {}
