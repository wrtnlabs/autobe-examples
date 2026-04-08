import { Module } from "@nestjs/common";

import { EcommercemallAdminAdminAccountController } from "./controllers/ecommerceMall/admin/admin/account/EcommercemallAdminAdminAccountController";
import { EcommercemallAdminAdminAdminsController } from "./controllers/ecommerceMall/admin/admin/admins/EcommercemallAdminAdminAdminsController";
import { EcommercemallAdminAdminAnalyticsProductsController } from "./controllers/ecommerceMall/admin/admin/analytics/products/EcommercemallAdminAdminAnalyticsProductsController";
import { EcommercemallAdminAdminAnalyticsSellersController } from "./controllers/ecommerceMall/admin/admin/analytics/sellers/EcommercemallAdminAdminAnalyticsSellersController";
import { EcommercemallAdminAdminAudit_logsController } from "./controllers/ecommerceMall/admin/admin/audit-logs/EcommercemallAdminAdminAudit_logsController";
import { EcommercemallAdminAdminCategoriesController } from "./controllers/ecommerceMall/admin/admin/categories/EcommercemallAdminAdminCategoriesController";
import { EcommercemallAdminAdminCustomersController } from "./controllers/ecommerceMall/admin/admin/customers/EcommercemallAdminAdminCustomersController";
import { EcommercemallAdminAdminDashboardController } from "./controllers/ecommerceMall/admin/admin/dashboard/EcommercemallAdminAdminDashboardController";
import { EcommercemallAdminAdminFulfillmentController } from "./controllers/ecommerceMall/admin/admin/fulfillment/metrics/EcommercemallAdminAdminFulfillmentController";
import { EcommercemallAdminAdminOrdersController } from "./controllers/ecommerceMall/admin/admin/orders/EcommercemallAdminAdminOrdersController";
import { EcommercemallAdminAdminOrdersForce_cancelController } from "./controllers/ecommerceMall/admin/admin/orders/force-cancel/EcommercemallAdminAdminOrdersForce_cancelController";
import { EcommercemallAdminAdminOrdersForce_refundController } from "./controllers/ecommerceMall/admin/admin/orders/force-refund/EcommercemallAdminAdminOrdersForce_refundController";
import { EcommercemallAdminAdminOrdersItemsForce_cancelController } from "./controllers/ecommerceMall/admin/admin/orders/items/force-cancel/EcommercemallAdminAdminOrdersItemsForce_cancelController";
import { EcommercemallAdminAdminOrdersItemsForce_refundController } from "./controllers/ecommerceMall/admin/admin/orders/items/force-refund/EcommercemallAdminAdminOrdersItemsForce_refundController";
import { EcommercemallAdminAdminPasswordController } from "./controllers/ecommerceMall/admin/admin/password/EcommercemallAdminAdminPasswordController";
import { EcommercemallAdminAdminProduct_snapshotsController } from "./controllers/ecommerceMall/admin/admin/product-snapshots/EcommercemallAdminAdminProduct_snapshotsController";
import { EcommercemallAdminAdminProductsController } from "./controllers/ecommerceMall/admin/admin/products/EcommercemallAdminAdminProductsController";
import { EcommercemallAdminAdminProductsSnapshotsController } from "./controllers/ecommerceMall/admin/admin/products/snapshots/EcommercemallAdminAdminProductsSnapshotsController";
import { EcommercemallAdminAdminSeller_approvalsController } from "./controllers/ecommerceMall/admin/admin/seller-approvals/EcommercemallAdminAdminSeller_approvalsController";
import { EcommercemallAdminAdminSeller_profilesController } from "./controllers/ecommerceMall/admin/admin/seller-profiles/EcommercemallAdminAdminSeller_profilesController";
import { EcommercemallAdminAdminSeller_suspensionsController } from "./controllers/ecommerceMall/admin/admin/seller-suspensions/EcommercemallAdminAdminSeller_suspensionsController";
import { EcommercemallAdminAdminSellersController } from "./controllers/ecommerceMall/admin/admin/sellers/EcommercemallAdminAdminSellersController";
import { EcommercemallAdminAdminSessionsController } from "./controllers/ecommerceMall/admin/admin/sessions/EcommercemallAdminAdminSessionsController";
import { EcommercemallAdminAdminShipmentsController } from "./controllers/ecommerceMall/admin/admin/shipments/EcommercemallAdminAdminShipmentsController";
import { EcommercemallAdminAdminsMeController } from "./controllers/ecommerceMall/admin/admins/me/EcommercemallAdminAdminsMeController";
import { EcommercemallAdminCancellation_requestsSnapshotsController } from "./controllers/ecommerceMall/admin/cancellation-requests/snapshots/EcommercemallAdminCancellation_requestsSnapshotsController";
import { EcommercemallAdminCustomersController } from "./controllers/ecommerceMall/admin/customers/EcommercemallAdminCustomersController";
import { EcommercemallAdminGuestsController } from "./controllers/ecommerceMall/admin/guests/EcommercemallAdminGuestsController";
import { EcommercemallAdminRefund_requestsSnapshotsController } from "./controllers/ecommerceMall/admin/refund-requests/snapshots/EcommercemallAdminRefund_requestsSnapshotsController";
import { EcommercemallAdminSellersController } from "./controllers/ecommerceMall/admin/sellers/EcommercemallAdminSellersController";
import { EcommercemallAuthAdminController } from "./controllers/ecommerceMall/auth/admin/EcommercemallAuthAdminController";
import { EcommercemallAuthCustomerController } from "./controllers/ecommerceMall/auth/customer/EcommercemallAuthCustomerController";
import { EcommercemallAuthGuestController } from "./controllers/ecommerceMall/auth/guest/EcommercemallAuthGuestController";
import { EcommercemallAuthSellerController } from "./controllers/ecommerceMall/auth/seller/EcommercemallAuthSellerController";
import { EcommercemallAuthSuperadminController } from "./controllers/ecommerceMall/auth/superAdmin/EcommercemallAuthSuperadminController";
import { EcommercemallCategoriesController } from "./controllers/ecommerceMall/categories/EcommercemallCategoriesController";
import { EcommercemallCustomerAddressesController } from "./controllers/ecommerceMall/customer/addresses/EcommercemallCustomerAddressesController";
import { EcommercemallCustomerCancellation_requestsSnapshotsController } from "./controllers/ecommerceMall/customer/cancellation-requests/snapshots/EcommercemallCustomerCancellation_requestsSnapshotsController";
import { EcommercemallCustomerCategoriesController } from "./controllers/ecommerceMall/customer/categories/tree/EcommercemallCustomerCategoriesController";
import { EcommercemallCustomerCustomerAccountController } from "./controllers/ecommerceMall/customer/customer/account/EcommercemallCustomerCustomerAccountController";
import { EcommercemallCustomerCustomerPasswordController } from "./controllers/ecommerceMall/customer/customer/password/EcommercemallCustomerCustomerPasswordController";
import { EcommercemallCustomerCustomerSessionsController } from "./controllers/ecommerceMall/customer/customer/sessions/EcommercemallCustomerCustomerSessionsController";
import { EcommercemallCustomerCustomersMeController } from "./controllers/ecommerceMall/customer/customers/me/EcommercemallCustomerCustomersMeController";
import { EcommercemallCustomerCustomersMeAddressesController } from "./controllers/ecommerceMall/customer/customers/me/addresses/EcommercemallCustomerCustomersMeAddressesController";
import { EcommercemallCustomerCustomersMeAddressesSet_defaultController } from "./controllers/ecommerceMall/customer/customers/me/addresses/set-default/EcommercemallCustomerCustomersMeAddressesSet_defaultController";
import { EcommercemallCustomerCustomersMeCancellation_requestsController } from "./controllers/ecommerceMall/customer/customers/me/cancellation-requests/EcommercemallCustomerCustomersMeCancellation_requestsController";
import { EcommercemallCustomerCustomersMeCancellation_requestsSnapshotsController } from "./controllers/ecommerceMall/customer/customers/me/cancellation-requests/snapshots/EcommercemallCustomerCustomersMeCancellation_requestsSnapshotsController";
import { EcommercemallCustomerCustomersMeCartController } from "./controllers/ecommerceMall/customer/customers/me/cart/EcommercemallCustomerCustomersMeCartController";
import { EcommercemallCustomerCustomersMeCartStockController } from "./controllers/ecommerceMall/customer/customers/me/cart/stock/EcommercemallCustomerCustomersMeCartStockController";
import { EcommercemallCustomerCustomersMeCheckoutController } from "./controllers/ecommerceMall/customer/customers/me/checkout/EcommercemallCustomerCustomersMeCheckoutController";
import { EcommercemallCustomerCustomersMeCheckoutValidateController } from "./controllers/ecommerceMall/customer/customers/me/checkout/validate/EcommercemallCustomerCustomersMeCheckoutValidateController";
import { EcommercemallCustomerCustomersMeDeliveriesController } from "./controllers/ecommerceMall/customer/customers/me/deliveries/pending/EcommercemallCustomerCustomersMeDeliveriesController";
import { EcommercemallCustomerCustomersMeOrdersController } from "./controllers/ecommerceMall/customer/customers/me/orders/EcommercemallCustomerCustomersMeOrdersController";
import { EcommercemallCustomerCustomersMeOrdersItemsCancelController } from "./controllers/ecommerceMall/customer/customers/me/orders/items/cancel/EcommercemallCustomerCustomersMeOrdersItemsCancelController";
import { EcommercemallCustomerCustomersMeOrdersItemsCancellationController } from "./controllers/ecommerceMall/customer/customers/me/orders/items/cancellation/EcommercemallCustomerCustomersMeOrdersItemsCancellationController";
import { EcommercemallCustomerCustomersMeOrdersItemsRefundController } from "./controllers/ecommerceMall/customer/customers/me/orders/items/refund/EcommercemallCustomerCustomersMeOrdersItemsRefundController";
import { EcommercemallCustomerCustomersMeOrdersItemsReviewController } from "./controllers/ecommerceMall/customer/customers/me/orders/items/review/EcommercemallCustomerCustomersMeOrdersItemsReviewController";
import { EcommercemallCustomerCustomersMeOrdersRetry_paymentController } from "./controllers/ecommerceMall/customer/customers/me/orders/retry-payment/EcommercemallCustomerCustomersMeOrdersRetry_paymentController";
import { EcommercemallCustomerCustomersMeOrdersShipmentsController } from "./controllers/ecommerceMall/customer/customers/me/orders/shipments/EcommercemallCustomerCustomersMeOrdersShipmentsController";
import { EcommercemallCustomerCustomersMeOrdersShipmentsConfirm_deliveryController } from "./controllers/ecommerceMall/customer/customers/me/orders/shipments/confirm-delivery/EcommercemallCustomerCustomersMeOrdersShipmentsConfirm_deliveryController";
import { EcommercemallCustomerCustomersMeRefund_requestsController } from "./controllers/ecommerceMall/customer/customers/me/refund-requests/EcommercemallCustomerCustomersMeRefund_requestsController";
import { EcommercemallCustomerCustomersMeReviewsController } from "./controllers/ecommerceMall/customer/customers/me/reviews/EcommercemallCustomerCustomersMeReviewsController";
import { EcommercemallCustomerCustomersMeWishlistController } from "./controllers/ecommerceMall/customer/customers/me/wishlist/EcommercemallCustomerCustomersMeWishlistController";
import { EcommercemallCustomerMeCartController } from "./controllers/ecommerceMall/customer/me/cart/EcommercemallCustomerMeCartController";
import { EcommercemallCustomerMeCartItemsController } from "./controllers/ecommerceMall/customer/me/cart/items/EcommercemallCustomerMeCartItemsController";
import { EcommercemallCustomerOrdersController } from "./controllers/ecommerceMall/customer/orders/EcommercemallCustomerOrdersController";
import { EcommercemallCustomerOrdersItemsController } from "./controllers/ecommerceMall/customer/orders/items/EcommercemallCustomerOrdersItemsController";
import { EcommercemallCustomerOrdersShipmentsController } from "./controllers/ecommerceMall/customer/orders/shipments/EcommercemallCustomerOrdersShipmentsController";
import { EcommercemallCustomerOrdersShipmentsConfirm_deliveryController } from "./controllers/ecommerceMall/customer/orders/shipments/confirm-delivery/EcommercemallCustomerOrdersShipmentsConfirm_deliveryController";
import { EcommercemallCustomerProductsEnrichedController } from "./controllers/ecommerceMall/customer/products/enriched/EcommercemallCustomerProductsEnrichedController";
import { EcommercemallCustomerProfileController } from "./controllers/ecommerceMall/customer/profile/EcommercemallCustomerProfileController";
import { EcommercemallCustomerRefund_requestsSnapshotsController } from "./controllers/ecommerceMall/customer/refund-requests/snapshots/EcommercemallCustomerRefund_requestsSnapshotsController";
import { EcommercemallCustomerSellersController } from "./controllers/ecommerceMall/customer/sellers/EcommercemallCustomerSellersController";
import { EcommercemallCustomerWishlistController } from "./controllers/ecommerceMall/customer/wishlist/EcommercemallCustomerWishlistController";
import { EcommercemallGuestCategoriesController } from "./controllers/ecommerceMall/guest/categories/tree/EcommercemallGuestCategoriesController";
import { EcommercemallGuestGuestSessionsController } from "./controllers/ecommerceMall/guest/guest/sessions/EcommercemallGuestGuestSessionsController";
import { EcommercemallGuestProductsEnrichedController } from "./controllers/ecommerceMall/guest/products/enriched/EcommercemallGuestProductsEnrichedController";
import { EcommercemallProductsController } from "./controllers/ecommerceMall/products/EcommercemallProductsController";
import { EcommercemallProductsRatingController } from "./controllers/ecommerceMall/products/rating/EcommercemallProductsRatingController";
import { EcommercemallProductsReviewsController } from "./controllers/ecommerceMall/products/reviews/EcommercemallProductsReviewsController";
import { EcommercemallReviewsSnapshotsController } from "./controllers/ecommerceMall/reviews/snapshots/EcommercemallReviewsSnapshotsController";
import { EcommercemallSellerCancellation_requestsSnapshotsController } from "./controllers/ecommerceMall/seller/cancellation-requests/snapshots/EcommercemallSellerCancellation_requestsSnapshotsController";
import { EcommercemallSellerRefund_requestsSnapshotsController } from "./controllers/ecommerceMall/seller/refund-requests/snapshots/EcommercemallSellerRefund_requestsSnapshotsController";
import { EcommercemallSellerSellerAccountController } from "./controllers/ecommerceMall/seller/seller/account/EcommercemallSellerSellerAccountController";
import { EcommercemallSellerSellerApproval_statusController } from "./controllers/ecommerceMall/seller/seller/approval-status/EcommercemallSellerSellerApproval_statusController";
import { EcommercemallSellerSellerPasswordController } from "./controllers/ecommerceMall/seller/seller/password/EcommercemallSellerSellerPasswordController";
import { EcommercemallSellerSellerRejection_reasonController } from "./controllers/ecommerceMall/seller/seller/rejection-reason/EcommercemallSellerSellerRejection_reasonController";
import { EcommercemallSellerSellerController } from "./controllers/ecommerceMall/seller/seller/reregister/EcommercemallSellerSellerController";
import { EcommercemallSellerSellerSessionsController } from "./controllers/ecommerceMall/seller/seller/sessions/EcommercemallSellerSellerSessionsController";
import { EcommercemallSellerSellersMeAdmin_requestsController } from "./controllers/ecommerceMall/seller/sellers/me/admin-requests/EcommercemallSellerSellersMeAdmin_requestsController";
import { EcommercemallSellerSellersMeApprovalsController } from "./controllers/ecommerceMall/seller/sellers/me/approvals/EcommercemallSellerSellersMeApprovalsController";
import { EcommercemallSellerSellersMeCancellation_requestsController } from "./controllers/ecommerceMall/seller/sellers/me/cancellation-requests/EcommercemallSellerSellersMeCancellation_requestsController";
import { EcommercemallSellerSellersMeDashboardController } from "./controllers/ecommerceMall/seller/sellers/me/dashboard/EcommercemallSellerSellersMeDashboardController";
import { EcommercemallSellerSellersMeOrdersItemsController } from "./controllers/ecommerceMall/seller/sellers/me/orders/items/EcommercemallSellerSellersMeOrdersItemsController";
import { EcommercemallSellerSellersMeOrdersItemsShipController } from "./controllers/ecommerceMall/seller/sellers/me/orders/items/ship/EcommercemallSellerSellersMeOrdersItemsShipController";
import { EcommercemallSellerSellersMeProductsController } from "./controllers/ecommerceMall/seller/sellers/me/products/EcommercemallSellerSellersMeProductsController";
import { EcommercemallSellerSellersMeProductsImagesController } from "./controllers/ecommerceMall/seller/sellers/me/products/images/EcommercemallSellerSellersMeProductsImagesController";
import { EcommercemallSellerSellersMeProducts_snapshotsController } from "./controllers/ecommerceMall/seller/sellers/me/products/snapshots/EcommercemallSellerSellersMeProducts_snapshotsController";
import { EcommercemallSellerSellersMeProductsVariantsController } from "./controllers/ecommerceMall/seller/sellers/me/products/variants/EcommercemallSellerSellersMeProductsVariantsController";
import { EcommercemallSellerSellersMeProductsVariantsBulkController } from "./controllers/ecommerceMall/seller/sellers/me/products/variants/bulk/EcommercemallSellerSellersMeProductsVariantsBulkController";
import { EcommercemallSellerSellersMeProductsVariantsOption_valuesController } from "./controllers/ecommerceMall/seller/sellers/me/products/variants/option-values/EcommercemallSellerSellersMeProductsVariantsOption_valuesController";
import { EcommercemallSellerSellersMeProductsVariantsSnapshotsController } from "./controllers/ecommerceMall/seller/sellers/me/products/variants/snapshots/EcommercemallSellerSellersMeProductsVariantsSnapshotsController";
import { EcommercemallSellerSellersMeProfileController } from "./controllers/ecommerceMall/seller/sellers/me/profile/EcommercemallSellerSellersMeProfileController";
import { EcommercemallSellerSellersMeProfileSnapshotsController } from "./controllers/ecommerceMall/seller/sellers/me/profile/snapshots/EcommercemallSellerSellersMeProfileSnapshotsController";
import { EcommercemallSellerSellersMeRefund_requestsController } from "./controllers/ecommerceMall/seller/sellers/me/refund-requests/EcommercemallSellerSellersMeRefund_requestsController";
import { EcommercemallSellerSellersMeShipmentsController } from "./controllers/ecommerceMall/seller/sellers/me/shipments/EcommercemallSellerSellersMeShipmentsController";
import { EcommercemallSellerSellersMeVariantsController } from "./controllers/ecommerceMall/seller/sellers/me/variants/inventory/EcommercemallSellerSellersMeVariantsController";
import { EcommercemallSellerSellersMeVariants_inventoryController } from "./controllers/ecommerceMall/seller/sellers/me/variants/inventory/EcommercemallSellerSellersMeVariants_inventoryController";
import { EcommercemallSellerSellersMeVariants_inventoryHistoryController } from "./controllers/ecommerceMall/seller/sellers/me/variants/inventory/history/EcommercemallSellerSellersMeVariants_inventoryHistoryController";
import { EcommercemallSellerShipmentsController } from "./controllers/ecommerceMall/seller/shipments/EcommercemallSellerShipmentsController";
import { EcommercemallSellerShipmentsItemsController } from "./controllers/ecommerceMall/seller/shipments/items/EcommercemallSellerShipmentsItemsController";
import { EcommercemallSellerVariantsInventoryController } from "./controllers/ecommerceMall/seller/variants/inventory/EcommercemallSellerVariantsInventoryController";
import { EcommercemallSellersProfileController } from "./controllers/ecommerceMall/sellers/profile/EcommercemallSellersProfileController";
import { EcommercemallSuperadminAdmin_requestsController } from "./controllers/ecommerceMall/superAdmin/admin-requests/EcommercemallSuperadminAdmin_requestsController";
import { EcommercemallSuperadminAdminController } from "./controllers/ecommerceMall/superAdmin/admin/EcommercemallSuperadminAdminController";
import { EcommercemallSuperadminAdminAdmin_requestsController } from "./controllers/ecommerceMall/superAdmin/admin/admin-requests/EcommercemallSuperadminAdminAdmin_requestsController";
import { EcommercemallSuperadminAdminAdminsController } from "./controllers/ecommerceMall/superAdmin/admin/admins/EcommercemallSuperadminAdminAdminsController";
import { EcommercemallSuperadminAdminAnalyticsProductsController } from "./controllers/ecommerceMall/superAdmin/admin/analytics/products/EcommercemallSuperadminAdminAnalyticsProductsController";
import { EcommercemallSuperadminAdminAnalyticsSellersController } from "./controllers/ecommerceMall/superAdmin/admin/analytics/sellers/EcommercemallSuperadminAdminAnalyticsSellersController";
import { EcommercemallSuperadminAdminAudit_logsController } from "./controllers/ecommerceMall/superAdmin/admin/audit-logs/EcommercemallSuperadminAdminAudit_logsController";
import { EcommercemallSuperadminAdminCategoriesController } from "./controllers/ecommerceMall/superAdmin/admin/categories/EcommercemallSuperadminAdminCategoriesController";
import { EcommercemallSuperadminAdminDashboardController } from "./controllers/ecommerceMall/superAdmin/admin/dashboard/EcommercemallSuperadminAdminDashboardController";
import { EcommercemallSuperadminAdminProductsSnapshotsController } from "./controllers/ecommerceMall/superAdmin/admin/products/snapshots/EcommercemallSuperadminAdminProductsSnapshotsController";
import { EcommercemallSuperadminAdminsController } from "./controllers/ecommerceMall/superAdmin/admins/EcommercemallSuperadminAdminsController";
import { EcommercemallSuperadminCancellation_requestsSnapshotsController } from "./controllers/ecommerceMall/superAdmin/cancellation-requests/snapshots/EcommercemallSuperadminCancellation_requestsSnapshotsController";
import { EcommercemallSuperadminRefund_requestsSnapshotsController } from "./controllers/ecommerceMall/superAdmin/refund-requests/snapshots/EcommercemallSuperadminRefund_requestsSnapshotsController";
import { EcommercemallSuperadminSuper_adminAudit_logsController } from "./controllers/ecommerceMall/superAdmin/super-admin/audit-logs/EcommercemallSuperadminSuper_adminAudit_logsController";
import { EcommercemallSuperadminSuper_adminAudit_logsMetadataController } from "./controllers/ecommerceMall/superAdmin/super-admin/audit-logs/metadata/EcommercemallSuperadminSuper_adminAudit_logsMetadataController";
import { EcommercemallSuperadminSuper_adminSessionsController } from "./controllers/ecommerceMall/superAdmin/super-admin/sessions/EcommercemallSuperadminSuper_adminSessionsController";
import { EcommercemallSuperadminSuper_adminSuper_adminsController } from "./controllers/ecommerceMall/superAdmin/super-admin/super-admins/EcommercemallSuperadminSuper_adminSuper_adminsController";
import { EcommercemallSuperadminSuper_adminsController } from "./controllers/ecommerceMall/superAdmin/super-admins/EcommercemallSuperadminSuper_adminsController";
import { EcommercemallSuperadminSuper_adminsMeController } from "./controllers/ecommerceMall/superAdmin/super-admins/me/EcommercemallSuperadminSuper_adminsMeController";
import { EcommercemallSuperadminSuperadminsController } from "./controllers/ecommerceMall/superAdmin/superAdmins/EcommercemallSuperadminSuperadminsController";

@Module({
  controllers: [
    EcommercemallAuthGuestController,
    EcommercemallAuthCustomerController,
    EcommercemallAuthSellerController,
    EcommercemallAuthAdminController,
    EcommercemallAuthSuperadminController,
    EcommercemallAdminCustomersController,
    EcommercemallCustomerCustomersMeController,
    EcommercemallAdminSellersController,
    EcommercemallCustomerSellersController,
    EcommercemallSellerSellersMeProfileController,
    EcommercemallSuperadminAdminsController,
    EcommercemallAdminAdminsMeController,
    EcommercemallSuperadminSuperadminsController,
    EcommercemallSuperadminSuper_adminsController,
    EcommercemallSuperadminSuper_adminsMeController,
    EcommercemallAdminGuestsController,
    EcommercemallCustomerCustomerSessionsController,
    EcommercemallSellerSellerSessionsController,
    EcommercemallAdminAdminSessionsController,
    EcommercemallSuperadminSuper_adminSessionsController,
    EcommercemallGuestGuestSessionsController,
    EcommercemallAdminAdminAudit_logsController,
    EcommercemallSuperadminAdminAudit_logsController,
    EcommercemallSuperadminSuper_adminAudit_logsController,
    EcommercemallSuperadminSuper_adminAudit_logsMetadataController,
    EcommercemallSuperadminAdmin_requestsController,
    EcommercemallCustomerProfileController,
    EcommercemallCustomerCustomersMeAddressesController,
    EcommercemallCustomerAddressesController,
    EcommercemallCustomerWishlistController,
    EcommercemallCustomerMeCartController,
    EcommercemallCustomerMeCartItemsController,
    EcommercemallCategoriesController,
    EcommercemallAdminAdminCategoriesController,
    EcommercemallSuperadminAdminCategoriesController,
    EcommercemallProductsController,
    EcommercemallProductsReviewsController,
    EcommercemallProductsRatingController,
    EcommercemallSellerSellersMeProductsController,
    EcommercemallSellerSellersMeProductsImagesController,
    EcommercemallSellerSellersMeProductsVariantsController,
    EcommercemallSellerSellersMeProductsVariantsOption_valuesController,
    EcommercemallCustomerCustomersMeReviewsController,
    EcommercemallSellersProfileController,
    EcommercemallSellerSellersMeProducts_snapshotsController,
    EcommercemallAdminAdminProductsSnapshotsController,
    EcommercemallSuperadminAdminProductsSnapshotsController,
    EcommercemallSellerVariantsInventoryController,
    EcommercemallCustomerCustomersMeAddressesSet_defaultController,
    EcommercemallSellerSellersMeVariantsController,
    EcommercemallSellerSellersMeVariants_inventoryController,
    EcommercemallCustomerCustomersMeCartController,
    EcommercemallCustomerCustomersMeWishlistController,
    EcommercemallCustomerCustomersMeOrdersController,
    EcommercemallCustomerCustomersMeOrdersItemsCancelController,
    EcommercemallCustomerCustomersMeOrdersItemsRefundController,
    EcommercemallCustomerCustomersMeOrdersItemsReviewController,
    EcommercemallCustomerCustomersMeOrdersShipmentsController,
    EcommercemallCustomerCustomersMeOrdersShipmentsConfirm_deliveryController,
    EcommercemallSellerSellersMeOrdersItemsController,
    EcommercemallSellerSellersMeOrdersItemsShipController,
    EcommercemallSellerSellersMeCancellation_requestsController,
    EcommercemallSellerSellersMeRefund_requestsController,
    EcommercemallAdminAdminSellersController,
    EcommercemallAdminAdminProductsController,
    EcommercemallAdminAdminCustomersController,
    EcommercemallAdminAdminOrdersController,
    EcommercemallAdminAdminOrdersForce_cancelController,
    EcommercemallAdminAdminOrdersItemsForce_cancelController,
    EcommercemallAdminAdminOrdersForce_refundController,
    EcommercemallAdminAdminOrdersItemsForce_refundController,
    EcommercemallCustomerOrdersController,
    EcommercemallCustomerOrdersItemsController,
    EcommercemallSellerShipmentsController,
    EcommercemallCustomerOrdersShipmentsController,
    EcommercemallCustomerOrdersShipmentsConfirm_deliveryController,
    EcommercemallSellerShipmentsItemsController,
    EcommercemallAdminAdminShipmentsController,
    EcommercemallCustomerCustomersMeOrdersItemsCancellationController,
    EcommercemallCustomerCancellation_requestsSnapshotsController,
    EcommercemallSellerCancellation_requestsSnapshotsController,
    EcommercemallAdminCancellation_requestsSnapshotsController,
    EcommercemallSuperadminCancellation_requestsSnapshotsController,
    EcommercemallCustomerRefund_requestsSnapshotsController,
    EcommercemallSellerRefund_requestsSnapshotsController,
    EcommercemallAdminRefund_requestsSnapshotsController,
    EcommercemallSuperadminRefund_requestsSnapshotsController,
    EcommercemallReviewsSnapshotsController,
    EcommercemallSellerSellersMeDashboardController,
    EcommercemallSellerSellersMeApprovalsController,
    EcommercemallSellerSellersMeAdmin_requestsController,
    EcommercemallAdminAdminAdminsController,
    EcommercemallSuperadminAdminAdminsController,
    EcommercemallSuperadminSuper_adminSuper_adminsController,
    EcommercemallAdminAdminSeller_approvalsController,
    EcommercemallAdminAdminSeller_suspensionsController,
    EcommercemallAdminAdminProduct_snapshotsController,
    EcommercemallAdminAdminSeller_profilesController,
    EcommercemallSuperadminAdminAdmin_requestsController,
    EcommercemallCustomerCustomerPasswordController,
    EcommercemallCustomerCustomerAccountController,
    EcommercemallSellerSellerPasswordController,
    EcommercemallSellerSellerAccountController,
    EcommercemallSellerSellerApproval_statusController,
    EcommercemallSellerSellerRejection_reasonController,
    EcommercemallSellerSellerController,
    EcommercemallAdminAdminPasswordController,
    EcommercemallAdminAdminAccountController,
    EcommercemallSuperadminAdminController,
    EcommercemallCustomerCustomersMeCartStockController,
    EcommercemallCustomerCustomersMeCheckoutValidateController,
    EcommercemallGuestProductsEnrichedController,
    EcommercemallCustomerProductsEnrichedController,
    EcommercemallGuestCategoriesController,
    EcommercemallCustomerCategoriesController,
    EcommercemallSellerSellersMeVariants_inventoryHistoryController,
    EcommercemallSellerSellersMeProductsVariantsBulkController,
    EcommercemallCustomerCustomersMeCheckoutController,
    EcommercemallCustomerCustomersMeOrdersRetry_paymentController,
    EcommercemallSellerSellersMeShipmentsController,
    EcommercemallCustomerCustomersMeDeliveriesController,
    EcommercemallAdminAdminFulfillmentController,
    EcommercemallCustomerCustomersMeCancellation_requestsController,
    EcommercemallCustomerCustomersMeCancellation_requestsSnapshotsController,
    EcommercemallCustomerCustomersMeRefund_requestsController,
    EcommercemallSellerSellersMeProductsVariantsSnapshotsController,
    EcommercemallSellerSellersMeProfileSnapshotsController,
    EcommercemallAdminAdminDashboardController,
    EcommercemallSuperadminAdminDashboardController,
    EcommercemallAdminAdminAnalyticsSellersController,
    EcommercemallSuperadminAdminAnalyticsSellersController,
    EcommercemallAdminAdminAnalyticsProductsController,
    EcommercemallSuperadminAdminAnalyticsProductsController,
  ],
})
export class MyModule {}
