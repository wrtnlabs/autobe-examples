import { Module } from "@nestjs/common";

import { MallplatformAdministratorAdministratorapprovalrequestsnapshotsController } from "./controllers/mallPlatform/administrator/administratorApprovalRequestSnapshots/MallplatformAdministratorAdministratorapprovalrequestsnapshotsController";
import { MallplatformAdministratorAdministratorapprovalrequestsApproveController } from "./controllers/mallPlatform/administrator/administratorApprovalRequests/approve/MallplatformAdministratorAdministratorapprovalrequestsApproveController";
import { MallplatformAdministratorAdministratorapprovalrequestsController } from "./controllers/mallPlatform/administrator/administratorApprovalRequests/reject/MallplatformAdministratorAdministratorapprovalrequestsController";
import { MallplatformAdministratorAdministratorsController } from "./controllers/mallPlatform/administrator/administrators/MallplatformAdministratorAdministratorsController";
import { MallplatformAdministratorApproval_requestsController } from "./controllers/mallPlatform/administrator/approval-requests/MallplatformAdministratorApproval_requestsController";
import { MallplatformAdministratorApprovalrequestsController } from "./controllers/mallPlatform/administrator/approvalRequests/MallplatformAdministratorApprovalrequestsController";
import { MallplatformAdministratorCategoriesController } from "./controllers/mallPlatform/administrator/categories/MallplatformAdministratorCategoriesController";
import { MallplatformAdministratorCustomersController } from "./controllers/mallPlatform/administrator/customers/MallplatformAdministratorCustomersController";
import { MallplatformAdministratorOrderitemsnapshotsController } from "./controllers/mallPlatform/administrator/orderItemSnapshots/MallplatformAdministratorOrderitemsnapshotsController";
import { MallplatformAdministratorOrderitemsnapshotsVariantoptionsController } from "./controllers/mallPlatform/administrator/orderItemSnapshots/variantOptions/MallplatformAdministratorOrderitemsnapshotsVariantoptionsController";
import { MallplatformAdministratorOrderitemsCancellationrequestsController } from "./controllers/mallPlatform/administrator/orderItems/cancellationRequests/MallplatformAdministratorOrderitemsCancellationrequestsController";
import { MallplatformAdministratorOrderitemsCancellationrequestsApproveController } from "./controllers/mallPlatform/administrator/orderItems/cancellationRequests/approve/MallplatformAdministratorOrderitemsCancellationrequestsApproveController";
import { MallplatformAdministratorOrderitemsCancellationrequestsSnapshotsController } from "./controllers/mallPlatform/administrator/orderItems/cancellationRequests/snapshots/MallplatformAdministratorOrderitemsCancellationrequestsSnapshotsController";
import { MallplatformAdministratorOrderitemsRefundrequestsController } from "./controllers/mallPlatform/administrator/orderItems/refundRequests/MallplatformAdministratorOrderitemsRefundrequestsController";
import { MallplatformAdministratorOrderitemsRefundrequestsSnapshotsController } from "./controllers/mallPlatform/administrator/orderItems/refundRequests/snapshots/MallplatformAdministratorOrderitemsRefundrequestsSnapshotsController";
import { MallplatformAdministratorOrderitemsSnapshotsController } from "./controllers/mallPlatform/administrator/orderItems/snapshots/MallplatformAdministratorOrderitemsSnapshotsController";
import { MallplatformAdministratorOrderitemsSnapshotsVariantoptionsController } from "./controllers/mallPlatform/administrator/orderItems/snapshots/variantOptions/MallplatformAdministratorOrderitemsSnapshotsVariantoptionsController";
import { MallplatformAdministratorOrdersForce_cancelController } from "./controllers/mallPlatform/administrator/orders/force-cancel/MallplatformAdministratorOrdersForce_cancelController";
import { MallplatformAdministratorOrdersForce_refundController } from "./controllers/mallPlatform/administrator/orders/force-refund/MallplatformAdministratorOrdersForce_refundController";
import { MallplatformAdministratorProductsnapshotsController } from "./controllers/mallPlatform/administrator/productSnapshots/MallplatformAdministratorProductsnapshotsController";
import { MallplatformAdministratorProductsnapshotsHistoryController } from "./controllers/mallPlatform/administrator/productSnapshots/history/MallplatformAdministratorProductsnapshotsHistoryController";
import { MallplatformAdministratorProductsnapshotsImagesController } from "./controllers/mallPlatform/administrator/productSnapshots/images/MallplatformAdministratorProductsnapshotsImagesController";
import { MallplatformAdministratorProductsnapshotsVariantsController } from "./controllers/mallPlatform/administrator/productSnapshots/variants/MallplatformAdministratorProductsnapshotsVariantsController";
import { MallplatformAdministratorProductsImagesController } from "./controllers/mallPlatform/administrator/products/images/MallplatformAdministratorProductsImagesController";
import { MallplatformAdministratorProductsReviewsummaryController } from "./controllers/mallPlatform/administrator/products/reviewSummary/MallplatformAdministratorProductsReviewsummaryController";
import { MallplatformAdministratorProductsReviewsController } from "./controllers/mallPlatform/administrator/products/reviews/MallplatformAdministratorProductsReviewsController";
import { MallplatformAdministratorProductsVariantsController } from "./controllers/mallPlatform/administrator/products/variants/MallplatformAdministratorProductsVariantsController";
import { MallplatformAdministratorProductsVariantsInventoryrecordsController } from "./controllers/mallPlatform/administrator/products/variants/inventoryRecords/MallplatformAdministratorProductsVariantsInventoryrecordsController";
import { MallplatformAdministratorProductsVariantsSnapshotsController } from "./controllers/mallPlatform/administrator/products/variants/snapshots/MallplatformAdministratorProductsVariantsSnapshotsController";
import { MallplatformAdministratorProductsVariantsSnapshotsOptionsController } from "./controllers/mallPlatform/administrator/products/variants/snapshots/options/MallplatformAdministratorProductsVariantsSnapshotsOptionsController";
import { MallplatformAdministratorReviewsController } from "./controllers/mallPlatform/administrator/reviews/MallplatformAdministratorReviewsController";
import { MallplatformAdministratorReviewsHistoryController } from "./controllers/mallPlatform/administrator/reviews/history/MallplatformAdministratorReviewsHistoryController";
import { MallplatformAdministratorReviewsSnapshotsController } from "./controllers/mallPlatform/administrator/reviews/snapshots/MallplatformAdministratorReviewsSnapshotsController";
import { MallplatformAdministratorSellerprofilesnapshotsController } from "./controllers/mallPlatform/administrator/sellerProfileSnapshots/MallplatformAdministratorSellerprofilesnapshotsController";
import { MallplatformAdministratorSellerprofilesnapshotsHistoryController } from "./controllers/mallPlatform/administrator/sellerProfileSnapshots/history/MallplatformAdministratorSellerprofilesnapshotsHistoryController";
import { MallplatformAdministratorSellersController } from "./controllers/mallPlatform/administrator/sellers/MallplatformAdministratorSellersController";
import { MallplatformAdministratorSellersStorefront_identitySnapshotsController } from "./controllers/mallPlatform/administrator/sellers/storefront-identity/snapshots/MallplatformAdministratorSellersStorefront_identitySnapshotsController";
import { MallplatformAdministratorShipmentsController } from "./controllers/mallPlatform/administrator/shipments/MallplatformAdministratorShipmentsController";
import { MallplatformAdministratorShipmentsShipmentitemsController } from "./controllers/mallPlatform/administrator/shipments/shipmentItems/MallplatformAdministratorShipmentsShipmentitemsController";
import { MallplatformAuthAdministratorController } from "./controllers/mallPlatform/auth/administrator/MallplatformAuthAdministratorController";
import { MallplatformAuthCustomerController } from "./controllers/mallPlatform/auth/customer/MallplatformAuthCustomerController";
import { MallplatformAuthSellerController } from "./controllers/mallPlatform/auth/seller/MallplatformAuthSellerController";
import { MallplatformCustomerAccountStatusController } from "./controllers/mallPlatform/customer/account/status/MallplatformCustomerAccountStatusController";
import { MallplatformCustomerApprovalrequestsController } from "./controllers/mallPlatform/customer/approvalRequests/MallplatformCustomerApprovalrequestsController";
import { MallplatformCustomerCategoriesController } from "./controllers/mallPlatform/customer/categories/MallplatformCustomerCategoriesController";
import { MallplatformCustomerCategoriesProductsController } from "./controllers/mallPlatform/customer/categories/products/MallplatformCustomerCategoriesProductsController";
import { MallplatformCustomerOrderitemsnapshotsController } from "./controllers/mallPlatform/customer/orderItemSnapshots/MallplatformCustomerOrderitemsnapshotsController";
import { MallplatformCustomerOrderitemsnapshotsVariantoptionsController } from "./controllers/mallPlatform/customer/orderItemSnapshots/variantOptions/MallplatformCustomerOrderitemsnapshotsVariantoptionsController";
import { MallplatformCustomerOrderitemsCancellationrequestsController } from "./controllers/mallPlatform/customer/orderItems/cancellationRequests/MallplatformCustomerOrderitemsCancellationrequestsController";
import { MallplatformCustomerOrderitemsCancellationrequestsSnapshotsController } from "./controllers/mallPlatform/customer/orderItems/cancellationRequests/snapshots/MallplatformCustomerOrderitemsCancellationrequestsSnapshotsController";
import { MallplatformCustomerOrderitemsRefundrequestsController } from "./controllers/mallPlatform/customer/orderItems/refundRequests/MallplatformCustomerOrderitemsRefundrequestsController";
import { MallplatformCustomerOrderitemsRefundrequestsSnapshotsController } from "./controllers/mallPlatform/customer/orderItems/refundRequests/snapshots/MallplatformCustomerOrderitemsRefundrequestsSnapshotsController";
import { MallplatformCustomerOrderitemsSnapshotsController } from "./controllers/mallPlatform/customer/orderItems/snapshots/MallplatformCustomerOrderitemsSnapshotsController";
import { MallplatformCustomerOrderitemsSnapshotsVariantoptionsController } from "./controllers/mallPlatform/customer/orderItems/snapshots/variantOptions/MallplatformCustomerOrderitemsSnapshotsVariantoptionsController";
import { MallplatformCustomerOrdersController } from "./controllers/mallPlatform/customer/orders/MallplatformCustomerOrdersController";
import { MallplatformCustomerPasswordresetsController } from "./controllers/mallPlatform/customer/passwordResets/MallplatformCustomerPasswordresetsController";
import { MallplatformCustomerProductsImagesController } from "./controllers/mallPlatform/customer/products/images/MallplatformCustomerProductsImagesController";
import { MallplatformCustomerProductsReviewsummaryController } from "./controllers/mallPlatform/customer/products/reviewSummary/MallplatformCustomerProductsReviewsummaryController";
import { MallplatformCustomerProductsReviewsController } from "./controllers/mallPlatform/customer/products/reviews/MallplatformCustomerProductsReviewsController";
import { MallplatformCustomerProductsVariantsController } from "./controllers/mallPlatform/customer/products/variants/MallplatformCustomerProductsVariantsController";
import { MallplatformCustomerProfileController } from "./controllers/mallPlatform/customer/profile/MallplatformCustomerProfileController";
import { MallplatformCustomerReviewsController } from "./controllers/mallPlatform/customer/reviews/MallplatformCustomerReviewsController";
import { MallplatformCustomerReviewsHistoryController } from "./controllers/mallPlatform/customer/reviews/history/MallplatformCustomerReviewsHistoryController";
import { MallplatformCustomerReviewsOwnershipController } from "./controllers/mallPlatform/customer/reviews/ownership/MallplatformCustomerReviewsOwnershipController";
import { MallplatformCustomerReviewsSnapshotsController } from "./controllers/mallPlatform/customer/reviews/snapshots/MallplatformCustomerReviewsSnapshotsController";
import { MallplatformCustomerSellersStorefront_identityController } from "./controllers/mallPlatform/customer/sellers/storefront-identity/MallplatformCustomerSellersStorefront_identityController";
import { MallplatformCustomerSessionsController } from "./controllers/mallPlatform/customer/sessions/MallplatformCustomerSessionsController";
import { MallplatformCustomerSessionsLogoutController } from "./controllers/mallPlatform/customer/sessions/logout/MallplatformCustomerSessionsLogoutController";
import { MallplatformCustomerShipmentsController } from "./controllers/mallPlatform/customer/shipments/MallplatformCustomerShipmentsController";
import { MallplatformCustomerShipmentsConfirm_deliveryController } from "./controllers/mallPlatform/customer/shipments/confirm-delivery/MallplatformCustomerShipmentsConfirm_deliveryController";
import { MallplatformCustomerShipmentsShipmentitemsController } from "./controllers/mallPlatform/customer/shipments/shipmentItems/MallplatformCustomerShipmentsShipmentitemsController";
import { MallplatformCustomerShipmentsTrackingController } from "./controllers/mallPlatform/customer/shipments/tracking/MallplatformCustomerShipmentsTrackingController";
import { MallplatformCustomerShipping_addressesController } from "./controllers/mallPlatform/customer/shipping-addresses/MallplatformCustomerShipping_addressesController";
import { MallplatformCustomerShipping_addresses_defaultController } from "./controllers/mallPlatform/customer/shipping-addresses/default/MallplatformCustomerShipping_addresses_defaultController";
import { MallplatformCustomerShopping_cartsController } from "./controllers/mallPlatform/customer/shopping-carts/MallplatformCustomerShopping_cartsController";
import { MallplatformCustomerShopping_cartsCart_itemsController } from "./controllers/mallPlatform/customer/shopping-carts/cart-items/MallplatformCustomerShopping_cartsCart_itemsController";
import { MallplatformCustomerWishlistsController } from "./controllers/mallPlatform/customer/wishlists/MallplatformCustomerWishlistsController";
import { MallplatformCustomerWishlistsWishlist_itemsController } from "./controllers/mallPlatform/customer/wishlists/wishlist-items/MallplatformCustomerWishlistsWishlist_itemsController";
import { MallplatformProductsController } from "./controllers/mallPlatform/products/MallplatformProductsController";
import { MallplatformProductsReviewsController } from "./controllers/mallPlatform/products/reviews/MallplatformProductsReviewsController";
import { MallplatformSellerAccountController } from "./controllers/mallPlatform/seller/account/MallplatformSellerAccountController";
import { MallplatformSellerApproval_requestsController } from "./controllers/mallPlatform/seller/approval-requests/MallplatformSellerApproval_requestsController";
import { MallplatformSellerApprovalrequestsController } from "./controllers/mallPlatform/seller/approvalRequests/MallplatformSellerApprovalrequestsController";
import { MallplatformSellerOrderitemsnapshotsController } from "./controllers/mallPlatform/seller/orderItemSnapshots/MallplatformSellerOrderitemsnapshotsController";
import { MallplatformSellerOrderitemsnapshotsVariantoptionsController } from "./controllers/mallPlatform/seller/orderItemSnapshots/variantOptions/MallplatformSellerOrderitemsnapshotsVariantoptionsController";
import { MallplatformSellerOrderitemsController } from "./controllers/mallPlatform/seller/orderItems/MallplatformSellerOrderitemsController";
import { MallplatformSellerOrderitemsCancellationrequestsController } from "./controllers/mallPlatform/seller/orderItems/cancellationRequests/MallplatformSellerOrderitemsCancellationrequestsController";
import { MallplatformSellerOrderitemsCancellationrequestsApproveController } from "./controllers/mallPlatform/seller/orderItems/cancellationRequests/approve/MallplatformSellerOrderitemsCancellationrequestsApproveController";
import { MallplatformSellerOrderitemsCancellationrequestsSnapshotsController } from "./controllers/mallPlatform/seller/orderItems/cancellationRequests/snapshots/MallplatformSellerOrderitemsCancellationrequestsSnapshotsController";
import { MallplatformSellerOrderitemsRefundrequestsController } from "./controllers/mallPlatform/seller/orderItems/refundRequests/MallplatformSellerOrderitemsRefundrequestsController";
import { MallplatformSellerOrderitemsRefundrequestsSnapshotsController } from "./controllers/mallPlatform/seller/orderItems/refundRequests/snapshots/MallplatformSellerOrderitemsRefundrequestsSnapshotsController";
import { MallplatformSellerOrderitemsSnapshotsController } from "./controllers/mallPlatform/seller/orderItems/snapshots/MallplatformSellerOrderitemsSnapshotsController";
import { MallplatformSellerOrderitemsSnapshotsVariantoptionsController } from "./controllers/mallPlatform/seller/orderItems/snapshots/variantOptions/MallplatformSellerOrderitemsSnapshotsVariantoptionsController";
import { MallplatformSellerProductsnapshotsController } from "./controllers/mallPlatform/seller/productSnapshots/MallplatformSellerProductsnapshotsController";
import { MallplatformSellerProductsnapshotsHistoryController } from "./controllers/mallPlatform/seller/productSnapshots/history/MallplatformSellerProductsnapshotsHistoryController";
import { MallplatformSellerProductsnapshotsImagesController } from "./controllers/mallPlatform/seller/productSnapshots/images/MallplatformSellerProductsnapshotsImagesController";
import { MallplatformSellerProductsnapshotsVariantsController } from "./controllers/mallPlatform/seller/productSnapshots/variants/MallplatformSellerProductsnapshotsVariantsController";
import { MallplatformSellerProductsController } from "./controllers/mallPlatform/seller/products/MallplatformSellerProductsController";
import { MallplatformSellerProductsImagesController } from "./controllers/mallPlatform/seller/products/images/MallplatformSellerProductsImagesController";
import { MallplatformSellerProductsReviewsummaryController } from "./controllers/mallPlatform/seller/products/reviewSummary/MallplatformSellerProductsReviewsummaryController";
import { MallplatformSellerProductsReviewsController } from "./controllers/mallPlatform/seller/products/reviews/MallplatformSellerProductsReviewsController";
import { MallplatformSellerProductsSnapshotsController } from "./controllers/mallPlatform/seller/products/snapshots/MallplatformSellerProductsSnapshotsController";
import { MallplatformSellerProductsVariantsController } from "./controllers/mallPlatform/seller/products/variants/MallplatformSellerProductsVariantsController";
import { MallplatformSellerProductsVariantsInventoryrecordsController } from "./controllers/mallPlatform/seller/products/variants/inventoryRecords/MallplatformSellerProductsVariantsInventoryrecordsController";
import { MallplatformSellerProductsVariantsSnapshotsController } from "./controllers/mallPlatform/seller/products/variants/snapshots/MallplatformSellerProductsVariantsSnapshotsController";
import { MallplatformSellerProductsVariantsSnapshotsOptionsController } from "./controllers/mallPlatform/seller/products/variants/snapshots/options/MallplatformSellerProductsVariantsSnapshotsOptionsController";
import { MallplatformSellerProfileSnapshotsController } from "./controllers/mallPlatform/seller/profile/snapshots/MallplatformSellerProfileSnapshotsController";
import { MallplatformSellerReviewsController } from "./controllers/mallPlatform/seller/reviews/MallplatformSellerReviewsController";
import { MallplatformSellerReviewsHistoryController } from "./controllers/mallPlatform/seller/reviews/history/MallplatformSellerReviewsHistoryController";
import { MallplatformSellerReviewsSnapshotsController } from "./controllers/mallPlatform/seller/reviews/snapshots/MallplatformSellerReviewsSnapshotsController";
import { MallplatformSellerSellerprofilesnapshotsController } from "./controllers/mallPlatform/seller/sellerProfileSnapshots/MallplatformSellerSellerprofilesnapshotsController";
import { MallplatformSellerSellerprofilesnapshotsHistoryController } from "./controllers/mallPlatform/seller/sellerProfileSnapshots/history/MallplatformSellerSellerprofilesnapshotsHistoryController";
import { MallplatformSellerShipmentsController } from "./controllers/mallPlatform/seller/shipments/MallplatformSellerShipmentsController";
import { MallplatformSellerShipmentsEligible_order_itemsController } from "./controllers/mallPlatform/seller/shipments/eligible-order-items/MallplatformSellerShipmentsEligible_order_itemsController";
import { MallplatformSellerShipmentsPendingController } from "./controllers/mallPlatform/seller/shipments/pending/MallplatformSellerShipmentsPendingController";
import { MallplatformSellerShipmentsShipmentitemsController } from "./controllers/mallPlatform/seller/shipments/shipmentItems/MallplatformSellerShipmentsShipmentitemsController";
import { MallplatformSellerShipmentsTrackingController } from "./controllers/mallPlatform/seller/shipments/tracking/MallplatformSellerShipmentsTrackingController";
import { MallplatformSellerStorefront_identityController } from "./controllers/mallPlatform/seller/storefront-identity/MallplatformSellerStorefront_identityController";
import { MallplatformSellerStorefront_identitySnapshotsController } from "./controllers/mallPlatform/seller/storefront-identity/snapshots/MallplatformSellerStorefront_identitySnapshotsController";

@Module({
  controllers: [
    MallplatformAuthCustomerController,
    MallplatformAuthSellerController,
    MallplatformAuthAdministratorController,
    MallplatformAdministratorCustomersController,
    MallplatformCustomerProfileController,
    MallplatformCustomerSessionsController,
    MallplatformCustomerPasswordresetsController,
    MallplatformAdministratorSellersController,
    MallplatformAdministratorAdministratorsController,
    MallplatformAdministratorApprovalrequestsController,
    MallplatformCustomerShipping_addressesController,
    MallplatformCustomerShipping_addresses_defaultController,
    MallplatformSellerAccountController,
    MallplatformSellerProfileSnapshotsController,
    MallplatformCustomerCategoriesController,
    MallplatformCustomerCategoriesProductsController,
    MallplatformAdministratorCategoriesController,
    MallplatformProductsController,
    MallplatformSellerProductsController,
    MallplatformSellerProductsSnapshotsController,
    MallplatformCustomerProductsVariantsController,
    MallplatformSellerProductsVariantsController,
    MallplatformAdministratorProductsVariantsController,
    MallplatformCustomerProductsImagesController,
    MallplatformSellerProductsImagesController,
    MallplatformAdministratorProductsImagesController,
    MallplatformSellerProductsVariantsInventoryrecordsController,
    MallplatformAdministratorProductsVariantsInventoryrecordsController,
    MallplatformSellerProductsVariantsSnapshotsController,
    MallplatformAdministratorProductsVariantsSnapshotsController,
    MallplatformSellerProductsVariantsSnapshotsOptionsController,
    MallplatformAdministratorProductsVariantsSnapshotsOptionsController,
    MallplatformCustomerShopping_cartsController,
    MallplatformCustomerShopping_cartsCart_itemsController,
    MallplatformCustomerWishlistsController,
    MallplatformCustomerWishlistsWishlist_itemsController,
    MallplatformCustomerOrdersController,
    MallplatformSellerOrderitemsController,
    MallplatformCustomerOrderitemsSnapshotsController,
    MallplatformSellerOrderitemsSnapshotsController,
    MallplatformAdministratorOrderitemsSnapshotsController,
    MallplatformCustomerOrderitemsSnapshotsVariantoptionsController,
    MallplatformSellerOrderitemsSnapshotsVariantoptionsController,
    MallplatformAdministratorOrderitemsSnapshotsVariantoptionsController,
    MallplatformSellerShipmentsController,
    MallplatformAdministratorShipmentsController,
    MallplatformCustomerShipmentsController,
    MallplatformSellerShipmentsShipmentitemsController,
    MallplatformAdministratorShipmentsShipmentitemsController,
    MallplatformCustomerShipmentsShipmentitemsController,
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
    MallplatformSellerReviewsController,
    MallplatformAdministratorReviewsController,
    MallplatformCustomerReviewsSnapshotsController,
    MallplatformSellerReviewsSnapshotsController,
    MallplatformAdministratorReviewsSnapshotsController,
    MallplatformSellerProductsnapshotsController,
    MallplatformAdministratorProductsnapshotsController,
    MallplatformSellerSellerprofilesnapshotsController,
    MallplatformAdministratorSellerprofilesnapshotsController,
    MallplatformCustomerOrderitemsnapshotsController,
    MallplatformSellerOrderitemsnapshotsController,
    MallplatformAdministratorOrderitemsnapshotsController,
    MallplatformAdministratorAdministratorapprovalrequestsnapshotsController,
    MallplatformSellerProductsnapshotsImagesController,
    MallplatformAdministratorProductsnapshotsImagesController,
    MallplatformSellerProductsnapshotsVariantsController,
    MallplatformAdministratorProductsnapshotsVariantsController,
    MallplatformCustomerOrderitemsnapshotsVariantoptionsController,
    MallplatformSellerOrderitemsnapshotsVariantoptionsController,
    MallplatformAdministratorOrderitemsnapshotsVariantoptionsController,
    MallplatformCustomerApprovalrequestsController,
    MallplatformSellerApprovalrequestsController,
    MallplatformSellerApproval_requestsController,
    MallplatformAdministratorApproval_requestsController,
    MallplatformCustomerSessionsLogoutController,
    MallplatformCustomerAccountStatusController,
    MallplatformSellerStorefront_identityController,
    MallplatformCustomerSellersStorefront_identityController,
    MallplatformSellerStorefront_identitySnapshotsController,
    MallplatformAdministratorSellersStorefront_identitySnapshotsController,
    MallplatformCustomerShipmentsConfirm_deliveryController,
    MallplatformAdministratorOrdersForce_cancelController,
    MallplatformAdministratorOrdersForce_refundController,
    MallplatformSellerShipmentsEligible_order_itemsController,
    MallplatformSellerShipmentsPendingController,
    MallplatformCustomerShipmentsTrackingController,
    MallplatformSellerShipmentsTrackingController,
    MallplatformSellerOrderitemsCancellationrequestsApproveController,
    MallplatformAdministratorOrderitemsCancellationrequestsApproveController,
    MallplatformCustomerProductsReviewsController,
    MallplatformSellerProductsReviewsController,
    MallplatformAdministratorProductsReviewsController,
    MallplatformCustomerReviewsOwnershipController,
    MallplatformCustomerProductsReviewsummaryController,
    MallplatformSellerProductsReviewsummaryController,
    MallplatformAdministratorProductsReviewsummaryController,
    MallplatformCustomerReviewsHistoryController,
    MallplatformSellerReviewsHistoryController,
    MallplatformAdministratorReviewsHistoryController,
    MallplatformSellerProductsnapshotsHistoryController,
    MallplatformAdministratorProductsnapshotsHistoryController,
    MallplatformSellerSellerprofilesnapshotsHistoryController,
    MallplatformAdministratorSellerprofilesnapshotsHistoryController,
    MallplatformAdministratorAdministratorapprovalrequestsApproveController,
    MallplatformAdministratorAdministratorapprovalrequestsController,
  ],
})
export class MyModule {}
