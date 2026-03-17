import { Module } from "@nestjs/common";

import { EcommercemallAdminAdminsController } from "./controllers/ecommerceMall/admin/admins/EcommercemallAdminAdminsController";
import { EcommercemallAdminAudit_logsController } from "./controllers/ecommerceMall/admin/audit-logs/EcommercemallAdminAudit_logsController";
import { EcommercemallAdminCancellationrequestsController } from "./controllers/ecommerceMall/admin/cancellationRequests/EcommercemallAdminCancellationrequestsController";
import { EcommercemallAdminCancellationrequestsSnapshotsController } from "./controllers/ecommerceMall/admin/cancellationRequests/snapshots/EcommercemallAdminCancellationrequestsSnapshotsController";
import { EcommercemallAdminCategoriesController } from "./controllers/ecommerceMall/admin/categories/EcommercemallAdminCategoriesController";
import { EcommercemallAdminGuestsController } from "./controllers/ecommerceMall/admin/guests/EcommercemallAdminGuestsController";
import { EcommercemallAdminGuestsSessionsController } from "./controllers/ecommerceMall/admin/guests/sessions/EcommercemallAdminGuestsSessionsController";
import { EcommercemallAdminOrderanalyticsController } from "./controllers/ecommerceMall/admin/orderAnalytics/EcommercemallAdminOrderanalyticsController";
import { EcommercemallAdminOrdersController } from "./controllers/ecommerceMall/admin/orders/EcommercemallAdminOrdersController";
import { EcommercemallAdminOrdersItemsController } from "./controllers/ecommerceMall/admin/orders/items/EcommercemallAdminOrdersItemsController";
import { EcommercemallAdminOrdersItemsProductSnapshotsController } from "./controllers/ecommerceMall/admin/orders/items/product/snapshots/EcommercemallAdminOrdersItemsProductSnapshotsController";
import { EcommercemallAdminOrdersItemsSellerSnapshotsController } from "./controllers/ecommerceMall/admin/orders/items/seller/snapshots/EcommercemallAdminOrdersItemsSellerSnapshotsController";
import { EcommercemallAdminOrdersItemsSnapshotsController } from "./controllers/ecommerceMall/admin/orders/items/snapshots/EcommercemallAdminOrdersItemsSnapshotsController";
import { EcommercemallAdminOrdersItemsVariantSnapshotsController } from "./controllers/ecommerceMall/admin/orders/items/variant/snapshots/EcommercemallAdminOrdersItemsVariantSnapshotsController";
import { EcommercemallAdminOrdersSnapshotsController } from "./controllers/ecommerceMall/admin/orders/snapshots/EcommercemallAdminOrdersSnapshotsController";
import { EcommercemallAdminProductsController } from "./controllers/ecommerceMall/admin/products/EcommercemallAdminProductsController";
import { EcommercemallAdminProductsDeletedController } from "./controllers/ecommerceMall/admin/products/deleted/EcommercemallAdminProductsDeletedController";
import { EcommercemallAdminProductsSnapshotsController } from "./controllers/ecommerceMall/admin/products/snapshots/EcommercemallAdminProductsSnapshotsController";
import { EcommercemallAdminProductsVariantsSnapshotsController } from "./controllers/ecommerceMall/admin/products/variants/snapshots/EcommercemallAdminProductsVariantsSnapshotsController";
import { EcommercemallAdminProductsVariantsSnapshotsCompareController } from "./controllers/ecommerceMall/admin/products/variants/snapshots/compare/EcommercemallAdminProductsVariantsSnapshotsCompareController";
import { EcommercemallAdminRefundrequestsController } from "./controllers/ecommerceMall/admin/refundRequests/EcommercemallAdminRefundrequestsController";
import { EcommercemallAdminRefundrequestsSnapshotsController } from "./controllers/ecommerceMall/admin/refundRequests/snapshots/EcommercemallAdminRefundrequestsSnapshotsController";
import { EcommercemallAdminRegistrationsController } from "./controllers/ecommerceMall/admin/registrations/EcommercemallAdminRegistrationsController";
import { EcommercemallAdminReviewsSnapshotsController } from "./controllers/ecommerceMall/admin/reviews/snapshots/EcommercemallAdminReviewsSnapshotsController";
import { EcommercemallAdminSeller_registrationsController } from "./controllers/ecommerceMall/admin/seller-registrations/EcommercemallAdminSeller_registrationsController";
import { EcommercemallAdminSeller_registrationsSnapshotsController } from "./controllers/ecommerceMall/admin/seller-registrations/snapshots/EcommercemallAdminSeller_registrationsSnapshotsController";
import { EcommercemallAdminSellerRegistration_snapshotsController } from "./controllers/ecommerceMall/admin/seller/registration-snapshots/EcommercemallAdminSellerRegistration_snapshotsController";
import { EcommercemallAdminSellersOrderitemsController } from "./controllers/ecommerceMall/admin/sellers/orderItems/EcommercemallAdminSellersOrderitemsController";
import { EcommercemallAdminSellersProfile_snapshotsController } from "./controllers/ecommerceMall/admin/sellers/profile-snapshots/EcommercemallAdminSellersProfile_snapshotsController";
import { EcommercemallAdminSellersProfileController } from "./controllers/ecommerceMall/admin/sellers/profile/EcommercemallAdminSellersProfileController";
import { EcommercemallAdminSellersProfileSnapshotsController } from "./controllers/ecommerceMall/admin/sellers/profile/snapshots/EcommercemallAdminSellersProfileSnapshotsController";
import { EcommercemallAdminSellersProfileSnapshotsCompareController } from "./controllers/ecommerceMall/admin/sellers/profile/snapshots/compare/EcommercemallAdminSellersProfileSnapshotsCompareController";
import { EcommercemallAdminSellersRegistrationsController } from "./controllers/ecommerceMall/admin/sellers/registrations/EcommercemallAdminSellersRegistrationsController";
import { EcommercemallAdminSellersStatusController } from "./controllers/ecommerceMall/admin/sellers/status/EcommercemallAdminSellersStatusController";
import { EcommercemallAdminShipmentsController } from "./controllers/ecommerceMall/admin/shipments/EcommercemallAdminShipmentsController";
import { EcommercemallAdminShipmentsDeliveriesController } from "./controllers/ecommerceMall/admin/shipments/deliveries/EcommercemallAdminShipmentsDeliveriesController";
import { EcommercemallAdminShipmentsItemsController } from "./controllers/ecommerceMall/admin/shipments/items/EcommercemallAdminShipmentsItemsController";
import { EcommercemallAuthAdminController } from "./controllers/ecommerceMall/auth/admin/EcommercemallAuthAdminController";
import { EcommercemallAuthCustomerController } from "./controllers/ecommerceMall/auth/customer/EcommercemallAuthCustomerController";
import { EcommercemallAuthGuestController } from "./controllers/ecommerceMall/auth/guest/EcommercemallAuthGuestController";
import { EcommercemallAuthSellerController } from "./controllers/ecommerceMall/auth/seller/EcommercemallAuthSellerController";
import { EcommercemallAuthSuperadminController } from "./controllers/ecommerceMall/auth/superAdmin/EcommercemallAuthSuperadminController";
import { EcommercemallCategoriesController } from "./controllers/ecommerceMall/categories/EcommercemallCategoriesController";
import { EcommercemallCustomerAddressesActionsSet_defaultController } from "./controllers/ecommerceMall/customer/addresses/actions/set-default/EcommercemallCustomerAddressesActionsSet_defaultController";
import { EcommercemallCustomerAdmin_promotion_requestsController } from "./controllers/ecommerceMall/customer/admin-promotion-requests/EcommercemallCustomerAdmin_promotion_requestsController";
import { EcommercemallCustomerAdmin_promotion_requestsSnapshotsController } from "./controllers/ecommerceMall/customer/admin-promotion-requests/snapshots/EcommercemallCustomerAdmin_promotion_requestsSnapshotsController";
import { EcommercemallCustomerCancellationrequestsController } from "./controllers/ecommerceMall/customer/cancellationRequests/EcommercemallCustomerCancellationrequestsController";
import { EcommercemallCustomerCancellationrequestsSnapshotsController } from "./controllers/ecommerceMall/customer/cancellationRequests/snapshots/EcommercemallCustomerCancellationrequestsSnapshotsController";
import { EcommercemallCustomerCartController } from "./controllers/ecommerceMall/customer/cart/EcommercemallCustomerCartController";
import { EcommercemallCustomerCartitemsController } from "./controllers/ecommerceMall/customer/cartItems/EcommercemallCustomerCartitemsController";
import { EcommercemallCustomerCheckoutController } from "./controllers/ecommerceMall/customer/checkout/EcommercemallCustomerCheckoutController";
import { EcommercemallCustomerOrderitemsEligibleforcancellationController } from "./controllers/ecommerceMall/customer/orderItems/eligibleForCancellation/EcommercemallCustomerOrderitemsEligibleforcancellationController";
import { EcommercemallCustomerOrderitemsEligibleforrefundController } from "./controllers/ecommerceMall/customer/orderItems/eligibleForRefund/EcommercemallCustomerOrderitemsEligibleforrefundController";
import { EcommercemallCustomerOrderitemsEligibleforreviewController } from "./controllers/ecommerceMall/customer/orderItems/eligibleForReview/EcommercemallCustomerOrderitemsEligibleforreviewController";
import { EcommercemallCustomerOrdersController } from "./controllers/ecommerceMall/customer/orders/EcommercemallCustomerOrdersController";
import { EcommercemallCustomerOrdersItemsController } from "./controllers/ecommerceMall/customer/orders/items/EcommercemallCustomerOrdersItemsController";
import { EcommercemallCustomerOrdersItemsProductSnapshotsController } from "./controllers/ecommerceMall/customer/orders/items/product/snapshots/EcommercemallCustomerOrdersItemsProductSnapshotsController";
import { EcommercemallCustomerOrdersItemsSellerSnapshotsController } from "./controllers/ecommerceMall/customer/orders/items/seller/snapshots/EcommercemallCustomerOrdersItemsSellerSnapshotsController";
import { EcommercemallCustomerOrdersItemsSnapshotsController } from "./controllers/ecommerceMall/customer/orders/items/snapshots/EcommercemallCustomerOrdersItemsSnapshotsController";
import { EcommercemallCustomerOrdersItemsVariantSnapshotsController } from "./controllers/ecommerceMall/customer/orders/items/variant/snapshots/EcommercemallCustomerOrdersItemsVariantSnapshotsController";
import { EcommercemallCustomerOrdersSnapshotsController } from "./controllers/ecommerceMall/customer/orders/snapshots/EcommercemallCustomerOrdersSnapshotsController";
import { EcommercemallCustomerPassword_resetsController } from "./controllers/ecommerceMall/customer/password-resets/EcommercemallCustomerPassword_resetsController";
import { EcommercemallCustomerProductsSearchController } from "./controllers/ecommerceMall/customer/products/search/EcommercemallCustomerProductsSearchController";
import { EcommercemallCustomerProfileController } from "./controllers/ecommerceMall/customer/profile/EcommercemallCustomerProfileController";
import { EcommercemallCustomerRefundrequestsController } from "./controllers/ecommerceMall/customer/refundRequests/EcommercemallCustomerRefundrequestsController";
import { EcommercemallCustomerRefundrequestsSnapshotsController } from "./controllers/ecommerceMall/customer/refundRequests/snapshots/EcommercemallCustomerRefundrequestsSnapshotsController";
import { EcommercemallCustomerReviewsController } from "./controllers/ecommerceMall/customer/reviews/EcommercemallCustomerReviewsController";
import { EcommercemallCustomerReviewsSnapshotsController } from "./controllers/ecommerceMall/customer/reviews/snapshots/EcommercemallCustomerReviewsSnapshotsController";
import { EcommercemallCustomerSessionsController } from "./controllers/ecommerceMall/customer/sessions/EcommercemallCustomerSessionsController";
import { EcommercemallCustomerShipmentsController } from "./controllers/ecommerceMall/customer/shipments/EcommercemallCustomerShipmentsController";
import { EcommercemallCustomerShipmentsDeliveriesController } from "./controllers/ecommerceMall/customer/shipments/deliveries/EcommercemallCustomerShipmentsDeliveriesController";
import { EcommercemallCustomerShipmentsDeliveryConfirmController } from "./controllers/ecommerceMall/customer/shipments/delivery/confirm/EcommercemallCustomerShipmentsDeliveryConfirmController";
import { EcommercemallCustomerShipmentsItemsController } from "./controllers/ecommerceMall/customer/shipments/items/EcommercemallCustomerShipmentsItemsController";
import { EcommercemallCustomerWishlistController } from "./controllers/ecommerceMall/customer/wishlist/EcommercemallCustomerWishlistController";
import { EcommercemallCustomerWishlistConvert_to_cartController } from "./controllers/ecommerceMall/customer/wishlist/convert-to-cart/EcommercemallCustomerWishlistConvert_to_cartController";
import { EcommercemallCustomersController } from "./controllers/ecommerceMall/customers/EcommercemallCustomersController";
import { EcommercemallProductsController } from "./controllers/ecommerceMall/products/EcommercemallProductsController";
import { EcommercemallProductsImagesController } from "./controllers/ecommerceMall/products/images/EcommercemallProductsImagesController";
import { EcommercemallProductsVariantsController } from "./controllers/ecommerceMall/products/variants/EcommercemallProductsVariantsController";
import { EcommercemallReviewsController } from "./controllers/ecommerceMall/reviews/EcommercemallReviewsController";
import { EcommercemallSellerAccountController } from "./controllers/ecommerceMall/seller/account/EcommercemallSellerAccountController";
import { EcommercemallSellerAdmin_promotion_requestsController } from "./controllers/ecommerceMall/seller/admin-promotion-requests/EcommercemallSellerAdmin_promotion_requestsController";
import { EcommercemallSellerAdmin_promotion_requestsSnapshotsController } from "./controllers/ecommerceMall/seller/admin-promotion-requests/snapshots/EcommercemallSellerAdmin_promotion_requestsSnapshotsController";
import { EcommercemallSellerCancellationrequestsController } from "./controllers/ecommerceMall/seller/cancellationRequests/EcommercemallSellerCancellationrequestsController";
import { EcommercemallSellerCancellationrequestsActionsController } from "./controllers/ecommerceMall/seller/cancellationRequests/actions/respond/EcommercemallSellerCancellationrequestsActionsController";
import { EcommercemallSellerCancellationrequestsSnapshotsController } from "./controllers/ecommerceMall/seller/cancellationRequests/snapshots/EcommercemallSellerCancellationrequestsSnapshotsController";
import { EcommercemallSellerDashboardController } from "./controllers/ecommerceMall/seller/dashboard/EcommercemallSellerDashboardController";
import { EcommercemallSellerOrderitemsController } from "./controllers/ecommerceMall/seller/orderItems/EcommercemallSellerOrderitemsController";
import { EcommercemallSellerOrderitemsEligibleforshipmentController } from "./controllers/ecommerceMall/seller/orderItems/eligibleForShipment/EcommercemallSellerOrderitemsEligibleforshipmentController";
import { EcommercemallSellerOrdersController } from "./controllers/ecommerceMall/seller/orders/EcommercemallSellerOrdersController";
import { EcommercemallSellerOrdersItemsController } from "./controllers/ecommerceMall/seller/orders/items/EcommercemallSellerOrdersItemsController";
import { EcommercemallSellerOrdersItemsSnapshotsController } from "./controllers/ecommerceMall/seller/orders/items/snapshots/EcommercemallSellerOrdersItemsSnapshotsController";
import { EcommercemallSellerPendingrequestsSummaryController } from "./controllers/ecommerceMall/seller/pendingRequests/summary/EcommercemallSellerPendingrequestsSummaryController";
import { EcommercemallSellerProductsController } from "./controllers/ecommerceMall/seller/products/EcommercemallSellerProductsController";
import { EcommercemallSellerProductsDeletedController } from "./controllers/ecommerceMall/seller/products/deleted/EcommercemallSellerProductsDeletedController";
import { EcommercemallSellerProductsImagesController } from "./controllers/ecommerceMall/seller/products/images/EcommercemallSellerProductsImagesController";
import { EcommercemallSellerProductsSnapshotsController } from "./controllers/ecommerceMall/seller/products/snapshots/EcommercemallSellerProductsSnapshotsController";
import { EcommercemallSellerProductsVariantsController } from "./controllers/ecommerceMall/seller/products/variants/EcommercemallSellerProductsVariantsController";
import { EcommercemallSellerProductsVariantsSnapshotsController } from "./controllers/ecommerceMall/seller/products/variants/snapshots/EcommercemallSellerProductsVariantsSnapshotsController";
import { EcommercemallSellerProductsVariantsSnapshotsCompareController } from "./controllers/ecommerceMall/seller/products/variants/snapshots/compare/EcommercemallSellerProductsVariantsSnapshotsCompareController";
import { EcommercemallSellerProfileController } from "./controllers/ecommerceMall/seller/profile/EcommercemallSellerProfileController";
import { EcommercemallSellerProfileSnapshotsController } from "./controllers/ecommerceMall/seller/profile/snapshots/EcommercemallSellerProfileSnapshotsController";
import { EcommercemallSellerRefundrequestsController } from "./controllers/ecommerceMall/seller/refundRequests/EcommercemallSellerRefundrequestsController";
import { EcommercemallSellerRefundrequestsActionsController } from "./controllers/ecommerceMall/seller/refundRequests/actions/respond/EcommercemallSellerRefundrequestsActionsController";
import { EcommercemallSellerRefundrequestsSnapshotsController } from "./controllers/ecommerceMall/seller/refundRequests/snapshots/EcommercemallSellerRefundrequestsSnapshotsController";
import { EcommercemallSellerRegistrationsController } from "./controllers/ecommerceMall/seller/registrations/EcommercemallSellerRegistrationsController";
import { EcommercemallSellerSeller_registrationsController } from "./controllers/ecommerceMall/seller/seller-registrations/EcommercemallSellerSeller_registrationsController";
import { EcommercemallSellerSeller_registrationsSnapshotsController } from "./controllers/ecommerceMall/seller/seller-registrations/snapshots/EcommercemallSellerSeller_registrationsSnapshotsController";
import { EcommercemallSellerShipmentsController } from "./controllers/ecommerceMall/seller/shipments/EcommercemallSellerShipmentsController";
import { EcommercemallSellerShipmentsDeliveriesController } from "./controllers/ecommerceMall/seller/shipments/deliveries/EcommercemallSellerShipmentsDeliveriesController";
import { EcommercemallSellerShipmentsItemsController } from "./controllers/ecommerceMall/seller/shipments/items/EcommercemallSellerShipmentsItemsController";
import { EcommercemallSellerVariantsInventoryController } from "./controllers/ecommerceMall/seller/variants/inventory/EcommercemallSellerVariantsInventoryController";
import { EcommercemallSellerVariantsOptionsController } from "./controllers/ecommerceMall/seller/variants/options/EcommercemallSellerVariantsOptionsController";
import { EcommercemallSellersController } from "./controllers/ecommerceMall/sellers/EcommercemallSellersController";
import { EcommercemallSuperadminAdmin_promotion_requestsController } from "./controllers/ecommerceMall/superAdmin/admin-promotion-requests/EcommercemallSuperadminAdmin_promotion_requestsController";
import { EcommercemallSuperadminAdmin_promotion_requestsSnapshotsController } from "./controllers/ecommerceMall/superAdmin/admin-promotion-requests/snapshots/EcommercemallSuperadminAdmin_promotion_requestsSnapshotsController";
import { EcommercemallSuperadminAdminsController } from "./controllers/ecommerceMall/superAdmin/admins/EcommercemallSuperadminAdminsController";
import { EcommercemallSuperadminAdminsGradeController } from "./controllers/ecommerceMall/superAdmin/admins/grade/EcommercemallSuperadminAdminsGradeController";
import { EcommercemallSuperadminAdminsPromotion_requestsController } from "./controllers/ecommerceMall/superAdmin/admins/promotion-requests/review/EcommercemallSuperadminAdminsPromotion_requestsController";
import { EcommercemallSuperadminAudit_logsController } from "./controllers/ecommerceMall/superAdmin/audit-logs/EcommercemallSuperadminAudit_logsController";
import { EcommercemallSuperadminOrderanalyticsController } from "./controllers/ecommerceMall/superAdmin/orderAnalytics/EcommercemallSuperadminOrderanalyticsController";
import { EcommercemallSuperadminSeller_registrationsController } from "./controllers/ecommerceMall/superAdmin/seller-registrations/EcommercemallSuperadminSeller_registrationsController";
import { EcommercemallSuperadminSeller_registrationsSnapshotsController } from "./controllers/ecommerceMall/superAdmin/seller-registrations/snapshots/EcommercemallSuperadminSeller_registrationsSnapshotsController";
import { EcommercemallSuperadminSellersOrderitemsController } from "./controllers/ecommerceMall/superAdmin/sellers/orderItems/EcommercemallSuperadminSellersOrderitemsController";
import { EcommercemallSuperadminSellersRegistrationsController } from "./controllers/ecommerceMall/superAdmin/sellers/registrations/review/EcommercemallSuperadminSellersRegistrationsController";
import { EcommercemallSuperadminSuper_admin_audit_logsController } from "./controllers/ecommerceMall/superAdmin/super-admin-audit-logs/EcommercemallSuperadminSuper_admin_audit_logsController";
import { EcommercemallSuperadminSuper_adminsController } from "./controllers/ecommerceMall/superAdmin/super-admins/EcommercemallSuperadminSuper_adminsController";
import { EcommercemallVariantsInventoryController } from "./controllers/ecommerceMall/variants/inventory/EcommercemallVariantsInventoryController";
import { EcommercemallVariantsOptionsController } from "./controllers/ecommerceMall/variants/options/EcommercemallVariantsOptionsController";

@Module({
  controllers: [
    EcommercemallAuthGuestController,
    EcommercemallAuthCustomerController,
    EcommercemallAuthSellerController,
    EcommercemallAuthAdminController,
    EcommercemallAuthSuperadminController,
    EcommercemallAdminGuestsController,
    EcommercemallAdminGuestsSessionsController,
    EcommercemallCustomersController,
    EcommercemallCustomerProfileController,
    EcommercemallCustomerSessionsController,
    EcommercemallCustomerPassword_resetsController,
    EcommercemallSellersController,
    EcommercemallAdminAdminsController,
    EcommercemallSuperadminAdminsController,
    EcommercemallAdminAudit_logsController,
    EcommercemallSuperadminAudit_logsController,
    EcommercemallSuperadminSuper_adminsController,
    EcommercemallSuperadminSuper_admin_audit_logsController,
    EcommercemallAdminRegistrationsController,
    EcommercemallAdminSellerRegistration_snapshotsController,
    EcommercemallSellerRegistrationsController,
    EcommercemallSellerProfileController,
    EcommercemallAdminSellersProfileController,
    EcommercemallAdminSellersStatusController,
    EcommercemallSellerProfileSnapshotsController,
    EcommercemallAdminSellersProfile_snapshotsController,
    EcommercemallAdminSellersRegistrationsController,
    EcommercemallCustomerAdmin_promotion_requestsController,
    EcommercemallSellerAdmin_promotion_requestsController,
    EcommercemallSuperadminAdmin_promotion_requestsController,
    EcommercemallCustomerAdmin_promotion_requestsSnapshotsController,
    EcommercemallSellerAdmin_promotion_requestsSnapshotsController,
    EcommercemallSuperadminAdmin_promotion_requestsSnapshotsController,
    EcommercemallSellerSeller_registrationsController,
    EcommercemallAdminSeller_registrationsController,
    EcommercemallSuperadminSeller_registrationsController,
    EcommercemallSellerSeller_registrationsSnapshotsController,
    EcommercemallAdminSeller_registrationsSnapshotsController,
    EcommercemallSuperadminSeller_registrationsSnapshotsController,
    EcommercemallCategoriesController,
    EcommercemallAdminCategoriesController,
    EcommercemallProductsController,
    EcommercemallSellerProductsController,
    EcommercemallAdminProductsController,
    EcommercemallProductsImagesController,
    EcommercemallSellerProductsImagesController,
    EcommercemallProductsVariantsController,
    EcommercemallSellerProductsVariantsController,
    EcommercemallVariantsOptionsController,
    EcommercemallSellerVariantsOptionsController,
    EcommercemallVariantsInventoryController,
    EcommercemallSellerVariantsInventoryController,
    EcommercemallCustomerWishlistController,
    EcommercemallCustomerCartController,
    EcommercemallCustomerOrdersController,
    EcommercemallSellerOrdersController,
    EcommercemallAdminOrdersController,
    EcommercemallCustomerOrdersItemsController,
    EcommercemallSellerOrdersItemsController,
    EcommercemallAdminOrdersItemsController,
    EcommercemallCustomerOrdersSnapshotsController,
    EcommercemallAdminOrdersSnapshotsController,
    EcommercemallCustomerOrdersItemsSnapshotsController,
    EcommercemallSellerOrdersItemsSnapshotsController,
    EcommercemallAdminOrdersItemsSnapshotsController,
    EcommercemallCustomerCartitemsController,
    EcommercemallSellerShipmentsController,
    EcommercemallCustomerShipmentsController,
    EcommercemallAdminShipmentsController,
    EcommercemallSellerShipmentsItemsController,
    EcommercemallCustomerShipmentsItemsController,
    EcommercemallAdminShipmentsItemsController,
    EcommercemallSellerShipmentsDeliveriesController,
    EcommercemallCustomerShipmentsDeliveriesController,
    EcommercemallAdminShipmentsDeliveriesController,
    EcommercemallCustomerCancellationrequestsController,
    EcommercemallSellerCancellationrequestsController,
    EcommercemallAdminCancellationrequestsController,
    EcommercemallSellerCancellationrequestsActionsController,
    EcommercemallCustomerCancellationrequestsSnapshotsController,
    EcommercemallSellerCancellationrequestsSnapshotsController,
    EcommercemallAdminCancellationrequestsSnapshotsController,
    EcommercemallCustomerRefundrequestsController,
    EcommercemallSellerRefundrequestsController,
    EcommercemallAdminRefundrequestsController,
    EcommercemallSellerRefundrequestsActionsController,
    EcommercemallCustomerRefundrequestsSnapshotsController,
    EcommercemallSellerRefundrequestsSnapshotsController,
    EcommercemallAdminRefundrequestsSnapshotsController,
    EcommercemallReviewsController,
    EcommercemallCustomerReviewsController,
    EcommercemallCustomerReviewsSnapshotsController,
    EcommercemallAdminReviewsSnapshotsController,
    EcommercemallCustomerOrderitemsEligibleforcancellationController,
    EcommercemallCustomerOrderitemsEligibleforrefundController,
    EcommercemallCustomerOrderitemsEligibleforreviewController,
    EcommercemallSellerProductsSnapshotsController,
    EcommercemallAdminProductsSnapshotsController,
    EcommercemallSellerProductsVariantsSnapshotsController,
    EcommercemallAdminProductsVariantsSnapshotsController,
    EcommercemallAdminSellersProfileSnapshotsController,
    EcommercemallCustomerOrdersItemsProductSnapshotsController,
    EcommercemallAdminOrdersItemsProductSnapshotsController,
    EcommercemallCustomerOrdersItemsVariantSnapshotsController,
    EcommercemallAdminOrdersItemsVariantSnapshotsController,
    EcommercemallCustomerOrdersItemsSellerSnapshotsController,
    EcommercemallAdminOrdersItemsSellerSnapshotsController,
    EcommercemallCustomerAddressesActionsSet_defaultController,
    EcommercemallSellerDashboardController,
    EcommercemallSellerAccountController,
    EcommercemallSuperadminSellersRegistrationsController,
    EcommercemallSuperadminAdminsPromotion_requestsController,
    EcommercemallSuperadminAdminsGradeController,
    EcommercemallCustomerProductsSearchController,
    EcommercemallSellerProductsDeletedController,
    EcommercemallAdminProductsDeletedController,
    EcommercemallCustomerWishlistConvert_to_cartController,
    EcommercemallSellerOrderitemsController,
    EcommercemallCustomerCheckoutController,
    EcommercemallAdminOrderanalyticsController,
    EcommercemallSuperadminOrderanalyticsController,
    EcommercemallAdminSellersOrderitemsController,
    EcommercemallSuperadminSellersOrderitemsController,
    EcommercemallSellerOrderitemsEligibleforshipmentController,
    EcommercemallCustomerShipmentsDeliveryConfirmController,
    EcommercemallSellerPendingrequestsSummaryController,
    EcommercemallSellerProductsVariantsSnapshotsCompareController,
    EcommercemallAdminProductsVariantsSnapshotsCompareController,
    EcommercemallAdminSellersProfileSnapshotsCompareController,
  ],
})
export class MyModule {}
