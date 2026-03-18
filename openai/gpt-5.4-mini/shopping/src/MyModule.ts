import { Module } from "@nestjs/common";

import { ShoppingmallAdministratorAdministrator_grade_historiesController } from "./controllers/shoppingMall/administrator/administrator-grade-histories/ShoppingmallAdministratorAdministrator_grade_historiesController";
import { ShoppingmallAdministratorAdministrator_requestsController } from "./controllers/shoppingMall/administrator/administrator-requests/ShoppingmallAdministratorAdministrator_requestsController";
import { ShoppingmallAdministratorAdministrator_requestsApplicant_customersController } from "./controllers/shoppingMall/administrator/administrator-requests/applicant-customers/ShoppingmallAdministratorAdministrator_requestsApplicant_customersController";
import { ShoppingmallAdministratorAdministrator_requestsApplicant_sellersController } from "./controllers/shoppingMall/administrator/administrator-requests/applicant-sellers/ShoppingmallAdministratorAdministrator_requestsApplicant_sellersController";
import { ShoppingmallAdministratorAdministrator_requestsPendingController } from "./controllers/shoppingMall/administrator/administrator-requests/pending/ShoppingmallAdministratorAdministrator_requestsPendingController";
import { ShoppingmallAdministratorAdministrator_requestsReviewsController } from "./controllers/shoppingMall/administrator/administrator-requests/reviews/ShoppingmallAdministratorAdministrator_requestsReviewsController";
import { ShoppingmallAdministratorAdministratorsController } from "./controllers/shoppingMall/administrator/administrators/ShoppingmallAdministratorAdministratorsController";
import { ShoppingmallAdministratorAdministratorsGrade_historiesController } from "./controllers/shoppingMall/administrator/administrators/grade-histories/ShoppingmallAdministratorAdministratorsGrade_historiesController";
import { ShoppingmallAdministratorCategoriesController } from "./controllers/shoppingMall/administrator/categories/ShoppingmallAdministratorCategoriesController";
import { ShoppingmallAdministratorCustomersController } from "./controllers/shoppingMall/administrator/customers/ShoppingmallAdministratorCustomersController";
import { ShoppingmallAdministratorOrder_itemsCancellation_requestController } from "./controllers/shoppingMall/administrator/order-items/cancellation-request/ShoppingmallAdministratorOrder_itemsCancellation_requestController";
import { ShoppingmallAdministratorOrder_itemsCancellation_requestSnapshotsController } from "./controllers/shoppingMall/administrator/order-items/cancellation-request/snapshots/ShoppingmallAdministratorOrder_itemsCancellation_requestSnapshotsController";
import { ShoppingmallAdministratorOrder_itemsForce_cancelController } from "./controllers/shoppingMall/administrator/order-items/force-cancel/ShoppingmallAdministratorOrder_itemsForce_cancelController";
import { ShoppingmallAdministratorOrder_itemsForce_refundController } from "./controllers/shoppingMall/administrator/order-items/force-refund/ShoppingmallAdministratorOrder_itemsForce_refundController";
import { ShoppingmallAdministratorOrder_itemsRefund_requestController } from "./controllers/shoppingMall/administrator/order-items/refund-request/ShoppingmallAdministratorOrder_itemsRefund_requestController";
import { ShoppingmallAdministratorOrder_itemsRefund_requestSnapshotsController } from "./controllers/shoppingMall/administrator/order-items/refund-request/snapshots/ShoppingmallAdministratorOrder_itemsRefund_requestSnapshotsController";
import { ShoppingmallAdministratorOrderitemsRefundrequestController } from "./controllers/shoppingMall/administrator/orderItems/refundRequest/ShoppingmallAdministratorOrderitemsRefundrequestController";
import { ShoppingmallAdministratorOrderitemsSnapshotsController } from "./controllers/shoppingMall/administrator/orderItems/snapshots/ShoppingmallAdministratorOrderitemsSnapshotsController";
import { ShoppingmallAdministratorOrdersForce_cancelController } from "./controllers/shoppingMall/administrator/orders/force-cancel/ShoppingmallAdministratorOrdersForce_cancelController";
import { ShoppingmallAdministratorOrdersForce_refundController } from "./controllers/shoppingMall/administrator/orders/force-refund/ShoppingmallAdministratorOrdersForce_refundController";
import { ShoppingmallAdministratorProductvariantsInventoryrecordsController } from "./controllers/shoppingMall/administrator/productVariants/inventoryRecords/ShoppingmallAdministratorProductvariantsInventoryrecordsController";
import { ShoppingmallAdministratorProductvariantsSnapshotsController } from "./controllers/shoppingMall/administrator/productVariants/snapshots/ShoppingmallAdministratorProductvariantsSnapshotsController";
import { ShoppingmallAdministratorProductsSnapshotsController } from "./controllers/shoppingMall/administrator/products/snapshots/ShoppingmallAdministratorProductsSnapshotsController";
import { ShoppingmallAdministratorProductsSnapshotsImagesController } from "./controllers/shoppingMall/administrator/products/snapshots/images/ShoppingmallAdministratorProductsSnapshotsImagesController";
import { ShoppingmallAdministratorSeller_approval_requestsController } from "./controllers/shoppingMall/administrator/seller-approval-requests/ShoppingmallAdministratorSeller_approval_requestsController";
import { ShoppingmallAdministratorSeller_approval_requestsPendingController } from "./controllers/shoppingMall/administrator/seller-approval-requests/pending/ShoppingmallAdministratorSeller_approval_requestsPendingController";
import { ShoppingmallAdministratorSeller_approval_requestsReviewsController } from "./controllers/shoppingMall/administrator/seller-approval-requests/reviews/ShoppingmallAdministratorSeller_approval_requestsReviewsController";
import { ShoppingmallAdministratorSeller_profilesSnapshotsController } from "./controllers/shoppingMall/administrator/seller-profiles/snapshots/ShoppingmallAdministratorSeller_profilesSnapshotsController";
import { ShoppingmallAdministratorSellersController } from "./controllers/shoppingMall/administrator/sellers/ShoppingmallAdministratorSellersController";
import { ShoppingmallAuthAdministratorController } from "./controllers/shoppingMall/auth/administrator/ShoppingmallAuthAdministratorController";
import { ShoppingmallAuthCustomerController } from "./controllers/shoppingMall/auth/customer/ShoppingmallAuthCustomerController";
import { ShoppingmallAuthSellerController } from "./controllers/shoppingMall/auth/seller/ShoppingmallAuthSellerController";
import { ShoppingmallCategoriesController } from "./controllers/shoppingMall/categories/ShoppingmallCategoriesController";
import { ShoppingmallCustomerAdministrator_requestsController } from "./controllers/shoppingMall/customer/administrator-requests/ShoppingmallCustomerAdministrator_requestsController";
import { ShoppingmallCustomerCartsController } from "./controllers/shoppingMall/customer/carts/ShoppingmallCustomerCartsController";
import { ShoppingmallCustomerEmail_verificationsController } from "./controllers/shoppingMall/customer/email-verifications/ShoppingmallCustomerEmail_verificationsController";
import { ShoppingmallCustomerItemsController } from "./controllers/shoppingMall/customer/items/ShoppingmallCustomerItemsController";
import { ShoppingmallCustomerOrder_itemsCancellation_requestController } from "./controllers/shoppingMall/customer/order-items/cancellation-request/ShoppingmallCustomerOrder_itemsCancellation_requestController";
import { ShoppingmallCustomerOrder_itemsCancellation_requestSnapshotsController } from "./controllers/shoppingMall/customer/order-items/cancellation-request/snapshots/ShoppingmallCustomerOrder_itemsCancellation_requestSnapshotsController";
import { ShoppingmallCustomerOrder_itemsRefund_requestController } from "./controllers/shoppingMall/customer/order-items/refund-request/ShoppingmallCustomerOrder_itemsRefund_requestController";
import { ShoppingmallCustomerOrder_itemsRefund_requestSnapshotsController } from "./controllers/shoppingMall/customer/order-items/refund-request/snapshots/ShoppingmallCustomerOrder_itemsRefund_requestSnapshotsController";
import { ShoppingmallCustomerOrderitemsCancellation_requestController } from "./controllers/shoppingMall/customer/orderItems/cancellation-request/ShoppingmallCustomerOrderitemsCancellation_requestController";
import { ShoppingmallCustomerOrderitemsRefundrequestController } from "./controllers/shoppingMall/customer/orderItems/refundRequest/ShoppingmallCustomerOrderitemsRefundrequestController";
import { ShoppingmallCustomerOrderitemsSnapshotsController } from "./controllers/shoppingMall/customer/orderItems/snapshots/ShoppingmallCustomerOrderitemsSnapshotsController";
import { ShoppingmallCustomerOrdersController } from "./controllers/shoppingMall/customer/orders/ShoppingmallCustomerOrdersController";
import { ShoppingmallCustomerOrdersHistoryController } from "./controllers/shoppingMall/customer/orders/history/ShoppingmallCustomerOrdersHistoryController";
import { ShoppingmallCustomerOrdersOrderitemsController } from "./controllers/shoppingMall/customer/orders/orderItems/ShoppingmallCustomerOrdersOrderitemsController";
import { ShoppingmallCustomerOrdersShipmentsController } from "./controllers/shoppingMall/customer/orders/shipments/ShoppingmallCustomerOrdersShipmentsController";
import { ShoppingmallCustomerOrdersTrackingController } from "./controllers/shoppingMall/customer/orders/tracking/ShoppingmallCustomerOrdersTrackingController";
import { ShoppingmallCustomerPassword_resetsController } from "./controllers/shoppingMall/customer/password-resets/ShoppingmallCustomerPassword_resetsController";
import { ShoppingmallCustomerProfileController } from "./controllers/shoppingMall/customer/profile/ShoppingmallCustomerProfileController";
import { ShoppingmallCustomerReviewsController } from "./controllers/shoppingMall/customer/reviews/ShoppingmallCustomerReviewsController";
import { ShoppingmallCustomerSellerprofilesController } from "./controllers/shoppingMall/customer/sellerProfiles/ShoppingmallCustomerSellerprofilesController";
import { ShoppingmallCustomerSessionsController } from "./controllers/shoppingMall/customer/sessions/ShoppingmallCustomerSessionsController";
import { ShoppingmallCustomerShipping_addressesController } from "./controllers/shoppingMall/customer/shipping-addresses/ShoppingmallCustomerShipping_addressesController";
import { ShoppingmallCustomerShipping_addresses_defaultController } from "./controllers/shoppingMall/customer/shipping-addresses/default/ShoppingmallCustomerShipping_addresses_defaultController";
import { ShoppingmallCustomerWishlistsController } from "./controllers/shoppingMall/customer/wishlists/ShoppingmallCustomerWishlistsController";
import { ShoppingmallProductsController } from "./controllers/shoppingMall/products/ShoppingmallProductsController";
import { ShoppingmallProductsImagesController } from "./controllers/shoppingMall/products/images/ShoppingmallProductsImagesController";
import { ShoppingmallProductsReviewsController } from "./controllers/shoppingMall/products/reviews/ShoppingmallProductsReviewsController";
import { ShoppingmallProductsVariantsController } from "./controllers/shoppingMall/products/variants/ShoppingmallProductsVariantsController";
import { ShoppingmallProductsVariantsOptionsController } from "./controllers/shoppingMall/products/variants/options/ShoppingmallProductsVariantsOptionsController";
import { ShoppingmallReviewsController } from "./controllers/shoppingMall/reviews/ShoppingmallReviewsController";
import { ShoppingmallReviewsSnapshotsController } from "./controllers/shoppingMall/reviews/snapshots/ShoppingmallReviewsSnapshotsController";
import { ShoppingmallSellerAdministrator_requestsController } from "./controllers/shoppingMall/seller/administrator-requests/ShoppingmallSellerAdministrator_requestsController";
import { ShoppingmallSellerOrder_itemsCancellation_requestController } from "./controllers/shoppingMall/seller/order-items/cancellation-request/ShoppingmallSellerOrder_itemsCancellation_requestController";
import { ShoppingmallSellerOrder_itemsCancellation_requestSnapshotsController } from "./controllers/shoppingMall/seller/order-items/cancellation-request/snapshots/ShoppingmallSellerOrder_itemsCancellation_requestSnapshotsController";
import { ShoppingmallSellerOrder_itemsRefund_requestController } from "./controllers/shoppingMall/seller/order-items/refund-request/ShoppingmallSellerOrder_itemsRefund_requestController";
import { ShoppingmallSellerOrder_itemsRefund_requestSnapshotsController } from "./controllers/shoppingMall/seller/order-items/refund-request/snapshots/ShoppingmallSellerOrder_itemsRefund_requestSnapshotsController";
import { ShoppingmallSellerOrderitemsCancellation_requestController } from "./controllers/shoppingMall/seller/orderItems/cancellation-request/ShoppingmallSellerOrderitemsCancellation_requestController";
import { ShoppingmallSellerOrderitemsRefundrequestController } from "./controllers/shoppingMall/seller/orderItems/refundRequest/ShoppingmallSellerOrderitemsRefundrequestController";
import { ShoppingmallSellerOrderitemsSnapshotsController } from "./controllers/shoppingMall/seller/orderItems/snapshots/ShoppingmallSellerOrderitemsSnapshotsController";
import { ShoppingmallSellerProductvariantsInventoryrecordsController } from "./controllers/shoppingMall/seller/productVariants/inventoryRecords/ShoppingmallSellerProductvariantsInventoryrecordsController";
import { ShoppingmallSellerProductvariantsSnapshotsController } from "./controllers/shoppingMall/seller/productVariants/snapshots/ShoppingmallSellerProductvariantsSnapshotsController";
import { ShoppingmallSellerProductsController } from "./controllers/shoppingMall/seller/products/ShoppingmallSellerProductsController";
import { ShoppingmallSellerProductsImagesController } from "./controllers/shoppingMall/seller/products/images/ShoppingmallSellerProductsImagesController";
import { ShoppingmallSellerProductsSnapshotsController } from "./controllers/shoppingMall/seller/products/snapshots/ShoppingmallSellerProductsSnapshotsController";
import { ShoppingmallSellerProductsSnapshotsImagesController } from "./controllers/shoppingMall/seller/products/snapshots/images/ShoppingmallSellerProductsSnapshotsImagesController";
import { ShoppingmallSellerProductsVariantsController } from "./controllers/shoppingMall/seller/products/variants/ShoppingmallSellerProductsVariantsController";
import { ShoppingmallSellerProductsVariantsOptionsController } from "./controllers/shoppingMall/seller/products/variants/options/ShoppingmallSellerProductsVariantsOptionsController";
import { ShoppingmallSellerSeller_profilesSnapshotsController } from "./controllers/shoppingMall/seller/seller-profiles/snapshots/ShoppingmallSellerSeller_profilesSnapshotsController";
import { ShoppingmallSellerSellerprofilesController } from "./controllers/shoppingMall/seller/sellerProfiles/ShoppingmallSellerSellerprofilesController";
import { ShoppingmallSellerShipmentsController } from "./controllers/shoppingMall/seller/shipments/ShoppingmallSellerShipmentsController";

@Module({
  controllers: [
    ShoppingmallAuthCustomerController,
    ShoppingmallAuthSellerController,
    ShoppingmallAuthAdministratorController,
    ShoppingmallAdministratorCustomersController,
    ShoppingmallCustomerProfileController,
    ShoppingmallCustomerEmail_verificationsController,
    ShoppingmallCustomerPassword_resetsController,
    ShoppingmallCustomerSessionsController,
    ShoppingmallAdministratorSellersController,
    ShoppingmallAdministratorAdministratorsController,
    ShoppingmallCustomerWishlistsController,
    ShoppingmallCustomerCartsController,
    ShoppingmallCustomerItemsController,
    ShoppingmallCustomerShipping_addressesController,
    ShoppingmallCustomerShipping_addresses_defaultController,
    ShoppingmallSellerSellerprofilesController,
    ShoppingmallCustomerSellerprofilesController,
    ShoppingmallSellerSeller_profilesSnapshotsController,
    ShoppingmallAdministratorSeller_profilesSnapshotsController,
    ShoppingmallCategoriesController,
    ShoppingmallAdministratorCategoriesController,
    ShoppingmallProductsController,
    ShoppingmallSellerProductsController,
    ShoppingmallProductsVariantsController,
    ShoppingmallSellerProductsVariantsController,
    ShoppingmallProductsImagesController,
    ShoppingmallSellerProductsImagesController,
    ShoppingmallProductsVariantsOptionsController,
    ShoppingmallSellerProductsVariantsOptionsController,
    ShoppingmallCustomerOrdersController,
    ShoppingmallSellerShipmentsController,
    ShoppingmallCustomerOrdersShipmentsController,
    ShoppingmallCustomerOrdersOrderitemsController,
    ShoppingmallCustomerOrderitemsCancellation_requestController,
    ShoppingmallCustomerOrder_itemsCancellation_requestController,
    ShoppingmallSellerOrder_itemsCancellation_requestController,
    ShoppingmallAdministratorOrder_itemsCancellation_requestController,
    ShoppingmallSellerOrderitemsCancellation_requestController,
    ShoppingmallCustomerOrder_itemsCancellation_requestSnapshotsController,
    ShoppingmallSellerOrder_itemsCancellation_requestSnapshotsController,
    ShoppingmallAdministratorOrder_itemsCancellation_requestSnapshotsController,
    ShoppingmallCustomerOrder_itemsRefund_requestController,
    ShoppingmallCustomerOrderitemsRefundrequestController,
    ShoppingmallSellerOrderitemsRefundrequestController,
    ShoppingmallAdministratorOrderitemsRefundrequestController,
    ShoppingmallSellerOrder_itemsRefund_requestController,
    ShoppingmallAdministratorOrder_itemsRefund_requestController,
    ShoppingmallCustomerOrder_itemsRefund_requestSnapshotsController,
    ShoppingmallSellerOrder_itemsRefund_requestSnapshotsController,
    ShoppingmallAdministratorOrder_itemsRefund_requestSnapshotsController,
    ShoppingmallProductsReviewsController,
    ShoppingmallReviewsController,
    ShoppingmallCustomerReviewsController,
    ShoppingmallReviewsSnapshotsController,
    ShoppingmallAdministratorSeller_approval_requestsController,
    ShoppingmallAdministratorSeller_approval_requestsReviewsController,
    ShoppingmallAdministratorAdministrator_requestsController,
    ShoppingmallCustomerAdministrator_requestsController,
    ShoppingmallSellerAdministrator_requestsController,
    ShoppingmallAdministratorAdministrator_requestsReviewsController,
    ShoppingmallAdministratorAdministrator_grade_historiesController,
    ShoppingmallAdministratorAdministrator_requestsApplicant_customersController,
    ShoppingmallAdministratorAdministrator_requestsApplicant_sellersController,
    ShoppingmallSellerProductsSnapshotsController,
    ShoppingmallAdministratorProductsSnapshotsController,
    ShoppingmallSellerProductvariantsSnapshotsController,
    ShoppingmallAdministratorProductvariantsSnapshotsController,
    ShoppingmallCustomerOrderitemsSnapshotsController,
    ShoppingmallSellerOrderitemsSnapshotsController,
    ShoppingmallAdministratorOrderitemsSnapshotsController,
    ShoppingmallSellerProductvariantsInventoryrecordsController,
    ShoppingmallAdministratorProductvariantsInventoryrecordsController,
    ShoppingmallSellerProductsSnapshotsImagesController,
    ShoppingmallAdministratorProductsSnapshotsImagesController,
    ShoppingmallCustomerOrdersHistoryController,
    ShoppingmallCustomerOrdersTrackingController,
    ShoppingmallAdministratorOrdersForce_cancelController,
    ShoppingmallAdministratorOrdersForce_refundController,
    ShoppingmallAdministratorOrder_itemsForce_cancelController,
    ShoppingmallAdministratorOrder_itemsForce_refundController,
    ShoppingmallAdministratorSeller_approval_requestsPendingController,
    ShoppingmallAdministratorAdministrator_requestsPendingController,
    ShoppingmallAdministratorAdministratorsGrade_historiesController,
  ],
})
export class MyModule {}
