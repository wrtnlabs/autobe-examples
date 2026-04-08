import { Module } from "@nestjs/common";

import { MallplatformAdministratorAdministrator_approval_requestsController } from "./controllers/mallPlatform/administrator/administrator-approval-requests/MallplatformAdministratorAdministrator_approval_requestsController";
import { MallplatformAdministratorAdministratorapprovalrequestsController } from "./controllers/mallPlatform/administrator/administratorApprovalRequests/MallplatformAdministratorAdministratorapprovalrequestsController";
import { MallplatformAdministratorAdministratorapprovalrequestsSnapshotsController } from "./controllers/mallPlatform/administrator/administratorApprovalRequests/snapshots/MallplatformAdministratorAdministratorapprovalrequestsSnapshotsController";
import { MallplatformAdministratorAdministratorsController } from "./controllers/mallPlatform/administrator/administrators/MallplatformAdministratorAdministratorsController";
import { MallplatformAdministratorApprovalrequestsController } from "./controllers/mallPlatform/administrator/approvalRequests/MallplatformAdministratorApprovalrequestsController";
import { MallplatformAdministratorApprovalrequestsDecisionsController } from "./controllers/mallPlatform/administrator/approvalRequests/decisions/MallplatformAdministratorApprovalrequestsDecisionsController";
import { MallplatformAdministratorCategoriesController } from "./controllers/mallPlatform/administrator/categories/MallplatformAdministratorCategoriesController";
import { MallplatformAdministratorCategoriesSubcategoriesController } from "./controllers/mallPlatform/administrator/categories/subcategories/MallplatformAdministratorCategoriesSubcategoriesController";
import { MallplatformAdministratorCustomersController } from "./controllers/mallPlatform/administrator/customers/MallplatformAdministratorCustomersController";
import { MallplatformAdministratorOrderitemsCancellationrequestsController } from "./controllers/mallPlatform/administrator/orderItems/cancellationRequests/MallplatformAdministratorOrderitemsCancellationrequestsController";
import { MallplatformAdministratorOrderitemsCancellationrequestsDecisionController } from "./controllers/mallPlatform/administrator/orderItems/cancellationRequests/decision/MallplatformAdministratorOrderitemsCancellationrequestsDecisionController";
import { MallplatformAdministratorOrderitemsCancellationrequestsSnapshotsController } from "./controllers/mallPlatform/administrator/orderItems/cancellationRequests/snapshots/MallplatformAdministratorOrderitemsCancellationrequestsSnapshotsController";
import { MallplatformAdministratorOrderitemsForce_cancelController } from "./controllers/mallPlatform/administrator/orderItems/force-cancel/MallplatformAdministratorOrderitemsForce_cancelController";
import { MallplatformAdministratorOrderitemsForce_refundController } from "./controllers/mallPlatform/administrator/orderItems/force-refund/MallplatformAdministratorOrderitemsForce_refundController";
import { MallplatformAdministratorOrderitemsRefundrequestsController } from "./controllers/mallPlatform/administrator/orderItems/refundRequests/MallplatformAdministratorOrderitemsRefundrequestsController";
import { MallplatformAdministratorOrderitemsRefundrequestsSnapshotsController } from "./controllers/mallPlatform/administrator/orderItems/refundRequests/snapshots/MallplatformAdministratorOrderitemsRefundrequestsSnapshotsController";
import { MallplatformAdministratorOrderitemsSnapshotsController } from "./controllers/mallPlatform/administrator/orderItems/snapshots/MallplatformAdministratorOrderitemsSnapshotsController";
import { MallplatformAdministratorOrdersForce_cancelController } from "./controllers/mallPlatform/administrator/orders/force-cancel/MallplatformAdministratorOrdersForce_cancelController";
import { MallplatformAdministratorOrdersForce_refundController } from "./controllers/mallPlatform/administrator/orders/force-refund/MallplatformAdministratorOrdersForce_refundController";
import { MallplatformAdministratorOrdersOrderitemsController } from "./controllers/mallPlatform/administrator/orders/orderItems/MallplatformAdministratorOrdersOrderitemsController";
import { MallplatformAdministratorOrdersOrderitemsSnapshotsController } from "./controllers/mallPlatform/administrator/orders/orderItems/snapshots/MallplatformAdministratorOrdersOrderitemsSnapshotsController";
import { MallplatformAdministratorOrdersOrderitemsSnapshotsVariantoptionsController } from "./controllers/mallPlatform/administrator/orders/orderItems/snapshots/variantOptions/MallplatformAdministratorOrdersOrderitemsSnapshotsVariantoptionsController";
import { MallplatformAdministratorPassword_resetsController } from "./controllers/mallPlatform/administrator/password-resets/MallplatformAdministratorPassword_resetsController";
import { MallplatformAdministratorProductsController } from "./controllers/mallPlatform/administrator/products/MallplatformAdministratorProductsController";
import { MallplatformAdministratorProductsImagesnapshotsController } from "./controllers/mallPlatform/administrator/products/imageSnapshots/MallplatformAdministratorProductsImagesnapshotsController";
import { MallplatformAdministratorProductsSnapshotsController } from "./controllers/mallPlatform/administrator/products/snapshots/MallplatformAdministratorProductsSnapshotsController";
import { MallplatformAdministratorProductsSnapshotsImagesController } from "./controllers/mallPlatform/administrator/products/snapshots/images/MallplatformAdministratorProductsSnapshotsImagesController";
import { MallplatformAdministratorProductsSnapshotsVariantsController } from "./controllers/mallPlatform/administrator/products/snapshots/variants/MallplatformAdministratorProductsSnapshotsVariantsController";
import { MallplatformAdministratorProductsVariantsnapshotsController } from "./controllers/mallPlatform/administrator/products/variantSnapshots/MallplatformAdministratorProductsVariantsnapshotsController";
import { MallplatformAdministratorProductsVariantsnapshotsOptionsController } from "./controllers/mallPlatform/administrator/products/variantSnapshots/options/MallplatformAdministratorProductsVariantsnapshotsOptionsController";
import { MallplatformAdministratorReviewsSnapshotsController } from "./controllers/mallPlatform/administrator/reviews/snapshots/MallplatformAdministratorReviewsSnapshotsController";
import { MallplatformAdministratorSelleraccountsController } from "./controllers/mallPlatform/administrator/sellerAccounts/MallplatformAdministratorSelleraccountsController";
import { MallplatformAdministratorSellerprofilesController } from "./controllers/mallPlatform/administrator/sellerProfiles/MallplatformAdministratorSellerprofilesController";
import { MallplatformAdministratorSellersController } from "./controllers/mallPlatform/administrator/sellers/MallplatformAdministratorSellersController";
import { MallplatformAdministratorSellersProfileSnapshotsController } from "./controllers/mallPlatform/administrator/sellers/profile/snapshots/MallplatformAdministratorSellersProfileSnapshotsController";
import { MallplatformAdministratorSessionsController } from "./controllers/mallPlatform/administrator/sessions/MallplatformAdministratorSessionsController";
import { MallplatformAdministratorShipmentsController } from "./controllers/mallPlatform/administrator/shipments/MallplatformAdministratorShipmentsController";
import { MallplatformAdministratorShipmentsItemsController } from "./controllers/mallPlatform/administrator/shipments/items/MallplatformAdministratorShipmentsItemsController";
import { MallplatformAdministratorShipmentsTrackingController } from "./controllers/mallPlatform/administrator/shipments/tracking/MallplatformAdministratorShipmentsTrackingController";
import { MallplatformAuthAdministratorController } from "./controllers/mallPlatform/auth/administrator/MallplatformAuthAdministratorController";
import { MallplatformAuthCustomerController } from "./controllers/mallPlatform/auth/customer/MallplatformAuthCustomerController";
import { MallplatformAuthSellerController } from "./controllers/mallPlatform/auth/seller/MallplatformAuthSellerController";
import { MallplatformCustomerAdministratorapprovalrequestsController } from "./controllers/mallPlatform/customer/administratorApprovalRequests/MallplatformCustomerAdministratorapprovalrequestsController";
import { MallplatformCustomerCartsActiveController } from "./controllers/mallPlatform/customer/carts/active/MallplatformCustomerCartsActiveController";
import { MallplatformCustomerCartsItemsController } from "./controllers/mallPlatform/customer/carts/items/MallplatformCustomerCartsItemsController";
import { MallplatformCustomerCategoriesController } from "./controllers/mallPlatform/customer/categories/MallplatformCustomerCategoriesController";
import { MallplatformCustomerCategoriesProductsController } from "./controllers/mallPlatform/customer/categories/products/MallplatformCustomerCategoriesProductsController";
import { MallplatformCustomerCategoriesSubcategoriesController } from "./controllers/mallPlatform/customer/categories/subcategories/MallplatformCustomerCategoriesSubcategoriesController";
import { MallplatformCustomerOrderitemsCancellationrequestsController } from "./controllers/mallPlatform/customer/orderItems/cancellationRequests/MallplatformCustomerOrderitemsCancellationrequestsController";
import { MallplatformCustomerOrderitemsCancellationrequestsSnapshotsController } from "./controllers/mallPlatform/customer/orderItems/cancellationRequests/snapshots/MallplatformCustomerOrderitemsCancellationrequestsSnapshotsController";
import { MallplatformCustomerOrderitemsRefundrequestsController } from "./controllers/mallPlatform/customer/orderItems/refundRequests/MallplatformCustomerOrderitemsRefundrequestsController";
import { MallplatformCustomerOrderitemsRefundrequestsSnapshotsController } from "./controllers/mallPlatform/customer/orderItems/refundRequests/snapshots/MallplatformCustomerOrderitemsRefundrequestsSnapshotsController";
import { MallplatformCustomerOrderitemsSnapshotsController } from "./controllers/mallPlatform/customer/orderItems/snapshots/MallplatformCustomerOrderitemsSnapshotsController";
import { MallplatformCustomerOrdersController } from "./controllers/mallPlatform/customer/orders/MallplatformCustomerOrdersController";
import { MallplatformCustomerOrdersOrderitemsController } from "./controllers/mallPlatform/customer/orders/orderItems/MallplatformCustomerOrdersOrderitemsController";
import { MallplatformCustomerOrdersOrderitemsSnapshotsController } from "./controllers/mallPlatform/customer/orders/orderItems/snapshots/MallplatformCustomerOrdersOrderitemsSnapshotsController";
import { MallplatformCustomerOrdersOrderitemsSnapshotsVariantoptionsController } from "./controllers/mallPlatform/customer/orders/orderItems/snapshots/variantOptions/MallplatformCustomerOrdersOrderitemsSnapshotsVariantoptionsController";
import { MallplatformCustomerPassword_resetsController } from "./controllers/mallPlatform/customer/password-resets/MallplatformCustomerPassword_resetsController";
import { MallplatformCustomerPasswordsController } from "./controllers/mallPlatform/customer/passwords/MallplatformCustomerPasswordsController";
import { MallplatformCustomerProfileController } from "./controllers/mallPlatform/customer/profile/MallplatformCustomerProfileController";
import { MallplatformCustomerReviewsController } from "./controllers/mallPlatform/customer/reviews/MallplatformCustomerReviewsController";
import { MallplatformCustomerReviewsSnapshotsController } from "./controllers/mallPlatform/customer/reviews/snapshots/MallplatformCustomerReviewsSnapshotsController";
import { MallplatformCustomerSellerprofilesController } from "./controllers/mallPlatform/customer/sellerProfiles/MallplatformCustomerSellerprofilesController";
import { MallplatformCustomerSessionsController } from "./controllers/mallPlatform/customer/sessions/MallplatformCustomerSessionsController";
import { MallplatformCustomerShipmentsController } from "./controllers/mallPlatform/customer/shipments/MallplatformCustomerShipmentsController";
import { MallplatformCustomerShipmentsConfirm_deliveryController } from "./controllers/mallPlatform/customer/shipments/confirm-delivery/MallplatformCustomerShipmentsConfirm_deliveryController";
import { MallplatformCustomerShipmentsItemsController } from "./controllers/mallPlatform/customer/shipments/items/MallplatformCustomerShipmentsItemsController";
import { MallplatformCustomerShipmentsTrackingController } from "./controllers/mallPlatform/customer/shipments/tracking/MallplatformCustomerShipmentsTrackingController";
import { MallplatformCustomerShipping_addressesController } from "./controllers/mallPlatform/customer/shipping-addresses/MallplatformCustomerShipping_addressesController";
import { MallplatformCustomerShipping_addresses_defaultController } from "./controllers/mallPlatform/customer/shipping-addresses/default/MallplatformCustomerShipping_addresses_defaultController";
import { MallplatformCustomerWishlistsController } from "./controllers/mallPlatform/customer/wishlists/MallplatformCustomerWishlistsController";
import { MallplatformCustomerWishlistsItemsController } from "./controllers/mallPlatform/customer/wishlists/items/MallplatformCustomerWishlistsItemsController";
import { MallplatformProductsController } from "./controllers/mallPlatform/products/MallplatformProductsController";
import { MallplatformProductsImagesController } from "./controllers/mallPlatform/products/images/MallplatformProductsImagesController";
import { MallplatformProductsReviewsController } from "./controllers/mallPlatform/products/reviews/MallplatformProductsReviewsController";
import { MallplatformProductsVariantsController } from "./controllers/mallPlatform/products/variants/MallplatformProductsVariantsController";
import { MallplatformReviewsController } from "./controllers/mallPlatform/reviews/MallplatformReviewsController";
import { MallplatformSellerAccountStatusController } from "./controllers/mallPlatform/seller/account/status/MallplatformSellerAccountStatusController";
import { MallplatformSellerAdministratorapprovalrequestsController } from "./controllers/mallPlatform/seller/administratorApprovalRequests/MallplatformSellerAdministratorapprovalrequestsController";
import { MallplatformSellerApprovalrequestsController } from "./controllers/mallPlatform/seller/approvalRequests/MallplatformSellerApprovalrequestsController";
import { MallplatformSellerApprovalrequestsResubmissionsController } from "./controllers/mallPlatform/seller/approvalRequests/resubmissions/MallplatformSellerApprovalrequestsResubmissionsController";
import { MallplatformSellerOrderitemsController } from "./controllers/mallPlatform/seller/orderItems/MallplatformSellerOrderitemsController";
import { MallplatformSellerOrderitemsCancellationrequestsController } from "./controllers/mallPlatform/seller/orderItems/cancellationRequests/MallplatformSellerOrderitemsCancellationrequestsController";
import { MallplatformSellerOrderitemsCancellationrequestsDecisionController } from "./controllers/mallPlatform/seller/orderItems/cancellationRequests/decision/MallplatformSellerOrderitemsCancellationrequestsDecisionController";
import { MallplatformSellerOrderitemsCancellationrequestsSnapshotsController } from "./controllers/mallPlatform/seller/orderItems/cancellationRequests/snapshots/MallplatformSellerOrderitemsCancellationrequestsSnapshotsController";
import { MallplatformSellerOrderitemsForce_cancelController } from "./controllers/mallPlatform/seller/orderItems/force-cancel/MallplatformSellerOrderitemsForce_cancelController";
import { MallplatformSellerOrderitemsForce_refundController } from "./controllers/mallPlatform/seller/orderItems/force-refund/MallplatformSellerOrderitemsForce_refundController";
import { MallplatformSellerOrderitemsRefundrequestsController } from "./controllers/mallPlatform/seller/orderItems/refundRequests/MallplatformSellerOrderitemsRefundrequestsController";
import { MallplatformSellerOrderitemsRefundrequestsSnapshotsController } from "./controllers/mallPlatform/seller/orderItems/refundRequests/snapshots/MallplatformSellerOrderitemsRefundrequestsSnapshotsController";
import { MallplatformSellerOrderitemsSnapshotsController } from "./controllers/mallPlatform/seller/orderItems/snapshots/MallplatformSellerOrderitemsSnapshotsController";
import { MallplatformSellerOrdersOrderitemsSnapshotsController } from "./controllers/mallPlatform/seller/orders/orderItems/snapshots/MallplatformSellerOrdersOrderitemsSnapshotsController";
import { MallplatformSellerOrdersOrderitemsSnapshotsVariantoptionsController } from "./controllers/mallPlatform/seller/orders/orderItems/snapshots/variantOptions/MallplatformSellerOrdersOrderitemsSnapshotsVariantoptionsController";
import { MallplatformSellerProductsController } from "./controllers/mallPlatform/seller/products/MallplatformSellerProductsController";
import { MallplatformSellerProductsImagesnapshotsController } from "./controllers/mallPlatform/seller/products/imageSnapshots/MallplatformSellerProductsImagesnapshotsController";
import { MallplatformSellerProductsImagesController } from "./controllers/mallPlatform/seller/products/images/MallplatformSellerProductsImagesController";
import { MallplatformSellerProductsSnapshotsController } from "./controllers/mallPlatform/seller/products/snapshots/MallplatformSellerProductsSnapshotsController";
import { MallplatformSellerProductsSnapshotsImagesController } from "./controllers/mallPlatform/seller/products/snapshots/images/MallplatformSellerProductsSnapshotsImagesController";
import { MallplatformSellerProductsSnapshotsVariantsController } from "./controllers/mallPlatform/seller/products/snapshots/variants/MallplatformSellerProductsSnapshotsVariantsController";
import { MallplatformSellerProductsVariantsnapshotsController } from "./controllers/mallPlatform/seller/products/variantSnapshots/MallplatformSellerProductsVariantsnapshotsController";
import { MallplatformSellerProductsVariantsnapshotsOptionsController } from "./controllers/mallPlatform/seller/products/variantSnapshots/options/MallplatformSellerProductsVariantsnapshotsOptionsController";
import { MallplatformSellerProductsVariantsController } from "./controllers/mallPlatform/seller/products/variants/MallplatformSellerProductsVariantsController";
import { MallplatformSellerProductsVariantsInventoryrecordsController } from "./controllers/mallPlatform/seller/products/variants/inventoryRecords/MallplatformSellerProductsVariantsInventoryrecordsController";
import { MallplatformSellerSelleraccountController } from "./controllers/mallPlatform/seller/sellerAccount/MallplatformSellerSelleraccountController";
import { MallplatformSellerSellersProfileSnapshotsController } from "./controllers/mallPlatform/seller/sellers/profile/snapshots/MallplatformSellerSellersProfileSnapshotsController";
import { MallplatformSellerShipmentsController } from "./controllers/mallPlatform/seller/shipments/MallplatformSellerShipmentsController";
import { MallplatformSellerShipmentsFulfillmentController } from "./controllers/mallPlatform/seller/shipments/fulfillment/MallplatformSellerShipmentsFulfillmentController";
import { MallplatformSellerShipmentsItemsController } from "./controllers/mallPlatform/seller/shipments/items/MallplatformSellerShipmentsItemsController";
import { MallplatformSellerShipmentsTrackingController } from "./controllers/mallPlatform/seller/shipments/tracking/MallplatformSellerShipmentsTrackingController";

@Module({
  controllers: [
    MallplatformAuthCustomerController,
    MallplatformAuthSellerController,
    MallplatformAuthAdministratorController,
    MallplatformAdministratorCustomersController,
    MallplatformCustomerProfileController,
    MallplatformCustomerSessionsController,
    MallplatformAdministratorSessionsController,
    MallplatformAdministratorPassword_resetsController,
    MallplatformAdministratorSellersController,
    MallplatformAdministratorAdministratorsController,
    MallplatformAdministratorAdministrator_approval_requestsController,
    MallplatformCustomerShipping_addressesController,
    MallplatformCustomerShipping_addresses_defaultController,
    MallplatformAdministratorSelleraccountsController,
    MallplatformSellerSelleraccountController,
    MallplatformCustomerSellerprofilesController,
    MallplatformAdministratorSellerprofilesController,
    MallplatformCustomerCategoriesController,
    MallplatformAdministratorCategoriesController,
    MallplatformCustomerCategoriesProductsController,
    MallplatformAdministratorCategoriesSubcategoriesController,
    MallplatformCustomerCategoriesSubcategoriesController,
    MallplatformProductsController,
    MallplatformSellerProductsController,
    MallplatformAdministratorProductsController,
    MallplatformProductsImagesController,
    MallplatformSellerProductsImagesController,
    MallplatformProductsVariantsController,
    MallplatformSellerProductsVariantsController,
    MallplatformSellerProductsVariantsInventoryrecordsController,
    MallplatformSellerProductsImagesnapshotsController,
    MallplatformAdministratorProductsImagesnapshotsController,
    MallplatformSellerProductsVariantsnapshotsController,
    MallplatformAdministratorProductsVariantsnapshotsController,
    MallplatformSellerProductsVariantsnapshotsOptionsController,
    MallplatformAdministratorProductsVariantsnapshotsOptionsController,
    MallplatformCustomerCartsActiveController,
    MallplatformCustomerCartsItemsController,
    MallplatformCustomerWishlistsController,
    MallplatformCustomerWishlistsItemsController,
    MallplatformCustomerOrdersController,
    MallplatformSellerOrderitemsController,
    MallplatformCustomerOrdersOrderitemsController,
    MallplatformAdministratorOrdersOrderitemsController,
    MallplatformCustomerOrdersOrderitemsSnapshotsController,
    MallplatformSellerOrdersOrderitemsSnapshotsController,
    MallplatformAdministratorOrdersOrderitemsSnapshotsController,
    MallplatformCustomerOrdersOrderitemsSnapshotsVariantoptionsController,
    MallplatformSellerOrdersOrderitemsSnapshotsVariantoptionsController,
    MallplatformAdministratorOrdersOrderitemsSnapshotsVariantoptionsController,
    MallplatformSellerShipmentsController,
    MallplatformAdministratorShipmentsController,
    MallplatformCustomerShipmentsController,
    MallplatformSellerShipmentsItemsController,
    MallplatformAdministratorShipmentsItemsController,
    MallplatformCustomerShipmentsItemsController,
    MallplatformCustomerOrderitemsCancellationrequestsController,
    MallplatformSellerOrderitemsCancellationrequestsController,
    MallplatformAdministratorOrderitemsCancellationrequestsController,
    MallplatformCustomerOrderitemsCancellationrequestsSnapshotsController,
    MallplatformSellerOrderitemsCancellationrequestsSnapshotsController,
    MallplatformAdministratorOrderitemsCancellationrequestsSnapshotsController,
    MallplatformCustomerOrderitemsRefundrequestsController,
    MallplatformSellerOrderitemsRefundrequestsController,
    MallplatformAdministratorOrderitemsRefundrequestsController,
    MallplatformCustomerOrderitemsRefundrequestsSnapshotsController,
    MallplatformSellerOrderitemsRefundrequestsSnapshotsController,
    MallplatformAdministratorOrderitemsRefundrequestsSnapshotsController,
    MallplatformProductsReviewsController,
    MallplatformCustomerReviewsController,
    MallplatformReviewsController,
    MallplatformCustomerReviewsSnapshotsController,
    MallplatformAdministratorReviewsSnapshotsController,
    MallplatformSellerProductsSnapshotsController,
    MallplatformAdministratorProductsSnapshotsController,
    MallplatformSellerSellersProfileSnapshotsController,
    MallplatformAdministratorSellersProfileSnapshotsController,
    MallplatformCustomerOrderitemsSnapshotsController,
    MallplatformSellerOrderitemsSnapshotsController,
    MallplatformAdministratorOrderitemsSnapshotsController,
    MallplatformAdministratorAdministratorapprovalrequestsSnapshotsController,
    MallplatformSellerProductsSnapshotsVariantsController,
    MallplatformAdministratorProductsSnapshotsVariantsController,
    MallplatformSellerProductsSnapshotsImagesController,
    MallplatformAdministratorProductsSnapshotsImagesController,
    MallplatformCustomerAdministratorapprovalrequestsController,
    MallplatformSellerAdministratorapprovalrequestsController,
    MallplatformAdministratorAdministratorapprovalrequestsController,
    MallplatformSellerApprovalrequestsController,
    MallplatformAdministratorApprovalrequestsController,
    MallplatformCustomerPasswordsController,
    MallplatformCustomerPassword_resetsController,
    MallplatformSellerAccountStatusController,
    MallplatformCustomerShipmentsConfirm_deliveryController,
    MallplatformSellerOrderitemsForce_cancelController,
    MallplatformAdministratorOrderitemsForce_cancelController,
    MallplatformSellerOrderitemsForce_refundController,
    MallplatformAdministratorOrderitemsForce_refundController,
    MallplatformAdministratorOrdersForce_cancelController,
    MallplatformAdministratorOrdersForce_refundController,
    MallplatformSellerShipmentsFulfillmentController,
    MallplatformCustomerShipmentsTrackingController,
    MallplatformSellerShipmentsTrackingController,
    MallplatformAdministratorShipmentsTrackingController,
    MallplatformSellerOrderitemsCancellationrequestsDecisionController,
    MallplatformAdministratorOrderitemsCancellationrequestsDecisionController,
    MallplatformAdministratorApprovalrequestsDecisionsController,
    MallplatformSellerApprovalrequestsResubmissionsController,
  ],
})
export class MyModule {}
