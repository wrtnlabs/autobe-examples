import { Module } from "@nestjs/common";

import { EcommercemallAdminAdmin_gradesController } from "./controllers/ecommerceMall/admin/admin-grades/EcommercemallAdminAdmin_gradesController";
import { EcommercemallAdminAdmin_requestsController } from "./controllers/ecommerceMall/admin/admin-requests/EcommercemallAdminAdmin_requestsController";
import { EcommercemallAdminAdmin_requestsCustomer_requestController } from "./controllers/ecommerceMall/admin/admin-requests/customer-request/EcommercemallAdminAdmin_requestsCustomer_requestController";
import { EcommercemallAdminAdmin_requestsSeller_requestController } from "./controllers/ecommerceMall/admin/admin-requests/seller-request/EcommercemallAdminAdmin_requestsSeller_requestController";
import { EcommercemallAdminAdmin_requestsSnapshotsController } from "./controllers/ecommerceMall/admin/admin-requests/snapshots/EcommercemallAdminAdmin_requestsSnapshotsController";
import { EcommercemallAdminAdminsController } from "./controllers/ecommerceMall/admin/admins/EcommercemallAdminAdminsController";
import { EcommercemallAdminAudit_logsController } from "./controllers/ecommerceMall/admin/audit-logs/EcommercemallAdminAudit_logsController";
import { EcommercemallAdminCategoriesController } from "./controllers/ecommerceMall/admin/categories/EcommercemallAdminCategoriesController";
import { EcommercemallAdminCustomersController } from "./controllers/ecommerceMall/admin/customers/EcommercemallAdminCustomersController";
import { EcommercemallAdminEmail_verificationsController } from "./controllers/ecommerceMall/admin/email-verifications/EcommercemallAdminEmail_verificationsController";
import { EcommercemallAdminObservabilityDashboardController } from "./controllers/ecommerceMall/admin/observability/dashboard/EcommercemallAdminObservabilityDashboardController";
import { EcommercemallAdminOrdersAnalyticsController } from "./controllers/ecommerceMall/admin/orders/analytics/EcommercemallAdminOrdersAnalyticsController";
import { EcommercemallAdminOrdersItemsStatus_historyController } from "./controllers/ecommerceMall/admin/orders/items/status-history/EcommercemallAdminOrdersItemsStatus_historyController";
import { EcommercemallAdminPassword_resetsController } from "./controllers/ecommerceMall/admin/password-resets/EcommercemallAdminPassword_resetsController";
import { EcommercemallAdminReviewsAnalyticsController } from "./controllers/ecommerceMall/admin/reviews/analytics/EcommercemallAdminReviewsAnalyticsController";
import { EcommercemallAdminSellersController } from "./controllers/ecommerceMall/admin/sellers/EcommercemallAdminSellersController";
import { EcommercemallAdminSessionsController } from "./controllers/ecommerceMall/admin/sessions/EcommercemallAdminSessionsController";
import { EcommercemallAdminSnapshot_auditsController } from "./controllers/ecommerceMall/admin/snapshot-audits/EcommercemallAdminSnapshot_auditsController";
import { EcommercemallAuthAdminController } from "./controllers/ecommerceMall/auth/admin/EcommercemallAuthAdminController";
import { EcommercemallAuthCustomerController } from "./controllers/ecommerceMall/auth/customer/EcommercemallAuthCustomerController";
import { EcommercemallAuthSellerController } from "./controllers/ecommerceMall/auth/seller/EcommercemallAuthSellerController";
import { EcommercemallCategoriesController } from "./controllers/ecommerceMall/categories/EcommercemallCategoriesController";
import { EcommercemallCategory_snapshotsController } from "./controllers/ecommerceMall/category-snapshots/EcommercemallCategory_snapshotsController";
import { EcommercemallCustomerAdmin_requestsController } from "./controllers/ecommerceMall/customer/admin-requests/EcommercemallCustomerAdmin_requestsController";
import { EcommercemallCustomerCancellation_requestsController } from "./controllers/ecommerceMall/customer/cancellation-requests/EcommercemallCustomerCancellation_requestsController";
import { EcommercemallCustomerCancellation_requestsStatusController } from "./controllers/ecommerceMall/customer/cancellation-requests/status/EcommercemallCustomerCancellation_requestsStatusController";
import { EcommercemallCustomerCartController } from "./controllers/ecommerceMall/customer/cart/summary/EcommercemallCustomerCartController";
import { EcommercemallCustomerCartsController } from "./controllers/ecommerceMall/customer/carts/EcommercemallCustomerCartsController";
import { EcommercemallCustomerCartsItemsController } from "./controllers/ecommerceMall/customer/carts/items/EcommercemallCustomerCartsItemsController";
import { EcommercemallCustomerEmail_verificationsController } from "./controllers/ecommerceMall/customer/email-verifications/EcommercemallCustomerEmail_verificationsController";
import { EcommercemallCustomerOrdersController } from "./controllers/ecommerceMall/customer/orders/EcommercemallCustomerOrdersController";
import { EcommercemallCustomerOrdersItemsController } from "./controllers/ecommerceMall/customer/orders/items/EcommercemallCustomerOrdersItemsController";
import { EcommercemallCustomerOrdersItemsStatus_historyController } from "./controllers/ecommerceMall/customer/orders/items/status-history/EcommercemallCustomerOrdersItemsStatus_historyController";
import { EcommercemallCustomerOrdersShipmentsController } from "./controllers/ecommerceMall/customer/orders/shipments/EcommercemallCustomerOrdersShipmentsController";
import { EcommercemallCustomerOrdersShipmentsItemsController } from "./controllers/ecommerceMall/customer/orders/shipments/items/EcommercemallCustomerOrdersShipmentsItemsController";
import { EcommercemallCustomerPassword_resetsController } from "./controllers/ecommerceMall/customer/password-resets/EcommercemallCustomerPassword_resetsController";
import { EcommercemallCustomerRefund_requestsController } from "./controllers/ecommerceMall/customer/refund-requests/EcommercemallCustomerRefund_requestsController";
import { EcommercemallCustomerRefund_requestsStatusController } from "./controllers/ecommerceMall/customer/refund-requests/status/EcommercemallCustomerRefund_requestsStatusController";
import { EcommercemallCustomerReviewsController } from "./controllers/ecommerceMall/customer/reviews/EcommercemallCustomerReviewsController";
import { EcommercemallCustomerSessionsController } from "./controllers/ecommerceMall/customer/sessions/EcommercemallCustomerSessionsController";
import { EcommercemallCustomerSnapshot_auditsController } from "./controllers/ecommerceMall/customer/snapshot-audits/EcommercemallCustomerSnapshot_auditsController";
import { EcommercemallCustomerWishlist_to_cartController } from "./controllers/ecommerceMall/customer/wishlist-to-cart/EcommercemallCustomerWishlist_to_cartController";
import { EcommercemallCustomerWishlistController } from "./controllers/ecommerceMall/customer/wishlist/EcommercemallCustomerWishlistController";
import { EcommercemallCustomersController } from "./controllers/ecommerceMall/customers/EcommercemallCustomersController";
import { EcommercemallProductsController } from "./controllers/ecommerceMall/products/EcommercemallProductsController";
import { EcommercemallProductsImagesController } from "./controllers/ecommerceMall/products/images/EcommercemallProductsImagesController";
import { EcommercemallProductsVariantsController } from "./controllers/ecommerceMall/products/variants/EcommercemallProductsVariantsController";
import { EcommercemallSellerEmail_verificationsController } from "./controllers/ecommerceMall/seller/email-verifications/EcommercemallSellerEmail_verificationsController";
import { EcommercemallSellerOrdersItemsStatus_historyController } from "./controllers/ecommerceMall/seller/orders/items/status-history/EcommercemallSellerOrdersItemsStatus_historyController";
import { EcommercemallSellerOrdersShipmentsController } from "./controllers/ecommerceMall/seller/orders/shipments/EcommercemallSellerOrdersShipmentsController";
import { EcommercemallSellerPassword_resetsController } from "./controllers/ecommerceMall/seller/password-resets/EcommercemallSellerPassword_resetsController";
import { EcommercemallSellerProductsController } from "./controllers/ecommerceMall/seller/products/EcommercemallSellerProductsController";
import { EcommercemallSellerProductsImagesController } from "./controllers/ecommerceMall/seller/products/images/EcommercemallSellerProductsImagesController";
import { EcommercemallSellerProductsVariantsController } from "./controllers/ecommerceMall/seller/products/variants/EcommercemallSellerProductsVariantsController";
import { EcommercemallSellerSessionsController } from "./controllers/ecommerceMall/seller/sessions/EcommercemallSellerSessionsController";
import { EcommercemallSellerSnapshot_auditsController } from "./controllers/ecommerceMall/seller/snapshot-audits/EcommercemallSellerSnapshot_auditsController";
import { EcommercemallSellerVariantsInventoryHistoryController } from "./controllers/ecommerceMall/seller/variants/inventory/history/EcommercemallSellerVariantsInventoryHistoryController";
import { EcommercemallSellerVariantsInventoryHistory_exportController } from "./controllers/ecommerceMall/seller/variants/inventory/history/export/EcommercemallSellerVariantsInventoryHistory_exportController";
import { EcommercemallSellerVariantsInventoryrecordsController } from "./controllers/ecommerceMall/seller/variants/inventoryRecords/EcommercemallSellerVariantsInventoryrecordsController";
import { EcommercemallSellersController } from "./controllers/ecommerceMall/sellers/EcommercemallSellersController";

@Module({
  controllers: [
    EcommercemallAuthCustomerController,
    EcommercemallAuthSellerController,
    EcommercemallAuthAdminController,
    EcommercemallAdminCustomersController,
    EcommercemallCustomersController,
    EcommercemallAdminSellersController,
    EcommercemallSellersController,
    EcommercemallAdminAdminsController,
    EcommercemallCustomerSessionsController,
    EcommercemallSellerSessionsController,
    EcommercemallAdminSessionsController,
    EcommercemallCustomerPassword_resetsController,
    EcommercemallSellerPassword_resetsController,
    EcommercemallAdminPassword_resetsController,
    EcommercemallCustomerEmail_verificationsController,
    EcommercemallSellerEmail_verificationsController,
    EcommercemallAdminEmail_verificationsController,
    EcommercemallAdminAudit_logsController,
    EcommercemallCustomerWishlistController,
    EcommercemallCustomerCartsController,
    EcommercemallCustomerCartsItemsController,
    EcommercemallCustomerOrdersController,
    EcommercemallCustomerOrdersItemsController,
    EcommercemallCustomerOrdersShipmentsController,
    EcommercemallSellerOrdersShipmentsController,
    EcommercemallCustomerOrdersShipmentsItemsController,
    EcommercemallCustomerCancellation_requestsController,
    EcommercemallCustomerRefund_requestsController,
    EcommercemallCustomerReviewsController,
    EcommercemallSellerVariantsInventoryrecordsController,
    EcommercemallAdminAdmin_requestsController,
    EcommercemallAdminAdmin_requestsSnapshotsController,
    EcommercemallAdminAdmin_requestsCustomer_requestController,
    EcommercemallAdminAdmin_requestsSeller_requestController,
    EcommercemallCustomerAdmin_requestsController,
    EcommercemallCategoriesController,
    EcommercemallAdminCategoriesController,
    EcommercemallCategory_snapshotsController,
    EcommercemallProductsController,
    EcommercemallSellerProductsController,
    EcommercemallProductsVariantsController,
    EcommercemallSellerProductsVariantsController,
    EcommercemallProductsImagesController,
    EcommercemallSellerProductsImagesController,
    EcommercemallCustomerSnapshot_auditsController,
    EcommercemallSellerSnapshot_auditsController,
    EcommercemallAdminSnapshot_auditsController,
    EcommercemallAdminObservabilityDashboardController,
    EcommercemallAdminAdmin_gradesController,
    EcommercemallCustomerCartController,
    EcommercemallCustomerWishlist_to_cartController,
    EcommercemallAdminOrdersAnalyticsController,
    EcommercemallCustomerOrdersItemsStatus_historyController,
    EcommercemallSellerOrdersItemsStatus_historyController,
    EcommercemallAdminOrdersItemsStatus_historyController,
    EcommercemallCustomerCancellation_requestsStatusController,
    EcommercemallCustomerRefund_requestsStatusController,
    EcommercemallAdminReviewsAnalyticsController,
    EcommercemallSellerVariantsInventoryHistoryController,
    EcommercemallSellerVariantsInventoryHistory_exportController,
  ],
})
export class MyModule {}
