import { Module } from "@nestjs/common";

import { EcommercemallAdministratorAdministrator_gradesController } from "./controllers/ecommerceMall/administrator/administrator-grades/EcommercemallAdministratorAdministrator_gradesController";
import { EcommercemallAdministratorBansController } from "./controllers/ecommerceMall/administrator/bans/EcommercemallAdministratorBansController";
import { EcommercemallAdministratorCancellation_request_snapshotsController } from "./controllers/ecommerceMall/administrator/cancellation-request-snapshots/EcommercemallAdministratorCancellation_request_snapshotsController";
import { EcommercemallAdministratorCancellation_requestsController } from "./controllers/ecommerceMall/administrator/cancellation-requests/EcommercemallAdministratorCancellation_requestsController";
import { EcommercemallAdministratorCategoriesController } from "./controllers/ecommerceMall/administrator/categories/EcommercemallAdministratorCategoriesController";
import { EcommercemallAdministratorCategoriesProductsController } from "./controllers/ecommerceMall/administrator/categories/products/EcommercemallAdministratorCategoriesProductsController";
import { EcommercemallAdministratorCategoriesSnapshotsController } from "./controllers/ecommerceMall/administrator/categories/snapshots/EcommercemallAdministratorCategoriesSnapshotsController";
import { EcommercemallAdministratorCustomersController } from "./controllers/ecommerceMall/administrator/customers/EcommercemallAdministratorCustomersController";
import { EcommercemallAdministratorOrder_itemsController } from "./controllers/ecommerceMall/administrator/order-items/EcommercemallAdministratorOrder_itemsController";
import { EcommercemallAdministratorOrder_snapshotsController } from "./controllers/ecommerceMall/administrator/order-snapshots/EcommercemallAdministratorOrder_snapshotsController";
import { EcommercemallAdministratorOrdersController } from "./controllers/ecommerceMall/administrator/orders/EcommercemallAdministratorOrdersController";
import { EcommercemallAdministratorOrdersAnalyticsController } from "./controllers/ecommerceMall/administrator/orders/analytics/EcommercemallAdministratorOrdersAnalyticsController";
import { EcommercemallAdministratorOrdersSnapshotsController } from "./controllers/ecommerceMall/administrator/orders/snapshots/EcommercemallAdministratorOrdersSnapshotsController";
import { EcommercemallAdministratorProductsController } from "./controllers/ecommerceMall/administrator/products/EcommercemallAdministratorProductsController";
import { EcommercemallAdministratorProductsSearchController } from "./controllers/ecommerceMall/administrator/products/search/EcommercemallAdministratorProductsSearchController";
import { EcommercemallAdministratorRefund_request_snapshotsController } from "./controllers/ecommerceMall/administrator/refund-request-snapshots/EcommercemallAdministratorRefund_request_snapshotsController";
import { EcommercemallAdministratorRefund_requestsController } from "./controllers/ecommerceMall/administrator/refund-requests/EcommercemallAdministratorRefund_requestsController";
import { EcommercemallAdministratorSeller_approval_request_snapshotsController } from "./controllers/ecommerceMall/administrator/seller-approval-request-snapshots/EcommercemallAdministratorSeller_approval_request_snapshotsController";
import { EcommercemallAdministratorSeller_approval_requestsController } from "./controllers/ecommerceMall/administrator/seller-approval-requests/EcommercemallAdministratorSeller_approval_requestsController";
import { EcommercemallAdministratorSeller_approvalsController } from "./controllers/ecommerceMall/administrator/seller-approvals/EcommercemallAdministratorSeller_approvalsController";
import { EcommercemallAdministratorSeller_approvalsPendingController } from "./controllers/ecommerceMall/administrator/seller-approvals/pending/EcommercemallAdministratorSeller_approvalsPendingController";
import { EcommercemallAdministratorSeller_suspensionsController } from "./controllers/ecommerceMall/administrator/seller-suspensions/EcommercemallAdministratorSeller_suspensionsController";
import { EcommercemallAdministratorSellersPendingController } from "./controllers/ecommerceMall/administrator/sellers/pending/EcommercemallAdministratorSellersPendingController";
import { EcommercemallAdministratorSellersSessionsController } from "./controllers/ecommerceMall/administrator/sellers/sessions/EcommercemallAdministratorSellersSessionsController";
import { EcommercemallAdministratorSellersSuspension_historyController } from "./controllers/ecommerceMall/administrator/sellers/suspension-history/EcommercemallAdministratorSellersSuspension_historyController";
import { EcommercemallAdministratorShipment_itemsController } from "./controllers/ecommerceMall/administrator/shipment-items/EcommercemallAdministratorShipment_itemsController";
import { EcommercemallAdministratorShipmentsItemsController } from "./controllers/ecommerceMall/administrator/shipments/items/EcommercemallAdministratorShipmentsItemsController";
import { EcommercemallAdministratorUser_ban_of_customersController } from "./controllers/ecommerceMall/administrator/user-ban-of-customers/EcommercemallAdministratorUser_ban_of_customersController";
import { EcommercemallAdministratorUser_ban_of_sellersController } from "./controllers/ecommerceMall/administrator/user-ban-of-sellers/EcommercemallAdministratorUser_ban_of_sellersController";
import { EcommercemallAdministratorUser_bansController } from "./controllers/ecommerceMall/administrator/user-bans/EcommercemallAdministratorUser_bansController";
import { EcommercemallAdministratorUsersController } from "./controllers/ecommerceMall/administrator/users/EcommercemallAdministratorUsersController";
import { EcommercemallAdministratorUsersBanController } from "./controllers/ecommerceMall/administrator/users/ban/EcommercemallAdministratorUsersBanController";
import { EcommercemallAuthAdministratorController } from "./controllers/ecommerceMall/auth/administrator/EcommercemallAuthAdministratorController";
import { EcommercemallAuthGuestController } from "./controllers/ecommerceMall/auth/guest/EcommercemallAuthGuestController";
import { EcommercemallAuthMemberController } from "./controllers/ecommerceMall/auth/member/EcommercemallAuthMemberController";
import { EcommercemallAuthSellerController } from "./controllers/ecommerceMall/auth/seller/EcommercemallAuthSellerController";
import { EcommercemallAuthSuper_administratorController } from "./controllers/ecommerceMall/auth/super-administrator/EcommercemallAuthSuper_administratorController";
import { EcommercemallCategoriesController } from "./controllers/ecommerceMall/categories/EcommercemallCategoriesController";
import { EcommercemallCategoriesProductsController } from "./controllers/ecommerceMall/categories/products/EcommercemallCategoriesProductsController";
import { EcommercemallMemberAddressesController } from "./controllers/ecommerceMall/member/addresses/EcommercemallMemberAddressesController";
import { EcommercemallMemberAdministrator_approval_requestsController } from "./controllers/ecommerceMall/member/administrator-approval-requests/EcommercemallMemberAdministrator_approval_requestsController";
import { EcommercemallMemberCancellation_request_snapshotsController } from "./controllers/ecommerceMall/member/cancellation-request-snapshots/EcommercemallMemberCancellation_request_snapshotsController";
import { EcommercemallMemberCancellation_requestsController } from "./controllers/ecommerceMall/member/cancellation-requests/EcommercemallMemberCancellation_requestsController";
import { EcommercemallMemberCustomerAddressesController } from "./controllers/ecommerceMall/member/customer/addresses/EcommercemallMemberCustomerAddressesController";
import { EcommercemallMemberCustomerCancel_requestsController } from "./controllers/ecommerceMall/member/customer/cancel-requests/EcommercemallMemberCustomerCancel_requestsController";
import { EcommercemallMemberCustomerOrdersController } from "./controllers/ecommerceMall/member/customer/orders/cancel/EcommercemallMemberCustomerOrdersController";
import { EcommercemallMemberCustomerOrdersItemsRefundController } from "./controllers/ecommerceMall/member/customer/orders/items/refund/EcommercemallMemberCustomerOrdersItemsRefundController";
import { EcommercemallMemberCustomerRefund_requestsController } from "./controllers/ecommerceMall/member/customer/refund-requests/EcommercemallMemberCustomerRefund_requestsController";
import { EcommercemallMemberCustomersAddressesController } from "./controllers/ecommerceMall/member/customers/addresses/EcommercemallMemberCustomersAddressesController";
import { EcommercemallMemberEmail_verificationsController } from "./controllers/ecommerceMall/member/email-verifications/EcommercemallMemberEmail_verificationsController";
import { EcommercemallMemberMemberReviewsController } from "./controllers/ecommerceMall/member/member/reviews/EcommercemallMemberMemberReviewsController";
import { EcommercemallMemberOrder_itemsController } from "./controllers/ecommerceMall/member/order-items/EcommercemallMemberOrder_itemsController";
import { EcommercemallMemberOrder_snapshotsController } from "./controllers/ecommerceMall/member/order-snapshots/EcommercemallMemberOrder_snapshotsController";
import { EcommercemallMemberOrdersController } from "./controllers/ecommerceMall/member/orders/EcommercemallMemberOrdersController";
import { EcommercemallMemberOrdersItemsReviewsController } from "./controllers/ecommerceMall/member/orders/items/reviews/EcommercemallMemberOrdersItemsReviewsController";
import { EcommercemallMemberPassword_resetsController } from "./controllers/ecommerceMall/member/password-resets/EcommercemallMemberPassword_resetsController";
import { EcommercemallMemberProfileController } from "./controllers/ecommerceMall/member/profile/EcommercemallMemberProfileController";
import { EcommercemallMemberRefund_request_snapshotsController } from "./controllers/ecommerceMall/member/refund-request-snapshots/EcommercemallMemberRefund_request_snapshotsController";
import { EcommercemallMemberRefund_requestsController } from "./controllers/ecommerceMall/member/refund-requests/EcommercemallMemberRefund_requestsController";
import { EcommercemallMemberReviewsController } from "./controllers/ecommerceMall/member/reviews/EcommercemallMemberReviewsController";
import { EcommercemallMemberSessionsController } from "./controllers/ecommerceMall/member/sessions/EcommercemallMemberSessionsController";
import { EcommercemallMemberShipmentsController } from "./controllers/ecommerceMall/member/shipments/EcommercemallMemberShipmentsController";
import { EcommercemallMemberShipmentsConfirm_deliveryController } from "./controllers/ecommerceMall/member/shipments/confirm-delivery/EcommercemallMemberShipmentsConfirm_deliveryController";
import { EcommercemallMemberShipmentsDelivery_statusController } from "./controllers/ecommerceMall/member/shipments/delivery-status/EcommercemallMemberShipmentsDelivery_statusController";
import { EcommercemallMemberWishlistsController } from "./controllers/ecommerceMall/member/wishlists/EcommercemallMemberWishlistsController";
import { EcommercemallMemberWishlistsItemsController } from "./controllers/ecommerceMall/member/wishlists/items/EcommercemallMemberWishlistsItemsController";
import { EcommercemallMembersController } from "./controllers/ecommerceMall/members/EcommercemallMembersController";
import { EcommercemallProductsController } from "./controllers/ecommerceMall/products/EcommercemallProductsController";
import { EcommercemallProductsImagesController } from "./controllers/ecommerceMall/products/images/EcommercemallProductsImagesController";
import { EcommercemallProductsStatsController } from "./controllers/ecommerceMall/products/stats/EcommercemallProductsStatsController";
import { EcommercemallProductsVariantsController } from "./controllers/ecommerceMall/products/variants/EcommercemallProductsVariantsController";
import { EcommercemallReviewsController } from "./controllers/ecommerceMall/reviews/EcommercemallReviewsController";
import { EcommercemallReviewsSnapshotsController } from "./controllers/ecommerceMall/reviews/snapshots/EcommercemallReviewsSnapshotsController";
import { EcommercemallSellerCancellation_request_snapshotsController } from "./controllers/ecommerceMall/seller/cancellation-request-snapshots/EcommercemallSellerCancellation_request_snapshotsController";
import { EcommercemallSellerCancellation_requestsController } from "./controllers/ecommerceMall/seller/cancellation-requests/EcommercemallSellerCancellation_requestsController";
import { EcommercemallSellerCategoriesController } from "./controllers/ecommerceMall/seller/categories/stats/EcommercemallSellerCategoriesController";
import { EcommercemallSellerDashboard_metricsController } from "./controllers/ecommerceMall/seller/dashboard-metrics/EcommercemallSellerDashboard_metricsController";
import { EcommercemallSellerDashboardController } from "./controllers/ecommerceMall/seller/dashboard/EcommercemallSellerDashboardController";
import { EcommercemallSellerOrder_itemsController } from "./controllers/ecommerceMall/seller/order-items/EcommercemallSellerOrder_itemsController";
import { EcommercemallSellerOrder_snapshotsController } from "./controllers/ecommerceMall/seller/order-snapshots/EcommercemallSellerOrder_snapshotsController";
import { EcommercemallSellerProductsController } from "./controllers/ecommerceMall/seller/products/EcommercemallSellerProductsController";
import { EcommercemallSellerProductsImagesController } from "./controllers/ecommerceMall/seller/products/images/EcommercemallSellerProductsImagesController";
import { EcommercemallSellerProductsImagesReorderController } from "./controllers/ecommerceMall/seller/products/images/reorder/EcommercemallSellerProductsImagesReorderController";
import { EcommercemallSellerProductsSnapshotsController } from "./controllers/ecommerceMall/seller/products/snapshots/EcommercemallSellerProductsSnapshotsController";
import { EcommercemallSellerProductsVariantsController } from "./controllers/ecommerceMall/seller/products/variants/EcommercemallSellerProductsVariantsController";
import { EcommercemallSellerProductsVariantsInventory_historyController } from "./controllers/ecommerceMall/seller/products/variants/inventory-history/EcommercemallSellerProductsVariantsInventory_historyController";
import { EcommercemallSellerProductsVariantsInventoryController } from "./controllers/ecommerceMall/seller/products/variants/inventory/EcommercemallSellerProductsVariantsInventoryController";
import { EcommercemallSellerProductsVariantsInventoryHistoryController } from "./controllers/ecommerceMall/seller/products/variants/inventory/history/EcommercemallSellerProductsVariantsInventoryHistoryController";
import { EcommercemallSellerProductsVariantsSnapshotsController } from "./controllers/ecommerceMall/seller/products/variants/snapshots/EcommercemallSellerProductsVariantsSnapshotsController";
import { EcommercemallSellerRefund_request_snapshotsController } from "./controllers/ecommerceMall/seller/refund-request-snapshots/EcommercemallSellerRefund_request_snapshotsController";
import { EcommercemallSellerRefund_requestsController } from "./controllers/ecommerceMall/seller/refund-requests/EcommercemallSellerRefund_requestsController";
import { EcommercemallSellerSeller_approval_requestsController } from "./controllers/ecommerceMall/seller/seller-approval-requests/EcommercemallSellerSeller_approval_requestsController";
import { EcommercemallSellerSeller_approvalsController } from "./controllers/ecommerceMall/seller/seller-approvals/EcommercemallSellerSeller_approvalsController";
import { EcommercemallSellerSeller_profileController } from "./controllers/ecommerceMall/seller/seller-profile/EcommercemallSellerSeller_profileController";
import { EcommercemallSellerSellerCancel_requestsController } from "./controllers/ecommerceMall/seller/seller/cancel-requests/EcommercemallSellerSellerCancel_requestsController";
import { EcommercemallSellerSellerCancel_requestsPendingController } from "./controllers/ecommerceMall/seller/seller/cancel-requests/pending/EcommercemallSellerSellerCancel_requestsPendingController";
import { EcommercemallSellerSellerRefund_requestsController } from "./controllers/ecommerceMall/seller/seller/refund-requests/EcommercemallSellerSellerRefund_requestsController";
import { EcommercemallSellerShipmentsController } from "./controllers/ecommerceMall/seller/shipments/metrics/EcommercemallSellerShipmentsController";
import { EcommercemallSellerShop_profile_snapshotsController } from "./controllers/ecommerceMall/seller/shop-profile-snapshots/EcommercemallSellerShop_profile_snapshotsController";
import { EcommercemallSellerShop_profilesController } from "./controllers/ecommerceMall/seller/shop-profiles/EcommercemallSellerShop_profilesController";
import { EcommercemallSellersController } from "./controllers/ecommerceMall/sellers/EcommercemallSellersController";
import { EcommercemallSuperadministratorAdmin_requestsController } from "./controllers/ecommerceMall/superAdministrator/admin-requests/EcommercemallSuperadministratorAdmin_requestsController";
import { EcommercemallSuperadministratorAdministration_requestsController } from "./controllers/ecommerceMall/superAdministrator/administration-requests/EcommercemallSuperadministratorAdministration_requestsController";
import { EcommercemallSuperadministratorAdministrator_approval_request_snapshotsController } from "./controllers/ecommerceMall/superAdministrator/administrator-approval-request-snapshots/EcommercemallSuperadministratorAdministrator_approval_request_snapshotsController";
import { EcommercemallSuperadministratorAdministrator_approval_requestsController } from "./controllers/ecommerceMall/superAdministrator/administrator-approval-requests/EcommercemallSuperadministratorAdministrator_approval_requestsController";
import { EcommercemallSuperadministratorAdministrator_gradesController } from "./controllers/ecommerceMall/superAdministrator/administrator-grades/EcommercemallSuperadministratorAdministrator_gradesController";
import { EcommercemallSuperadministratorAdministratorsGradeController } from "./controllers/ecommerceMall/superAdministrator/administrators/grade/EcommercemallSuperadministratorAdministratorsGradeController";
import { EcommercemallSuperadministratorAdministratorsGradesController } from "./controllers/ecommerceMall/superAdministrator/administrators/grades/action/EcommercemallSuperadministratorAdministratorsGradesController";
import { EcommercemallSuperadministratorBansController } from "./controllers/ecommerceMall/superAdministrator/bans/EcommercemallSuperadministratorBansController";
import { EcommercemallSuperadministratorCancellation_request_snapshotsController } from "./controllers/ecommerceMall/superAdministrator/cancellation-request-snapshots/EcommercemallSuperadministratorCancellation_request_snapshotsController";
import { EcommercemallSuperadministratorCancellation_requestsController } from "./controllers/ecommerceMall/superAdministrator/cancellation-requests/EcommercemallSuperadministratorCancellation_requestsController";
import { EcommercemallSuperadministratorCustomersController } from "./controllers/ecommerceMall/superAdministrator/customers/EcommercemallSuperadministratorCustomersController";
import { EcommercemallSuperadministratorOrder_itemsController } from "./controllers/ecommerceMall/superAdministrator/order-items/EcommercemallSuperadministratorOrder_itemsController";
import { EcommercemallSuperadministratorOrder_snapshotsController } from "./controllers/ecommerceMall/superAdministrator/order-snapshots/EcommercemallSuperadministratorOrder_snapshotsController";
import { EcommercemallSuperadministratorOrdersController } from "./controllers/ecommerceMall/superAdministrator/orders/EcommercemallSuperadministratorOrdersController";
import { EcommercemallSuperadministratorRefund_request_snapshotsController } from "./controllers/ecommerceMall/superAdministrator/refund-request-snapshots/EcommercemallSuperadministratorRefund_request_snapshotsController";
import { EcommercemallSuperadministratorRefund_requestsController } from "./controllers/ecommerceMall/superAdministrator/refund-requests/EcommercemallSuperadministratorRefund_requestsController";
import { EcommercemallSuperadministratorUser_ban_of_customersController } from "./controllers/ecommerceMall/superAdministrator/user-ban-of-customers/EcommercemallSuperadministratorUser_ban_of_customersController";
import { EcommercemallSuperadministratorUser_ban_of_sellersController } from "./controllers/ecommerceMall/superAdministrator/user-ban-of-sellers/EcommercemallSuperadministratorUser_ban_of_sellersController";
import { EcommercemallSuperadministratorUser_bansController } from "./controllers/ecommerceMall/superAdministrator/user-bans/EcommercemallSuperadministratorUser_bansController";
import { EcommercemallSuperadministratorUsersController } from "./controllers/ecommerceMall/superAdministrator/users/EcommercemallSuperadministratorUsersController";

@Module({
  controllers: [
    EcommercemallAuthGuestController,
    EcommercemallAuthMemberController,
    EcommercemallAuthSellerController,
    EcommercemallAuthAdministratorController,
    EcommercemallAuthSuper_administratorController,
    EcommercemallMembersController,
    EcommercemallMemberProfileController,
    EcommercemallMemberSessionsController,
    EcommercemallMemberPassword_resetsController,
    EcommercemallMemberEmail_verificationsController,
    EcommercemallMemberAddressesController,
    EcommercemallMemberCustomersAddressesController,
    EcommercemallMemberCustomerAddressesController,
    EcommercemallMemberWishlistsController,
    EcommercemallMemberWishlistsItemsController,
    EcommercemallSellersController,
    EcommercemallAdministratorSellersSessionsController,
    EcommercemallSellerSeller_approvalsController,
    EcommercemallAdministratorSeller_approvalsController,
    EcommercemallSellerShop_profilesController,
    EcommercemallSellerShop_profile_snapshotsController,
    EcommercemallSellerDashboard_metricsController,
    EcommercemallCategoriesController,
    EcommercemallCategoriesProductsController,
    EcommercemallAdministratorCategoriesController,
    EcommercemallProductsController,
    EcommercemallSellerProductsController,
    EcommercemallProductsImagesController,
    EcommercemallSellerProductsImagesController,
    EcommercemallSellerProductsImagesReorderController,
    EcommercemallProductsVariantsController,
    EcommercemallSellerProductsVariantsController,
    EcommercemallReviewsController,
    EcommercemallMemberOrdersItemsReviewsController,
    EcommercemallMemberReviewsController,
    EcommercemallReviewsSnapshotsController,
    EcommercemallProductsStatsController,
    EcommercemallMemberMemberReviewsController,
    EcommercemallSellerProductsVariantsInventoryController,
    EcommercemallSellerProductsSnapshotsController,
    EcommercemallSellerProductsVariantsSnapshotsController,
    EcommercemallMemberOrdersController,
    EcommercemallAdministratorOrdersController,
    EcommercemallSuperadministratorOrdersController,
    EcommercemallMemberOrder_itemsController,
    EcommercemallSellerOrder_itemsController,
    EcommercemallAdministratorOrder_itemsController,
    EcommercemallSuperadministratorOrder_itemsController,
    EcommercemallMemberOrder_snapshotsController,
    EcommercemallSellerOrder_snapshotsController,
    EcommercemallAdministratorOrder_snapshotsController,
    EcommercemallSuperadministratorOrder_snapshotsController,
    EcommercemallMemberCancellation_requestsController,
    EcommercemallSellerCancellation_requestsController,
    EcommercemallAdministratorCancellation_requestsController,
    EcommercemallSuperadministratorCancellation_requestsController,
    EcommercemallMemberRefund_requestsController,
    EcommercemallSellerRefund_requestsController,
    EcommercemallAdministratorRefund_requestsController,
    EcommercemallSuperadministratorRefund_requestsController,
    EcommercemallMemberRefund_request_snapshotsController,
    EcommercemallSellerRefund_request_snapshotsController,
    EcommercemallAdministratorRefund_request_snapshotsController,
    EcommercemallSuperadministratorRefund_request_snapshotsController,
    EcommercemallMemberCancellation_request_snapshotsController,
    EcommercemallSellerCancellation_request_snapshotsController,
    EcommercemallAdministratorCancellation_request_snapshotsController,
    EcommercemallSuperadministratorCancellation_request_snapshotsController,
    EcommercemallMemberShipmentsController,
    EcommercemallMemberShipmentsConfirm_deliveryController,
    EcommercemallAdministratorCustomersController,
    EcommercemallSuperadministratorCustomersController,
    EcommercemallSellerSeller_profileController,
    EcommercemallAdministratorAdministrator_gradesController,
    EcommercemallSuperadministratorAdministrator_gradesController,
    EcommercemallAdministratorUser_bansController,
    EcommercemallSuperadministratorUser_bansController,
    EcommercemallAdministratorUser_ban_of_customersController,
    EcommercemallSuperadministratorUser_ban_of_customersController,
    EcommercemallAdministratorUser_ban_of_sellersController,
    EcommercemallSuperadministratorUser_ban_of_sellersController,
    EcommercemallAdministratorSeller_approval_requestsController,
    EcommercemallSellerSeller_approval_requestsController,
    EcommercemallAdministratorSeller_suspensionsController,
    EcommercemallSuperadministratorAdministrator_approval_requestsController,
    EcommercemallMemberAdministrator_approval_requestsController,
    EcommercemallAdministratorSeller_approval_request_snapshotsController,
    EcommercemallSuperadministratorAdministrator_approval_request_snapshotsController,
    EcommercemallAdministratorCategoriesSnapshotsController,
    EcommercemallAdministratorProductsController,
    EcommercemallAdministratorOrdersSnapshotsController,
    EcommercemallAdministratorShipmentsItemsController,
    EcommercemallAdministratorShipment_itemsController,
    EcommercemallAdministratorCategoriesProductsController,
    EcommercemallSellerDashboardController,
    EcommercemallAdministratorSeller_approvalsPendingController,
    EcommercemallSellerProductsVariantsInventory_historyController,
    EcommercemallSellerProductsVariantsInventoryHistoryController,
    EcommercemallSellerCategoriesController,
    EcommercemallMemberCustomerOrdersController,
    EcommercemallMemberCustomerCancel_requestsController,
    EcommercemallMemberCustomerOrdersItemsRefundController,
    EcommercemallMemberCustomerRefund_requestsController,
    EcommercemallSellerSellerCancel_requestsPendingController,
    EcommercemallSellerSellerCancel_requestsController,
    EcommercemallSellerSellerRefund_requestsController,
    EcommercemallMemberShipmentsDelivery_statusController,
    EcommercemallSellerShipmentsController,
    EcommercemallSuperadministratorAdministratorsGradesController,
    EcommercemallSuperadministratorAdministration_requestsController,
    EcommercemallSuperadministratorBansController,
    EcommercemallAdministratorBansController,
    EcommercemallSuperadministratorUsersController,
    EcommercemallAdministratorUsersController,
    EcommercemallAdministratorUsersBanController,
    EcommercemallAdministratorSellersPendingController,
    EcommercemallAdministratorSellersSuspension_historyController,
    EcommercemallSuperadministratorAdmin_requestsController,
    EcommercemallSuperadministratorAdministratorsGradeController,
    EcommercemallAdministratorProductsSearchController,
    EcommercemallAdministratorOrdersAnalyticsController,
  ],
})
export class MyModule {}
