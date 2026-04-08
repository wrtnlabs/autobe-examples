import { Module } from "@nestjs/common";

import { EcommercemallAdminAdminAudit_logsController } from "./controllers/ecommerceMall/admin/admin/audit-logs/EcommercemallAdminAdminAudit_logsController";
import { EcommercemallAdminAdminPassword_resetsController } from "./controllers/ecommerceMall/admin/admin/password-resets/EcommercemallAdminAdminPassword_resetsController";
import { EcommercemallAdminAdminProfileController } from "./controllers/ecommerceMall/admin/admin/profile/EcommercemallAdminAdminProfileController";
import { EcommercemallAdminAdminRequestsController } from "./controllers/ecommerceMall/admin/admin/requests/EcommercemallAdminAdminRequestsController";
import { EcommercemallAdminAdminSeller_approvalsController } from "./controllers/ecommerceMall/admin/admin/seller-approvals/EcommercemallAdminAdminSeller_approvalsController";
import { EcommercemallAdminAdminSeller_suspensionsController } from "./controllers/ecommerceMall/admin/admin/seller-suspensions/EcommercemallAdminAdminSeller_suspensionsController";
import { EcommercemallAdminAdminSessionsController } from "./controllers/ecommerceMall/admin/admin/sessions/EcommercemallAdminAdminSessionsController";
import { EcommercemallAdminCategoriesController } from "./controllers/ecommerceMall/admin/categories/EcommercemallAdminCategoriesController";
import { EcommercemallAdminCustomersController } from "./controllers/ecommerceMall/admin/customers/EcommercemallAdminCustomersController";
import { EcommercemallAdminCustomersAddressesController } from "./controllers/ecommerceMall/admin/customers/addresses/validate/EcommercemallAdminCustomersAddressesController";
import { EcommercemallAdminCustomersPassword_resetsController } from "./controllers/ecommerceMall/admin/customers/password-resets/EcommercemallAdminCustomersPassword_resetsController";
import { EcommercemallAdminCustomersSessionsController } from "./controllers/ecommerceMall/admin/customers/sessions/EcommercemallAdminCustomersSessionsController";
import { EcommercemallAdminInventoryOverviewController } from "./controllers/ecommerceMall/admin/inventory/overview/EcommercemallAdminInventoryOverviewController";
import { EcommercemallAdminOrdersController } from "./controllers/ecommerceMall/admin/orders/EcommercemallAdminOrdersController";
import { EcommercemallAdminPaymentsConfigController } from "./controllers/ecommerceMall/admin/payments/config/EcommercemallAdminPaymentsConfigController";
import { EcommercemallAdminProductvariantsInventoryrecordsController } from "./controllers/ecommerceMall/admin/productVariants/inventoryRecords/EcommercemallAdminProductvariantsInventoryrecordsController";
import { EcommercemallAdminProductsRating_statisticsController } from "./controllers/ecommerceMall/admin/products/rating-statistics/EcommercemallAdminProductsRating_statisticsController";
import { EcommercemallAdminProductsReviewsController } from "./controllers/ecommerceMall/admin/products/reviews/EcommercemallAdminProductsReviewsController";
import { EcommercemallAdminProductsSnapshotsController } from "./controllers/ecommerceMall/admin/products/snapshots/EcommercemallAdminProductsSnapshotsController";
import { EcommercemallAdminSellersController } from "./controllers/ecommerceMall/admin/sellers/EcommercemallAdminSellersController";
import { EcommercemallAdminSellersPassword_resetsController } from "./controllers/ecommerceMall/admin/sellers/password-resets/EcommercemallAdminSellersPassword_resetsController";
import { EcommercemallAdminSellersSessionsController } from "./controllers/ecommerceMall/admin/sellers/sessions/EcommercemallAdminSellersSessionsController";
import { EcommercemallAuthAdminController } from "./controllers/ecommerceMall/auth/admin/EcommercemallAuthAdminController";
import { EcommercemallAuthAdminRequestController } from "./controllers/ecommerceMall/auth/admin/request/EcommercemallAuthAdminRequestController";
import { EcommercemallAuthCustomerController } from "./controllers/ecommerceMall/auth/customer/EcommercemallAuthCustomerController";
import { EcommercemallAuthGuestController } from "./controllers/ecommerceMall/auth/guest/EcommercemallAuthGuestController";
import { EcommercemallAuthSellerController } from "./controllers/ecommerceMall/auth/seller/EcommercemallAuthSellerController";
import { EcommercemallAuthSuperadminController } from "./controllers/ecommerceMall/auth/superAdmin/EcommercemallAuthSuperadminController";
import { EcommercemallCategoriesController } from "./controllers/ecommerceMall/categories/EcommercemallCategoriesController";
import { EcommercemallCategoriesProductsController } from "./controllers/ecommerceMall/categories/products/EcommercemallCategoriesProductsController";
import { EcommercemallCustomerAddressesController } from "./controllers/ecommerceMall/customer/addresses/EcommercemallCustomerAddressesController";
import { EcommercemallCustomerAdminRequestsController } from "./controllers/ecommerceMall/customer/admin/requests/cancel/EcommercemallCustomerAdminRequestsController";
import { EcommercemallCustomerCancellation_requestsController } from "./controllers/ecommerceMall/customer/cancellation-requests/EcommercemallCustomerCancellation_requestsController";
import { EcommercemallCustomerCancellation_requestsSnapshotsController } from "./controllers/ecommerceMall/customer/cancellation-requests/snapshots/EcommercemallCustomerCancellation_requestsSnapshotsController";
import { EcommercemallCustomerCartController } from "./controllers/ecommerceMall/customer/cart/EcommercemallCustomerCartController";
import { EcommercemallCustomerCartItemsController } from "./controllers/ecommerceMall/customer/cart/items/EcommercemallCustomerCartItemsController";
import { EcommercemallCustomerCustomerEmail_verificationsController } from "./controllers/ecommerceMall/customer/customer/email-verifications/EcommercemallCustomerCustomerEmail_verificationsController";
import { EcommercemallCustomerCustomerPassword_resetsController } from "./controllers/ecommerceMall/customer/customer/password-resets/EcommercemallCustomerCustomerPassword_resetsController";
import { EcommercemallCustomerCustomerSessionsController } from "./controllers/ecommerceMall/customer/customer/sessions/EcommercemallCustomerCustomerSessionsController";
import { EcommercemallCustomerCustomersAddressesController } from "./controllers/ecommerceMall/customer/customers/addresses/EcommercemallCustomerCustomersAddressesController";
import { EcommercemallCustomerCustomersCartItemsController } from "./controllers/ecommerceMall/customer/customers/cart/items/EcommercemallCustomerCustomersCartItemsController";
import { EcommercemallCustomerCustomersCheckoutController } from "./controllers/ecommerceMall/customer/customers/checkout/EcommercemallCustomerCustomersCheckoutController";
import { EcommercemallCustomerCustomersProfileController } from "./controllers/ecommerceMall/customer/customers/profile/EcommercemallCustomerCustomersProfileController";
import { EcommercemallCustomerEcommercemallCartItemsController } from "./controllers/ecommerceMall/customer/ecommerceMall/cart/items/EcommercemallCustomerEcommercemallCartItemsController";
import { EcommercemallCustomerEcommercemallOrdersController } from "./controllers/ecommerceMall/customer/ecommerceMall/orders/EcommercemallCustomerEcommercemallOrdersController";
import { EcommercemallCustomerEcommercemallOrdersItemsController } from "./controllers/ecommerceMall/customer/ecommerceMall/orders/items/EcommercemallCustomerEcommercemallOrdersItemsController";
import { EcommercemallCustomerOrdersController } from "./controllers/ecommerceMall/customer/orders/EcommercemallCustomerOrdersController";
import { EcommercemallCustomerOrdersItemsReviewController } from "./controllers/ecommerceMall/customer/orders/items/review/EcommercemallCustomerOrdersItemsReviewController";
import { EcommercemallCustomerPaymentsController } from "./controllers/ecommerceMall/customer/payments/checkout/EcommercemallCustomerPaymentsController";
import { EcommercemallCustomerProductsReviewsController } from "./controllers/ecommerceMall/customer/products/reviews/EcommercemallCustomerProductsReviewsController";
import { EcommercemallCustomerProductsSearchController } from "./controllers/ecommerceMall/customer/products/search/EcommercemallCustomerProductsSearchController";
import { EcommercemallCustomerProfileController } from "./controllers/ecommerceMall/customer/profile/EcommercemallCustomerProfileController";
import { EcommercemallCustomerProfile_exportController } from "./controllers/ecommerceMall/customer/profile/export/EcommercemallCustomerProfile_exportController";
import { EcommercemallCustomerProfileValidateController } from "./controllers/ecommerceMall/customer/profile/validate/EcommercemallCustomerProfileValidateController";
import { EcommercemallCustomerRefund_requestsController } from "./controllers/ecommerceMall/customer/refund-requests/EcommercemallCustomerRefund_requestsController";
import { EcommercemallCustomerRefund_requestsSnapshotsController } from "./controllers/ecommerceMall/customer/refund-requests/snapshots/EcommercemallCustomerRefund_requestsSnapshotsController";
import { EcommercemallCustomerReviewsController } from "./controllers/ecommerceMall/customer/reviews/EcommercemallCustomerReviewsController";
import { EcommercemallCustomerReviewsSnapshotsController } from "./controllers/ecommerceMall/customer/reviews/snapshots/EcommercemallCustomerReviewsSnapshotsController";
import { EcommercemallCustomerWishlistController } from "./controllers/ecommerceMall/customer/wishlist/EcommercemallCustomerWishlistController";
import { EcommercemallGuest_sessionsController } from "./controllers/ecommerceMall/guest-sessions/EcommercemallGuest_sessionsController";
import { EcommercemallGuestProductsRating_statisticsController } from "./controllers/ecommerceMall/guest/products/rating-statistics/EcommercemallGuestProductsRating_statisticsController";
import { EcommercemallGuestProductsReviewsController } from "./controllers/ecommerceMall/guest/products/reviews/EcommercemallGuestProductsReviewsController";
import { EcommercemallGuestProductsSearchController } from "./controllers/ecommerceMall/guest/products/search/EcommercemallGuestProductsSearchController";
import { EcommercemallOrdersItemsController } from "./controllers/ecommerceMall/orders/items/EcommercemallOrdersItemsController";
import { EcommercemallOrdersShipmentsController } from "./controllers/ecommerceMall/orders/shipments/EcommercemallOrdersShipmentsController";
import { EcommercemallPaymentsWebhookController } from "./controllers/ecommerceMall/payments/webhook/EcommercemallPaymentsWebhookController";
import { EcommercemallProductsController } from "./controllers/ecommerceMall/products/EcommercemallProductsController";
import { EcommercemallReviewsController } from "./controllers/ecommerceMall/reviews/EcommercemallReviewsController";
import { EcommercemallSellerAdmin_requestsController } from "./controllers/ecommerceMall/seller/admin-requests/EcommercemallSellerAdmin_requestsController";
import { EcommercemallSellerAdminRequestsController } from "./controllers/ecommerceMall/seller/admin/requests/cancel/EcommercemallSellerAdminRequestsController";
import { EcommercemallSellerCancellation_requestsController } from "./controllers/ecommerceMall/seller/cancellation-requests/EcommercemallSellerCancellation_requestsController";
import { EcommercemallSellerDashboardController } from "./controllers/ecommerceMall/seller/dashboard/EcommercemallSellerDashboardController";
import { EcommercemallSellerEcommercemallVariantsInventoryController } from "./controllers/ecommerceMall/seller/ecommerceMall/variants/inventory/EcommercemallSellerEcommercemallVariantsInventoryController";
import { EcommercemallSellerInventoriesController } from "./controllers/ecommerceMall/seller/inventories/EcommercemallSellerInventoriesController";
import { EcommercemallSellerInventoriesLow_stockController } from "./controllers/ecommerceMall/seller/inventories/low-stock/EcommercemallSellerInventoriesLow_stockController";
import { EcommercemallSellerOrder_itemsController } from "./controllers/ecommerceMall/seller/order-items/EcommercemallSellerOrder_itemsController";
import { EcommercemallSellerOrdersShipmentsController } from "./controllers/ecommerceMall/seller/orders/shipments/EcommercemallSellerOrdersShipmentsController";
import { EcommercemallSellerProductvariantsInventoryrecordsController } from "./controllers/ecommerceMall/seller/productVariants/inventoryRecords/EcommercemallSellerProductvariantsInventoryrecordsController";
import { EcommercemallSellerProductsController } from "./controllers/ecommerceMall/seller/products/EcommercemallSellerProductsController";
import { EcommercemallSellerProductsImagesController } from "./controllers/ecommerceMall/seller/products/images/EcommercemallSellerProductsImagesController";
import { EcommercemallSellerProductsRating_statisticsController } from "./controllers/ecommerceMall/seller/products/rating-statistics/EcommercemallSellerProductsRating_statisticsController";
import { EcommercemallSellerProductsReviewsController } from "./controllers/ecommerceMall/seller/products/reviews/EcommercemallSellerProductsReviewsController";
import { EcommercemallSellerProductsSnapshotsController } from "./controllers/ecommerceMall/seller/products/snapshots/EcommercemallSellerProductsSnapshotsController";
import { EcommercemallSellerProductsVariantsController } from "./controllers/ecommerceMall/seller/products/variants/EcommercemallSellerProductsVariantsController";
import { EcommercemallSellerProductsVariantsInventoryController } from "./controllers/ecommerceMall/seller/products/variants/inventory/EcommercemallSellerProductsVariantsInventoryController";
import { EcommercemallSellerProductsVariantsOption_valuesController } from "./controllers/ecommerceMall/seller/products/variants/option-values/EcommercemallSellerProductsVariantsOption_valuesController";
import { EcommercemallSellerProfileSnapshotsController } from "./controllers/ecommerceMall/seller/profile/snapshots/EcommercemallSellerProfileSnapshotsController";
import { EcommercemallSellerRefund_requestsController } from "./controllers/ecommerceMall/seller/refund-requests/EcommercemallSellerRefund_requestsController";
import { EcommercemallSellerReviewsController } from "./controllers/ecommerceMall/seller/reviews/EcommercemallSellerReviewsController";
import { EcommercemallSellerSellerEmail_verificationsController } from "./controllers/ecommerceMall/seller/seller/email-verifications/EcommercemallSellerSellerEmail_verificationsController";
import { EcommercemallSellerSellerPassword_resetsController } from "./controllers/ecommerceMall/seller/seller/password-resets/EcommercemallSellerSellerPassword_resetsController";
import { EcommercemallSellerSellerSessionsController } from "./controllers/ecommerceMall/seller/seller/sessions/EcommercemallSellerSellerSessionsController";
import { EcommercemallSellerSellersProfileController } from "./controllers/ecommerceMall/seller/sellers/profile/EcommercemallSellerSellersProfileController";
import { EcommercemallSellerSellersRejection_reasonController } from "./controllers/ecommerceMall/seller/sellers/rejection-reason/EcommercemallSellerSellersRejection_reasonController";
import { EcommercemallSellerVariantsInventoryController } from "./controllers/ecommerceMall/seller/variants/inventory/EcommercemallSellerVariantsInventoryController";
import { EcommercemallSellerVariantsInventoryHistoryController } from "./controllers/ecommerceMall/seller/variants/inventory/history/EcommercemallSellerVariantsInventoryHistoryController";
import { EcommercemallShipmentsItemsController } from "./controllers/ecommerceMall/shipments/items/EcommercemallShipmentsItemsController";
import { EcommercemallSuperadminAdminAudit_logsController } from "./controllers/ecommerceMall/superAdmin/admin/audit-logs/EcommercemallSuperadminAdminAudit_logsController";
import { EcommercemallSuperadminAdminRequestsController } from "./controllers/ecommerceMall/superAdmin/admin/requests/EcommercemallSuperadminAdminRequestsController";
import { EcommercemallSuperadminAdminsController } from "./controllers/ecommerceMall/superAdmin/admins/EcommercemallSuperadminAdminsController";
import { EcommercemallSuperadminAdminsPassword_resetsController } from "./controllers/ecommerceMall/superAdmin/admins/password-resets/EcommercemallSuperadminAdminsPassword_resetsController";
import { EcommercemallSuperadminAdminsSessionsController } from "./controllers/ecommerceMall/superAdmin/admins/sessions/EcommercemallSuperadminAdminsSessionsController";
import { EcommercemallSuperadminCategoriesController } from "./controllers/ecommerceMall/superAdmin/categories/EcommercemallSuperadminCategoriesController";
import { EcommercemallSuperadminPassword_resetsController } from "./controllers/ecommerceMall/superAdmin/password-resets/EcommercemallSuperadminPassword_resetsController";
import { EcommercemallSuperadminProductvariantsInventoryrecordsController } from "./controllers/ecommerceMall/superAdmin/productVariants/inventoryRecords/EcommercemallSuperadminProductvariantsInventoryrecordsController";
import { EcommercemallSuperadminProductsSnapshotsController } from "./controllers/ecommerceMall/superAdmin/products/snapshots/EcommercemallSuperadminProductsSnapshotsController";
import { EcommercemallSuperadminProfileController } from "./controllers/ecommerceMall/superAdmin/profile/EcommercemallSuperadminProfileController";
import { EcommercemallSuperadminSessionsController } from "./controllers/ecommerceMall/superAdmin/sessions/EcommercemallSuperadminSessionsController";
import { EcommercemallSuperadminSuper_adminsController } from "./controllers/ecommerceMall/superAdmin/super-admins/EcommercemallSuperadminSuper_adminsController";
import { EcommercemallSuperadminSuperadminAdmin_promotionsController } from "./controllers/ecommerceMall/superAdmin/superAdmin/admin-promotions/EcommercemallSuperadminSuperadminAdmin_promotionsController";
import { EcommercemallSuperadminSuperadminAdminsController } from "./controllers/ecommerceMall/superAdmin/superAdmin/admins/EcommercemallSuperadminSuperadminAdminsController";
import { EcommercemallSuperadminSuperadminAudit_logsController } from "./controllers/ecommerceMall/superAdmin/superAdmin/audit-logs/EcommercemallSuperadminSuperadminAudit_logsController";

@Module({
  controllers: [
    EcommercemallAuthGuestController,
    EcommercemallAuthCustomerController,
    EcommercemallAuthSellerController,
    EcommercemallAuthAdminRequestController,
    EcommercemallAuthAdminController,
    EcommercemallAuthSuperadminController,
    EcommercemallGuest_sessionsController,
    EcommercemallAdminCustomersController,
    EcommercemallCustomerCustomersProfileController,
    EcommercemallCustomerCustomerSessionsController,
    EcommercemallAdminCustomersSessionsController,
    EcommercemallCustomerCustomerPassword_resetsController,
    EcommercemallAdminCustomersPassword_resetsController,
    EcommercemallCustomerCustomerEmail_verificationsController,
    EcommercemallAdminSellersController,
    EcommercemallSellerSellersProfileController,
    EcommercemallSellerSellerSessionsController,
    EcommercemallAdminSellersSessionsController,
    EcommercemallSellerSellerPassword_resetsController,
    EcommercemallAdminSellersPassword_resetsController,
    EcommercemallSellerSellerEmail_verificationsController,
    EcommercemallSuperadminAdminsController,
    EcommercemallAdminAdminProfileController,
    EcommercemallAdminAdminSessionsController,
    EcommercemallSuperadminAdminsSessionsController,
    EcommercemallAdminAdminPassword_resetsController,
    EcommercemallSuperadminAdminsPassword_resetsController,
    EcommercemallSuperadminSuper_adminsController,
    EcommercemallSuperadminProfileController,
    EcommercemallSuperadminSessionsController,
    EcommercemallSuperadminPassword_resetsController,
    EcommercemallCustomerProfileController,
    EcommercemallCustomerAddressesController,
    EcommercemallCustomerCustomersAddressesController,
    EcommercemallSellerProfileSnapshotsController,
    EcommercemallSellerAdmin_requestsController,
    EcommercemallCategoriesController,
    EcommercemallCategoriesProductsController,
    EcommercemallAdminCategoriesController,
    EcommercemallSuperadminCategoriesController,
    EcommercemallProductsController,
    EcommercemallSellerProductsController,
    EcommercemallSellerProductsImagesController,
    EcommercemallSellerProductsVariantsController,
    EcommercemallSellerProductsVariantsOption_valuesController,
    EcommercemallSellerProductsSnapshotsController,
    EcommercemallAdminProductsSnapshotsController,
    EcommercemallSuperadminProductsSnapshotsController,
    EcommercemallSellerProductsVariantsInventoryController,
    EcommercemallSellerProductvariantsInventoryrecordsController,
    EcommercemallAdminProductvariantsInventoryrecordsController,
    EcommercemallSuperadminProductvariantsInventoryrecordsController,
    EcommercemallCustomerCartItemsController,
    EcommercemallCustomerCustomersCartItemsController,
    EcommercemallCustomerWishlistController,
    EcommercemallAdminOrdersController,
    EcommercemallSellerOrder_itemsController,
    EcommercemallOrdersItemsController,
    EcommercemallSellerOrdersShipmentsController,
    EcommercemallOrdersShipmentsController,
    EcommercemallShipmentsItemsController,
    EcommercemallCustomerCancellation_requestsController,
    EcommercemallCustomerCancellation_requestsSnapshotsController,
    EcommercemallSellerCancellation_requestsController,
    EcommercemallCustomerRefund_requestsController,
    EcommercemallCustomerRefund_requestsSnapshotsController,
    EcommercemallSellerRefund_requestsController,
    EcommercemallGuestProductsReviewsController,
    EcommercemallCustomerProductsReviewsController,
    EcommercemallSellerProductsReviewsController,
    EcommercemallAdminProductsReviewsController,
    EcommercemallReviewsController,
    EcommercemallCustomerOrdersItemsReviewController,
    EcommercemallCustomerReviewsController,
    EcommercemallCustomerReviewsSnapshotsController,
    EcommercemallAdminAdminRequestsController,
    EcommercemallSuperadminAdminRequestsController,
    EcommercemallAdminAdminAudit_logsController,
    EcommercemallSuperadminAdminAudit_logsController,
    EcommercemallAdminAdminSeller_approvalsController,
    EcommercemallAdminAdminSeller_suspensionsController,
    EcommercemallSuperadminSuperadminAdmin_promotionsController,
    EcommercemallSuperadminSuperadminAdminsController,
    EcommercemallSuperadminSuperadminAudit_logsController,
    EcommercemallCustomerOrdersController,
    EcommercemallCustomerEcommercemallOrdersController,
    EcommercemallCustomerEcommercemallOrdersItemsController,
    EcommercemallCustomerCartController,
    EcommercemallCustomerEcommercemallCartItemsController,
    EcommercemallSellerVariantsInventoryController,
    EcommercemallSellerEcommercemallVariantsInventoryController,
    EcommercemallCustomerProfileValidateController,
    EcommercemallCustomerProfile_exportController,
    EcommercemallAdminCustomersAddressesController,
    EcommercemallSellerSellersRejection_reasonController,
    EcommercemallGuestProductsSearchController,
    EcommercemallCustomerProductsSearchController,
    EcommercemallSellerInventoriesController,
    EcommercemallSellerInventoriesLow_stockController,
    EcommercemallSellerVariantsInventoryHistoryController,
    EcommercemallAdminInventoryOverviewController,
    EcommercemallCustomerCustomersCheckoutController,
    EcommercemallSellerDashboardController,
    EcommercemallGuestProductsRating_statisticsController,
    EcommercemallSellerProductsRating_statisticsController,
    EcommercemallAdminProductsRating_statisticsController,
    EcommercemallSellerReviewsController,
    EcommercemallCustomerAdminRequestsController,
    EcommercemallSellerAdminRequestsController,
    EcommercemallCustomerPaymentsController,
    EcommercemallPaymentsWebhookController,
    EcommercemallAdminPaymentsConfigController,
  ],
})
export class MyModule {}
