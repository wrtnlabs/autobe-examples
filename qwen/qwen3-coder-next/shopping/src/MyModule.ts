import { Module } from "@nestjs/common";

import { ShoppingmallAdminAdminProductsBulk_deleteController } from "./controllers/shoppingMall/admin/admin/products/bulk-delete/ShoppingmallAdminAdminProductsBulk_deleteController";
import { ShoppingmallAdminAdminRequestsController } from "./controllers/shoppingMall/admin/admin/requests/ShoppingmallAdminAdminRequestsController";
import { ShoppingmallAdminAdminRequestsApproveController } from "./controllers/shoppingMall/admin/admin/requests/approve/ShoppingmallAdminAdminRequestsApproveController";
import { ShoppingmallAdminAdminSellersController } from "./controllers/shoppingMall/admin/admin/sellers/ShoppingmallAdminAdminSellersController";
import { ShoppingmallAdminAdministratorsController } from "./controllers/shoppingMall/admin/administrators/ShoppingmallAdminAdministratorsController";
import { ShoppingmallAdminAdminsController } from "./controllers/shoppingMall/admin/admins/ShoppingmallAdminAdminsController";
import { ShoppingmallAdminAnalyticsOrdersController } from "./controllers/shoppingMall/admin/analytics/orders/ShoppingmallAdminAnalyticsOrdersController";
import { ShoppingmallAdminAnalyticsProductsController } from "./controllers/shoppingMall/admin/analytics/products/ShoppingmallAdminAnalyticsProductsController";
import { ShoppingmallAdminAudit_logsController } from "./controllers/shoppingMall/admin/audit-logs/ShoppingmallAdminAudit_logsController";
import { ShoppingmallAdminCache_trackingsController } from "./controllers/shoppingMall/admin/cache-trackings/ShoppingmallAdminCache_trackingsController";
import { ShoppingmallAdminCarriersController } from "./controllers/shoppingMall/admin/carriers/ShoppingmallAdminCarriersController";
import { ShoppingmallAdminCarriersConfigsController } from "./controllers/shoppingMall/admin/carriers/configs/ShoppingmallAdminCarriersConfigsController";
import { ShoppingmallAdminCategoriesController } from "./controllers/shoppingMall/admin/categories/ShoppingmallAdminCategoriesController";
import { ShoppingmallAdminConfiguration_valuesController } from "./controllers/shoppingMall/admin/configuration-values/ShoppingmallAdminConfiguration_valuesController";
import { ShoppingmallAdminConfigurationsController } from "./controllers/shoppingMall/admin/configurations/ShoppingmallAdminConfigurationsController";
import { ShoppingmallAdminCustomersController } from "./controllers/shoppingMall/admin/customers/ShoppingmallAdminCustomersController";
import { ShoppingmallAdminCustomersBansController } from "./controllers/shoppingMall/admin/customers/bans/ShoppingmallAdminCustomersBansController";
import { ShoppingmallAdminCustomersUnbansController } from "./controllers/shoppingMall/admin/customers/unbans/ShoppingmallAdminCustomersUnbansController";
import { ShoppingmallAdminInventory_historyVariantsController } from "./controllers/shoppingMall/admin/inventory-history/variants/ShoppingmallAdminInventory_historyVariantsController";
import { ShoppingmallAdminMigrationsController } from "./controllers/shoppingMall/admin/migrations/ShoppingmallAdminMigrationsController";
import { ShoppingmallAdminOrder_itemsForce_cancelController } from "./controllers/shoppingMall/admin/order-items/force-cancel/ShoppingmallAdminOrder_itemsForce_cancelController";
import { ShoppingmallAdminOrder_itemsForce_refundController } from "./controllers/shoppingMall/admin/order-items/force-refund/ShoppingmallAdminOrder_itemsForce_refundController";
import { ShoppingmallAdminOrdersForce_actionsCancelController } from "./controllers/shoppingMall/admin/orders/force-actions/cancel/ShoppingmallAdminOrdersForce_actionsCancelController";
import { ShoppingmallAdminOrdersForce_actionsController } from "./controllers/shoppingMall/admin/orders/force-actions/refund/ShoppingmallAdminOrdersForce_actionsController";
import { ShoppingmallAdminOrdersItemsForce_actionsCancelController } from "./controllers/shoppingMall/admin/orders/items/force-actions/cancel/ShoppingmallAdminOrdersItemsForce_actionsCancelController";
import { ShoppingmallAdminOrdersItemsForce_actionsController } from "./controllers/shoppingMall/admin/orders/items/force-actions/refund/ShoppingmallAdminOrdersItemsForce_actionsController";
import { ShoppingmallAdminReference_dataController } from "./controllers/shoppingMall/admin/reference-data/ShoppingmallAdminReference_dataController";
import { ShoppingmallAdminRequestController } from "./controllers/shoppingMall/admin/request/ShoppingmallAdminRequestController";
import { ShoppingmallAdminSellersAccess_logsController } from "./controllers/shoppingMall/admin/sellers/access-logs/ShoppingmallAdminSellersAccess_logsController";
import { ShoppingmallAdminSellersApprovalsController } from "./controllers/shoppingMall/admin/sellers/approvals/ShoppingmallAdminSellersApprovalsController";
import { ShoppingmallAdminSellersExportsController } from "./controllers/shoppingMall/admin/sellers/exports/ShoppingmallAdminSellersExportsController";
import { ShoppingmallAdminSellersPending_approvalsController } from "./controllers/shoppingMall/admin/sellers/pending-approvals/ShoppingmallAdminSellersPending_approvalsController";
import { ShoppingmallAdminSellersSuspensionsController } from "./controllers/shoppingMall/admin/sellers/suspensions/ShoppingmallAdminSellersSuspensionsController";
import { ShoppingmallAdminStatisticsController } from "./controllers/shoppingMall/admin/statistics/ShoppingmallAdminStatisticsController";
import { ShoppingmallAdminsController } from "./controllers/shoppingMall/admins/ShoppingmallAdminsController";
import { ShoppingmallAuthAdminController } from "./controllers/shoppingMall/auth/admin/ShoppingmallAuthAdminController";
import { ShoppingmallAuthCustomerController } from "./controllers/shoppingMall/auth/customer/ShoppingmallAuthCustomerController";
import { ShoppingmallAuthSellerController } from "./controllers/shoppingMall/auth/seller/ShoppingmallAuthSellerController";
import { ShoppingmallCategoriesController } from "./controllers/shoppingMall/categories/ShoppingmallCategoriesController";
import { ShoppingmallCategoriesProductsController } from "./controllers/shoppingMall/categories/products/ShoppingmallCategoriesProductsController";
import { ShoppingmallCustomerAddressesController } from "./controllers/shoppingMall/customer/addresses/ShoppingmallCustomerAddressesController";
import { ShoppingmallCustomerAddresses_defaultController } from "./controllers/shoppingMall/customer/addresses/default/ShoppingmallCustomerAddresses_defaultController";
import { ShoppingmallCustomerCancel_requestsController } from "./controllers/shoppingMall/customer/cancel-requests/ShoppingmallCustomerCancel_requestsController";
import { ShoppingmallCustomerCancel_requestsStatus_logsController } from "./controllers/shoppingMall/customer/cancel-requests/status-logs/ShoppingmallCustomerCancel_requestsStatus_logsController";
import { ShoppingmallCustomerCartController } from "./controllers/shoppingMall/customer/cart/ShoppingmallCustomerCartController";
import { ShoppingmallCustomerCartItemsController } from "./controllers/shoppingMall/customer/cart/items/ShoppingmallCustomerCartItemsController";
import { ShoppingmallCustomerCartsController } from "./controllers/shoppingMall/customer/carts/ShoppingmallCustomerCartsController";
import { ShoppingmallCustomerCartsItemsController } from "./controllers/shoppingMall/customer/carts/items/ShoppingmallCustomerCartsItemsController";
import { ShoppingmallCustomerCustomersProfileController } from "./controllers/shoppingMall/customer/customers/profile/ShoppingmallCustomerCustomersProfileController";
import { ShoppingmallCustomerOrder_itemsCancel_requestController } from "./controllers/shoppingMall/customer/order-items/cancel-request/ShoppingmallCustomerOrder_itemsCancel_requestController";
import { ShoppingmallCustomerOrder_itemsRefund_requestController } from "./controllers/shoppingMall/customer/order-items/refund-request/ShoppingmallCustomerOrder_itemsRefund_requestController";
import { ShoppingmallCustomerOrder_itemsStatus_logsController } from "./controllers/shoppingMall/customer/order-items/status-logs/ShoppingmallCustomerOrder_itemsStatus_logsController";
import { ShoppingmallCustomerOrdersController } from "./controllers/shoppingMall/customer/orders/ShoppingmallCustomerOrdersController";
import { ShoppingmallCustomerOrdersHistoryController } from "./controllers/shoppingMall/customer/orders/history/ShoppingmallCustomerOrdersHistoryController";
import { ShoppingmallCustomerOrdersItemsController } from "./controllers/shoppingMall/customer/orders/items/ShoppingmallCustomerOrdersItemsController";
import { ShoppingmallCustomerOrdersStatus_logsController } from "./controllers/shoppingMall/customer/orders/status-logs/ShoppingmallCustomerOrdersStatus_logsController";
import { ShoppingmallCustomerPaymentsController } from "./controllers/shoppingMall/customer/payments/ShoppingmallCustomerPaymentsController";
import { ShoppingmallCustomerRefund_requestsController } from "./controllers/shoppingMall/customer/refund-requests/ShoppingmallCustomerRefund_requestsController";
import { ShoppingmallCustomerRefund_requestsStatus_logsController } from "./controllers/shoppingMall/customer/refund-requests/status-logs/ShoppingmallCustomerRefund_requestsStatus_logsController";
import { ShoppingmallCustomerReviewsController } from "./controllers/shoppingMall/customer/reviews/ShoppingmallCustomerReviewsController";
import { ShoppingmallCustomerSessionsController } from "./controllers/shoppingMall/customer/sessions/ShoppingmallCustomerSessionsController";
import { ShoppingmallCustomerShipmentsController } from "./controllers/shoppingMall/customer/shipments/ShoppingmallCustomerShipmentsController";
import { ShoppingmallCustomerShipmentsTrackingController } from "./controllers/shoppingMall/customer/shipments/tracking/ShoppingmallCustomerShipmentsTrackingController";
import { ShoppingmallCustomerController } from "./controllers/shoppingMall/customer/status/ShoppingmallCustomerController";
import { ShoppingmallCustomerWishlistController } from "./controllers/shoppingMall/customer/wishlist/ShoppingmallCustomerWishlistController";
import { ShoppingmallCustomerWishlistsController } from "./controllers/shoppingMall/customer/wishlists/ShoppingmallCustomerWishlistsController";
import { ShoppingmallCustomersController } from "./controllers/shoppingMall/customers/ShoppingmallCustomersController";
import { ShoppingmallEmail_verificationsController } from "./controllers/shoppingMall/email-verifications/ShoppingmallEmail_verificationsController";
import { ShoppingmallPassword_resetsController } from "./controllers/shoppingMall/password-resets/ShoppingmallPassword_resetsController";
import { ShoppingmallProductsController } from "./controllers/shoppingMall/products/ShoppingmallProductsController";
import { ShoppingmallSearchProductsController } from "./controllers/shoppingMall/search/products/ShoppingmallSearchProductsController";
import { ShoppingmallSellerAnalyticsProductsController } from "./controllers/shoppingMall/seller/analytics/products/ShoppingmallSellerAnalyticsProductsController";
import { ShoppingmallSellerAnalyticsSalesController } from "./controllers/shoppingMall/seller/analytics/sales/ShoppingmallSellerAnalyticsSalesController";
import { ShoppingmallSellerCancel_requestsApprovalController } from "./controllers/shoppingMall/seller/cancel-requests/approval/ShoppingmallSellerCancel_requestsApprovalController";
import { ShoppingmallSellerCancel_requestsRejectionController } from "./controllers/shoppingMall/seller/cancel-requests/rejection/ShoppingmallSellerCancel_requestsRejectionController";
import { ShoppingmallSellerCancellation_requestsController } from "./controllers/shoppingMall/seller/cancellation-requests/ShoppingmallSellerCancellation_requestsController";
import { ShoppingmallSellerDashboardController } from "./controllers/shoppingMall/seller/dashboard/ShoppingmallSellerDashboardController";
import { ShoppingmallSellerInventory_historiesController } from "./controllers/shoppingMall/seller/inventory-histories/ShoppingmallSellerInventory_historiesController";
import { ShoppingmallSellerInventory_historiesAdjustmentController } from "./controllers/shoppingMall/seller/inventory-histories/adjustment/ShoppingmallSellerInventory_historiesAdjustmentController";
import { ShoppingmallSellerInventory_historyController } from "./controllers/shoppingMall/seller/inventory-history/ShoppingmallSellerInventory_historyController";
import { ShoppingmallSellerInventory_historyVariantsController } from "./controllers/shoppingMall/seller/inventory-history/variants/ShoppingmallSellerInventory_historyVariantsController";
import { ShoppingmallSellerInventoryAddController } from "./controllers/shoppingMall/seller/inventory/add/ShoppingmallSellerInventoryAddController";
import { ShoppingmallSellerInventoryAdjustController } from "./controllers/shoppingMall/seller/inventory/adjust/ShoppingmallSellerInventoryAdjustController";
import { ShoppingmallSellerInventoryHistoryController } from "./controllers/shoppingMall/seller/inventory/history/ShoppingmallSellerInventoryHistoryController";
import { ShoppingmallSellerInventoryController } from "./controllers/shoppingMall/seller/inventory/restock/ShoppingmallSellerInventoryController";
import { ShoppingmallSellerOrdersItemsController } from "./controllers/shoppingMall/seller/orders/items/ShoppingmallSellerOrdersItemsController";
import { ShoppingmallSellerPayment_accountController } from "./controllers/shoppingMall/seller/payment-account/ShoppingmallSellerPayment_accountController";
import { ShoppingmallSellerProductsController } from "./controllers/shoppingMall/seller/products/ShoppingmallSellerProductsController";
import { ShoppingmallSellerProductsImagesController } from "./controllers/shoppingMall/seller/products/images/ShoppingmallSellerProductsImagesController";
import { ShoppingmallSellerProductsImages_reorderController } from "./controllers/shoppingMall/seller/products/images/reorder/ShoppingmallSellerProductsImages_reorderController";
import { ShoppingmallSellerProductsSnapshotsController } from "./controllers/shoppingMall/seller/products/snapshots/ShoppingmallSellerProductsSnapshotsController";
import { ShoppingmallSellerProductsVariantsController } from "./controllers/shoppingMall/seller/products/variants/ShoppingmallSellerProductsVariantsController";
import { ShoppingmallSellerRefund_requestsController } from "./controllers/shoppingMall/seller/refund-requests/ShoppingmallSellerRefund_requestsController";
import { ShoppingmallSellerRefund_requestsApprovalController } from "./controllers/shoppingMall/seller/refund-requests/approval/ShoppingmallSellerRefund_requestsApprovalController";
import { ShoppingmallSellerRefund_requestsApproveController } from "./controllers/shoppingMall/seller/refund-requests/approve/ShoppingmallSellerRefund_requestsApproveController";
import { ShoppingmallSellerRefund_requestsRejectionController } from "./controllers/shoppingMall/seller/refund-requests/rejection/ShoppingmallSellerRefund_requestsRejectionController";
import { ShoppingmallSellerSellersProductsController } from "./controllers/shoppingMall/seller/sellers/products/ShoppingmallSellerSellersProductsController";
import { ShoppingmallSellerSellersProductsVariantsController } from "./controllers/shoppingMall/seller/sellers/products/variants/ShoppingmallSellerSellersProductsVariantsController";
import { ShoppingmallSellerSettingsController } from "./controllers/shoppingMall/seller/settings/ShoppingmallSellerSettingsController";
import { ShoppingmallSellerShipmentsController } from "./controllers/shoppingMall/seller/shipments/ShoppingmallSellerShipmentsController";
import { ShoppingmallSellerShipmentsAuto_confirmationsController } from "./controllers/shoppingMall/seller/shipments/auto-confirmations/ShoppingmallSellerShipmentsAuto_confirmationsController";
import { ShoppingmallSellerShipmentsItemsController } from "./controllers/shoppingMall/seller/shipments/items/ShoppingmallSellerShipmentsItemsController";
import { ShoppingmallSellerShipmentsStatusController } from "./controllers/shoppingMall/seller/shipments/status/ShoppingmallSellerShipmentsStatusController";
import { ShoppingmallSellerShipmentsTrackingController } from "./controllers/shoppingMall/seller/shipments/tracking/ShoppingmallSellerShipmentsTrackingController";
import { ShoppingmallSellerStockController } from "./controllers/shoppingMall/seller/stock/ShoppingmallSellerStockController";
import { ShoppingmallSellerVariant_stocksController } from "./controllers/shoppingMall/seller/variant-stocks/ShoppingmallSellerVariant_stocksController";
import { ShoppingmallSellerVariantsController } from "./controllers/shoppingMall/seller/variants/ShoppingmallSellerVariantsController";
import { ShoppingmallSellerVariantsAdd_inventoryController } from "./controllers/shoppingMall/seller/variants/add-inventory/ShoppingmallSellerVariantsAdd_inventoryController";
import { ShoppingmallSellerVariantsAdjust_inventoryController } from "./controllers/shoppingMall/seller/variants/adjust-inventory/ShoppingmallSellerVariantsAdjust_inventoryController";
import { ShoppingmallSellerVariantsInventory_historyController } from "./controllers/shoppingMall/seller/variants/inventory-history/ShoppingmallSellerVariantsInventory_historyController";
import { ShoppingmallSellersController } from "./controllers/shoppingMall/sellers/ShoppingmallSellersController";
import { ShoppingmallSellersProfileController } from "./controllers/shoppingMall/sellers/profile/ShoppingmallSellersProfileController";
import { ShoppingmallSellersSettingsController } from "./controllers/shoppingMall/sellers/settings/ShoppingmallSellersSettingsController";

@Module({
  controllers: [
    ShoppingmallAuthCustomerController,
    ShoppingmallAuthSellerController,
    ShoppingmallAuthAdminController,
    ShoppingmallCustomerCustomersProfileController,
    ShoppingmallCustomerAddressesController,
    ShoppingmallCustomerAddresses_defaultController,
    ShoppingmallCustomerCartsController,
    ShoppingmallCustomerCartsItemsController,
    ShoppingmallCustomerWishlistsController,
    ShoppingmallProductsController,
    ShoppingmallCategoriesController,
    ShoppingmallCategoriesProductsController,
    ShoppingmallSellersController,
    ShoppingmallSellersProfileController,
    ShoppingmallSellersSettingsController,
    ShoppingmallSellerSettingsController,
    ShoppingmallSellerProductsController,
    ShoppingmallSellerProductsImagesController,
    ShoppingmallSellerProductsVariantsController,
    ShoppingmallSellerInventory_historyController,
    ShoppingmallSellerInventoryAddController,
    ShoppingmallSellerInventoryAdjustController,
    ShoppingmallSellerStockController,
    ShoppingmallSellerOrdersItemsController,
    ShoppingmallSellerShipmentsController,
    ShoppingmallSellerCancellation_requestsController,
    ShoppingmallSellerRefund_requestsController,
    ShoppingmallSellerRefund_requestsApproveController,
    ShoppingmallSellerPayment_accountController,
    ShoppingmallSellerDashboardController,
    ShoppingmallCustomerOrdersController,
    ShoppingmallCustomerOrdersItemsController,
    ShoppingmallCustomerOrder_itemsCancel_requestController,
    ShoppingmallCustomerCancel_requestsController,
    ShoppingmallSellerCancel_requestsApprovalController,
    ShoppingmallSellerCancel_requestsRejectionController,
    ShoppingmallAdminOrder_itemsForce_cancelController,
    ShoppingmallCustomerOrder_itemsRefund_requestController,
    ShoppingmallCustomerRefund_requestsController,
    ShoppingmallSellerRefund_requestsApprovalController,
    ShoppingmallSellerRefund_requestsRejectionController,
    ShoppingmallAdminOrder_itemsForce_refundController,
    ShoppingmallCustomerPaymentsController,
    ShoppingmallCustomerOrdersStatus_logsController,
    ShoppingmallCustomerOrder_itemsStatus_logsController,
    ShoppingmallCustomerCancel_requestsStatus_logsController,
    ShoppingmallCustomerRefund_requestsStatus_logsController,
    ShoppingmallCustomerShipmentsController,
    ShoppingmallAdminCarriersConfigsController,
    ShoppingmallSellerShipmentsItemsController,
    ShoppingmallSellerShipmentsAuto_confirmationsController,
    ShoppingmallAdminCarriersController,
    ShoppingmallCustomerReviewsController,
    ShoppingmallSellerProductsImages_reorderController,
    ShoppingmallAdminCategoriesController,
    ShoppingmallSellerVariantsInventory_historyController,
    ShoppingmallSellerVariantsAdd_inventoryController,
    ShoppingmallSellerVariantsAdjust_inventoryController,
    ShoppingmallSellerProductsSnapshotsController,
    ShoppingmallSellerVariantsController,
    ShoppingmallCustomerCartController,
    ShoppingmallCustomerCartItemsController,
    ShoppingmallCustomerWishlistController,
    ShoppingmallAdminCustomersController,
    ShoppingmallAdminAdminsController,
    ShoppingmallCustomerSessionsController,
    ShoppingmallPassword_resetsController,
    ShoppingmallEmail_verificationsController,
    ShoppingmallCustomersController,
    ShoppingmallAdminsController,
    ShoppingmallAdminAudit_logsController,
    ShoppingmallAdminConfigurationsController,
    ShoppingmallAdminReference_dataController,
    ShoppingmallAdminMigrationsController,
    ShoppingmallAdminCache_trackingsController,
    ShoppingmallAdminConfiguration_valuesController,
    ShoppingmallAdminAdministratorsController,
    ShoppingmallAdminSellersPending_approvalsController,
    ShoppingmallAdminSellersApprovalsController,
    ShoppingmallAdminSellersSuspensionsController,
    ShoppingmallAdminOrdersItemsForce_actionsCancelController,
    ShoppingmallAdminOrdersItemsForce_actionsController,
    ShoppingmallAdminOrdersForce_actionsCancelController,
    ShoppingmallAdminOrdersForce_actionsController,
    ShoppingmallAdminCustomersBansController,
    ShoppingmallAdminCustomersUnbansController,
    ShoppingmallAdminSellersAccess_logsController,
    ShoppingmallAdminSellersExportsController,
    ShoppingmallSellerVariant_stocksController,
    ShoppingmallSellerSellersProductsVariantsController,
    ShoppingmallSellerSellersProductsController,
    ShoppingmallAdminAdminSellersController,
    ShoppingmallSellerInventory_historiesController,
    ShoppingmallSellerInventory_historiesAdjustmentController,
    ShoppingmallCustomerOrdersHistoryController,
    ShoppingmallAdminAnalyticsOrdersController,
    ShoppingmallSellerShipmentsStatusController,
    ShoppingmallCustomerShipmentsTrackingController,
    ShoppingmallSellerShipmentsTrackingController,
    ShoppingmallSellerInventory_historyVariantsController,
    ShoppingmallAdminInventory_historyVariantsController,
    ShoppingmallSellerAnalyticsProductsController,
    ShoppingmallAdminAnalyticsProductsController,
    ShoppingmallSellerAnalyticsSalesController,
    ShoppingmallAdminStatisticsController,
    ShoppingmallAdminAdminProductsBulk_deleteController,
    ShoppingmallSearchProductsController,
    ShoppingmallCustomerController,
    ShoppingmallAdminRequestController,
    ShoppingmallAdminAdminRequestsController,
    ShoppingmallAdminAdminRequestsApproveController,
    ShoppingmallSellerInventoryHistoryController,
    ShoppingmallSellerInventoryController,
  ],
})
export class MyModule {}
