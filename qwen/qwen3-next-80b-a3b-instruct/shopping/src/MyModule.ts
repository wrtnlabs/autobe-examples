import { Module } from "@nestjs/common";

import { ShoppingmallAdminAdmin_actionsController } from "./controllers/shoppingMall/admin/admin-actions/ShoppingmallAdminAdmin_actionsController";
import { ShoppingmallAdminAdmin_actionsReportController } from "./controllers/shoppingMall/admin/admin-actions/report/ShoppingmallAdminAdmin_actionsReportController";
import { ShoppingmallAdminAdminAnalyticsInventoryController } from "./controllers/shoppingMall/admin/admin/analytics/inventory/ShoppingmallAdminAdminAnalyticsInventoryController";
import { ShoppingmallAdminAdminAnalyticsVariantsController } from "./controllers/shoppingMall/admin/admin/analytics/variants/ShoppingmallAdminAdminAnalyticsVariantsController";
import { ShoppingmallAdminAdminRequestsController } from "./controllers/shoppingMall/admin/admin/requests/ShoppingmallAdminAdminRequestsController";
import { ShoppingmallAdminOrder_statusController } from "./controllers/shoppingMall/admin/order-status/ShoppingmallAdminOrder_statusController";
import { ShoppingmallAdminReset_requestController } from "./controllers/shoppingMall/admin/reset-request/ShoppingmallAdminReset_requestController";
import { ShoppingmallAdminResetController } from "./controllers/shoppingMall/admin/reset/ShoppingmallAdminResetController";
import { ShoppingmallAdminRevenueController } from "./controllers/shoppingMall/admin/revenue/ShoppingmallAdminRevenueController";
import { ShoppingmallAdminSalesController } from "./controllers/shoppingMall/admin/sales/ShoppingmallAdminSalesController";
import { ShoppingmallAdminSellersProfile_snapshotsController } from "./controllers/shoppingMall/admin/sellers/profile-snapshots/ShoppingmallAdminSellersProfile_snapshotsController";
import { ShoppingmallAdminSessionsController } from "./controllers/shoppingMall/admin/sessions/ShoppingmallAdminSessionsController";
import { ShoppingmallAdminSettingsReportController } from "./controllers/shoppingMall/admin/settings/report/ShoppingmallAdminSettingsReportController";
import { ShoppingmallAdminShipmentsController } from "./controllers/shoppingMall/admin/shipments/ShoppingmallAdminShipmentsController";
import { ShoppingmallAdminSnapshotsController } from "./controllers/shoppingMall/admin/snapshots/ShoppingmallAdminSnapshotsController";
import { ShoppingmallAdminSnapshotsAuditController } from "./controllers/shoppingMall/admin/snapshots/audit/ShoppingmallAdminSnapshotsAuditController";
import { ShoppingmallAdminSystem_logsController } from "./controllers/shoppingMall/admin/system-logs/ShoppingmallAdminSystem_logsController";
import { ShoppingmallAdminSystem_logsDashboardController } from "./controllers/shoppingMall/admin/system-logs/dashboard/ShoppingmallAdminSystem_logsDashboardController";
import { ShoppingmallAdminSystem_settingsController } from "./controllers/shoppingMall/admin/system-settings/ShoppingmallAdminSystem_settingsController";
import { ShoppingmallAdminVerificationController } from "./controllers/shoppingMall/admin/verification/ShoppingmallAdminVerificationController";
import { ShoppingmallAuthAdminController } from "./controllers/shoppingMall/auth/admin/ShoppingmallAuthAdminController";
import { ShoppingmallAuthCustomerController } from "./controllers/shoppingMall/auth/customer/ShoppingmallAuthCustomerController";
import { ShoppingmallAuthSellerController } from "./controllers/shoppingMall/auth/seller/ShoppingmallAuthSellerController";
import { ShoppingmallCustomerCancellation_requestsController } from "./controllers/shoppingMall/customer/cancellation-requests/ShoppingmallCustomerCancellation_requestsController";
import { ShoppingmallCustomerCartsController } from "./controllers/shoppingMall/customer/carts/ShoppingmallCustomerCartsController";
import { ShoppingmallCustomerEmail_verificationsController } from "./controllers/shoppingMall/customer/email-verifications/ShoppingmallCustomerEmail_verificationsController";
import { ShoppingmallCustomerOrdersController } from "./controllers/shoppingMall/customer/orders/ShoppingmallCustomerOrdersController";
import { ShoppingmallCustomerOrdersItemsController } from "./controllers/shoppingMall/customer/orders/items/ShoppingmallCustomerOrdersItemsController";
import { ShoppingmallCustomerProfileController } from "./controllers/shoppingMall/customer/profile/ShoppingmallCustomerProfileController";
import { ShoppingmallCustomerRefund_requestsController } from "./controllers/shoppingMall/customer/refund-requests/ShoppingmallCustomerRefund_requestsController";
import { ShoppingmallCustomerReset_requestController } from "./controllers/shoppingMall/customer/reset-request/ShoppingmallCustomerReset_requestController";
import { ShoppingmallCustomerResetController } from "./controllers/shoppingMall/customer/reset/ShoppingmallCustomerResetController";
import { ShoppingmallCustomerReviewsController } from "./controllers/shoppingMall/customer/reviews/ShoppingmallCustomerReviewsController";
import { ShoppingmallCustomerReviewsSnapshotsController } from "./controllers/shoppingMall/customer/reviews/snapshots/ShoppingmallCustomerReviewsSnapshotsController";
import { ShoppingmallCustomerReviewsVotesController } from "./controllers/shoppingMall/customer/reviews/votes/ShoppingmallCustomerReviewsVotesController";
import { ShoppingmallCustomerSeller_profile_snapshotsController } from "./controllers/shoppingMall/customer/seller-profile-snapshots/ShoppingmallCustomerSeller_profile_snapshotsController";
import { ShoppingmallCustomerSessionsController } from "./controllers/shoppingMall/customer/sessions/ShoppingmallCustomerSessionsController";
import { ShoppingmallCustomerShipmentsController } from "./controllers/shoppingMall/customer/shipments/ShoppingmallCustomerShipmentsController";
import { ShoppingmallCustomerShipmentsConfirm_deliveryController } from "./controllers/shoppingMall/customer/shipments/confirm-delivery/ShoppingmallCustomerShipmentsConfirm_deliveryController";
import { ShoppingmallCustomerVerificationController } from "./controllers/shoppingMall/customer/verification/ShoppingmallCustomerVerificationController";
import { ShoppingmallCustomersController } from "./controllers/shoppingMall/customers/ShoppingmallCustomersController";
import { ShoppingmallProductsController } from "./controllers/shoppingMall/products/ShoppingmallProductsController";
import { ShoppingmallProductsImagesController } from "./controllers/shoppingMall/products/images/ShoppingmallProductsImagesController";
import { ShoppingmallProductsInventoryController } from "./controllers/shoppingMall/products/inventory/ShoppingmallProductsInventoryController";
import { ShoppingmallProductsVariantsController } from "./controllers/shoppingMall/products/variants/ShoppingmallProductsVariantsController";
import { ShoppingmallProductsVariantsInventoryController } from "./controllers/shoppingMall/products/variants/inventory/ShoppingmallProductsVariantsInventoryController";
import { ShoppingmallSellerCancellation_requestsResponseController } from "./controllers/shoppingMall/seller/cancellation-requests/response/ShoppingmallSellerCancellation_requestsResponseController";
import { ShoppingmallSellerDashboardController } from "./controllers/shoppingMall/seller/dashboard/ShoppingmallSellerDashboardController";
import { ShoppingmallSellerProductsController } from "./controllers/shoppingMall/seller/products/ShoppingmallSellerProductsController";
import { ShoppingmallSellerProductsImagesController } from "./controllers/shoppingMall/seller/products/images/ShoppingmallSellerProductsImagesController";
import { ShoppingmallSellerProductsVariantsController } from "./controllers/shoppingMall/seller/products/variants/ShoppingmallSellerProductsVariantsController";
import { ShoppingmallSellerRefund_requestsResponseController } from "./controllers/shoppingMall/seller/refund-requests/response/ShoppingmallSellerRefund_requestsResponseController";
import { ShoppingmallSellerReset_requestController } from "./controllers/shoppingMall/seller/reset-request/ShoppingmallSellerReset_requestController";
import { ShoppingmallSellerResetController } from "./controllers/shoppingMall/seller/reset/ShoppingmallSellerResetController";
import { ShoppingmallSellerSeller_profile_snapshotsController } from "./controllers/shoppingMall/seller/seller-profile-snapshots/ShoppingmallSellerSeller_profile_snapshotsController";
import { ShoppingmallSellerSellerRequestsPendingController } from "./controllers/shoppingMall/seller/seller/requests/pending/ShoppingmallSellerSellerRequestsPendingController";
import { ShoppingmallSellerSessionsController } from "./controllers/shoppingMall/seller/sessions/ShoppingmallSellerSessionsController";
import { ShoppingmallSellerShipmentsController } from "./controllers/shoppingMall/seller/shipments/ShoppingmallSellerShipmentsController";
import { ShoppingmallSellerVerificationController } from "./controllers/shoppingMall/seller/verification/ShoppingmallSellerVerificationController";
import { ShoppingmallSellersController } from "./controllers/shoppingMall/sellers/ShoppingmallSellersController";

@Module({
  controllers: [
    ShoppingmallAuthCustomerController,
    ShoppingmallAuthSellerController,
    ShoppingmallAuthAdminController,
    ShoppingmallProductsController,
    ShoppingmallProductsVariantsController,
    ShoppingmallProductsVariantsInventoryController,
    ShoppingmallProductsInventoryController,
    ShoppingmallSellerProductsController,
    ShoppingmallSellerProductsImagesController,
    ShoppingmallProductsImagesController,
    ShoppingmallSellerProductsVariantsController,
    ShoppingmallCustomersController,
    ShoppingmallSellersController,
    ShoppingmallCustomerSessionsController,
    ShoppingmallCustomerEmail_verificationsController,
    ShoppingmallCustomerProfileController,
    ShoppingmallCustomerCartsController,
    ShoppingmallCustomerOrdersController,
    ShoppingmallCustomerOrdersItemsController,
    ShoppingmallSellerShipmentsController,
    ShoppingmallCustomerShipmentsController,
    ShoppingmallAdminShipmentsController,
    ShoppingmallCustomerCancellation_requestsController,
    ShoppingmallCustomerRefund_requestsController,
    ShoppingmallSellerCancellation_requestsResponseController,
    ShoppingmallSellerRefund_requestsResponseController,
    ShoppingmallCustomerReviewsController,
    ShoppingmallCustomerReviewsVotesController,
    ShoppingmallCustomerReviewsSnapshotsController,
    ShoppingmallAdminSystem_logsController,
    ShoppingmallAdminAdmin_actionsController,
    ShoppingmallAdminSnapshotsController,
    ShoppingmallAdminSystem_settingsController,
    ShoppingmallCustomerSeller_profile_snapshotsController,
    ShoppingmallSellerSeller_profile_snapshotsController,
    ShoppingmallAdminAdminAnalyticsInventoryController,
    ShoppingmallAdminAdminAnalyticsVariantsController,
    ShoppingmallCustomerVerificationController,
    ShoppingmallSellerVerificationController,
    ShoppingmallAdminVerificationController,
    ShoppingmallCustomerReset_requestController,
    ShoppingmallSellerReset_requestController,
    ShoppingmallAdminReset_requestController,
    ShoppingmallCustomerResetController,
    ShoppingmallSellerResetController,
    ShoppingmallAdminResetController,
    ShoppingmallSellerSessionsController,
    ShoppingmallAdminSessionsController,
    ShoppingmallAdminSalesController,
    ShoppingmallSellerDashboardController,
    ShoppingmallAdminOrder_statusController,
    ShoppingmallAdminRevenueController,
    ShoppingmallCustomerShipmentsConfirm_deliveryController,
    ShoppingmallSellerSellerRequestsPendingController,
    ShoppingmallAdminAdminRequestsController,
    ShoppingmallAdminSettingsReportController,
    ShoppingmallAdminSnapshotsAuditController,
    ShoppingmallAdminSystem_logsDashboardController,
    ShoppingmallAdminAdmin_actionsReportController,
    ShoppingmallAdminSellersProfile_snapshotsController,
  ],
})
export class MyModule {}
