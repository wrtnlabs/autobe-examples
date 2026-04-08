import { Module } from "@nestjs/common";

import { ShoppingmallAdministratorAdministrator_requestsController } from "./controllers/shoppingMall/administrator/administrator-requests/ShoppingmallAdministratorAdministrator_requestsController";
import { ShoppingmallAdministratorAdministratorsController } from "./controllers/shoppingMall/administrator/administrators/ShoppingmallAdministratorAdministratorsController";
import { ShoppingmallAdministratorAdminsCategoriesController } from "./controllers/shoppingMall/administrator/admins/categories/ShoppingmallAdministratorAdminsCategoriesController";
import { ShoppingmallAdministratorAudit_logsController } from "./controllers/shoppingMall/administrator/audit-logs/ShoppingmallAdministratorAudit_logsController";
import { ShoppingmallAdministratorCancellation_requestsController } from "./controllers/shoppingMall/administrator/cancellation-requests/ShoppingmallAdministratorCancellation_requestsController";
import { ShoppingmallAdministratorCancellation_requestsSnapshotsController } from "./controllers/shoppingMall/administrator/cancellation-requests/snapshots/ShoppingmallAdministratorCancellation_requestsSnapshotsController";
import { ShoppingmallAdministratorCategoriesController } from "./controllers/shoppingMall/administrator/categories/ShoppingmallAdministratorCategoriesController";
import { ShoppingmallAdministratorCustomersController } from "./controllers/shoppingMall/administrator/customers/ban/ShoppingmallAdministratorCustomersController";
import { ShoppingmallAdministratorGrade_changesController } from "./controllers/shoppingMall/administrator/grade-changes/ShoppingmallAdministratorGrade_changesController";
import { ShoppingmallAdministratorOrder_itemsController } from "./controllers/shoppingMall/administrator/order-items/ShoppingmallAdministratorOrder_itemsController";
import { ShoppingmallAdministratorOrdersItemsForce_cancelController } from "./controllers/shoppingMall/administrator/orders/items/force-cancel/ShoppingmallAdministratorOrdersItemsForce_cancelController";
import { ShoppingmallAdministratorOrdersItemsForce_refundController } from "./controllers/shoppingMall/administrator/orders/items/force-refund/ShoppingmallAdministratorOrdersItemsForce_refundController";
import { ShoppingmallAdministratorPromotion_requestsController } from "./controllers/shoppingMall/administrator/promotion-requests/ShoppingmallAdministratorPromotion_requestsController";
import { ShoppingmallAdministratorPromotion_requestsSnapshotsController } from "./controllers/shoppingMall/administrator/promotion-requests/snapshots/ShoppingmallAdministratorPromotion_requestsSnapshotsController";
import { ShoppingmallAdministratorRefund_requestsController } from "./controllers/shoppingMall/administrator/refund-requests/ShoppingmallAdministratorRefund_requestsController";
import { ShoppingmallAdministratorRefund_requestsSnapshotsController } from "./controllers/shoppingMall/administrator/refund-requests/snapshots/ShoppingmallAdministratorRefund_requestsSnapshotsController";
import { ShoppingmallAdministratorRequest_snapshotsController } from "./controllers/shoppingMall/administrator/request-snapshots/ShoppingmallAdministratorRequest_snapshotsController";
import { ShoppingmallAdministratorReviewsSnapshotsController } from "./controllers/shoppingMall/administrator/reviews/snapshots/ShoppingmallAdministratorReviewsSnapshotsController";
import { ShoppingmallAdministratorSeller_approvalsController } from "./controllers/shoppingMall/administrator/seller-approvals/ShoppingmallAdministratorSeller_approvalsController";
import { ShoppingmallAdministratorSellersController } from "./controllers/shoppingMall/administrator/sellers/ShoppingmallAdministratorSellersController";
import { ShoppingmallAdministratorSellersBanController } from "./controllers/shoppingMall/administrator/sellers/ban/ShoppingmallAdministratorSellersBanController";
import { ShoppingmallAdministratorSellersPendingController } from "./controllers/shoppingMall/administrator/sellers/pending/ShoppingmallAdministratorSellersPendingController";
import { ShoppingmallAdministratorsController } from "./controllers/shoppingMall/administrators/ShoppingmallAdministratorsController";
import { ShoppingmallAuthAdministratorController } from "./controllers/shoppingMall/auth/administrator/ShoppingmallAuthAdministratorController";
import { ShoppingmallAuthCustomerController } from "./controllers/shoppingMall/auth/customer/ShoppingmallAuthCustomerController";
import { ShoppingmallAuthGuestController } from "./controllers/shoppingMall/auth/guest/ShoppingmallAuthGuestController";
import { ShoppingmallAuthSellerController } from "./controllers/shoppingMall/auth/seller/ShoppingmallAuthSellerController";
import { ShoppingmallCategoriesController } from "./controllers/shoppingMall/categories/ShoppingmallCategoriesController";
import { ShoppingmallCategoriesProductsController } from "./controllers/shoppingMall/categories/products/ShoppingmallCategoriesProductsController";
import { ShoppingmallCategoriesSnapshotsController } from "./controllers/shoppingMall/categories/snapshots/ShoppingmallCategoriesSnapshotsController";
import { ShoppingmallCustomerController } from "./controllers/shoppingMall/customer/ShoppingmallCustomerController";
import { ShoppingmallCustomerAddressesController } from "./controllers/shoppingMall/customer/addresses/ShoppingmallCustomerAddressesController";
import { ShoppingmallCustomerAdministrator_requestsController } from "./controllers/shoppingMall/customer/administrator-requests/ShoppingmallCustomerAdministrator_requestsController";
import { ShoppingmallCustomerCancellation_requestsController } from "./controllers/shoppingMall/customer/cancellation-requests/ShoppingmallCustomerCancellation_requestsController";
import { ShoppingmallCustomerCancellation_requestsSnapshotsController } from "./controllers/shoppingMall/customer/cancellation-requests/snapshots/ShoppingmallCustomerCancellation_requestsSnapshotsController";
import { ShoppingmallCustomerCartController } from "./controllers/shoppingMall/customer/cart/ShoppingmallCustomerCartController";
import { ShoppingmallCustomerCartItemsController } from "./controllers/shoppingMall/customer/cart/items/ShoppingmallCustomerCartItemsController";
import { ShoppingmallCustomerCartsController } from "./controllers/shoppingMall/customer/carts/ShoppingmallCustomerCartsController";
import { ShoppingmallCustomerCustomersMeAddressesController } from "./controllers/shoppingMall/customer/customers/me/addresses/ShoppingmallCustomerCustomersMeAddressesController";
import { ShoppingmallCustomerCustomersMeCheckoutController } from "./controllers/shoppingMall/customer/customers/me/checkout/ShoppingmallCustomerCustomersMeCheckoutController";
import { ShoppingmallCustomerCustomersMeOrdersItemsRefundController } from "./controllers/shoppingMall/customer/customers/me/orders/items/refund/ShoppingmallCustomerCustomersMeOrdersItemsRefundController";
import { ShoppingmallCustomerOrder_item_snapshotsController } from "./controllers/shoppingMall/customer/order-item-snapshots/ShoppingmallCustomerOrder_item_snapshotsController";
import { ShoppingmallCustomerOrdersController } from "./controllers/shoppingMall/customer/orders/ShoppingmallCustomerOrdersController";
import { ShoppingmallCustomerOrdersItemsController } from "./controllers/shoppingMall/customer/orders/items/ShoppingmallCustomerOrdersItemsController";
import { ShoppingmallCustomerOrdersItemsCancellationController } from "./controllers/shoppingMall/customer/orders/items/cancellation/ShoppingmallCustomerOrdersItemsCancellationController";
import { ShoppingmallCustomerOrdersItemsRefundController } from "./controllers/shoppingMall/customer/orders/items/refund/ShoppingmallCustomerOrdersItemsRefundController";
import { ShoppingmallCustomerOrdersShipmentsDeliveredController } from "./controllers/shoppingMall/customer/orders/shipments/delivered/ShoppingmallCustomerOrdersShipmentsDeliveredController";
import { ShoppingmallCustomerPassword_resetsController } from "./controllers/shoppingMall/customer/password-resets/ShoppingmallCustomerPassword_resetsController";
import { ShoppingmallCustomerProfileController } from "./controllers/shoppingMall/customer/profile/ShoppingmallCustomerProfileController";
import { ShoppingmallCustomerProfilesController } from "./controllers/shoppingMall/customer/profiles/ShoppingmallCustomerProfilesController";
import { ShoppingmallCustomerRefund_requestsController } from "./controllers/shoppingMall/customer/refund-requests/ShoppingmallCustomerRefund_requestsController";
import { ShoppingmallCustomerRefund_requestsSnapshotsController } from "./controllers/shoppingMall/customer/refund-requests/snapshots/ShoppingmallCustomerRefund_requestsSnapshotsController";
import { ShoppingmallCustomerRequest_snapshotsController } from "./controllers/shoppingMall/customer/request-snapshots/ShoppingmallCustomerRequest_snapshotsController";
import { ShoppingmallCustomerReviewsController } from "./controllers/shoppingMall/customer/reviews/ShoppingmallCustomerReviewsController";
import { ShoppingmallCustomerReviewsSnapshotsController } from "./controllers/shoppingMall/customer/reviews/snapshots/ShoppingmallCustomerReviewsSnapshotsController";
import { ShoppingmallCustomerShipmentsController } from "./controllers/shoppingMall/customer/shipments/ShoppingmallCustomerShipmentsController";
import { ShoppingmallCustomerWishlistsController } from "./controllers/shoppingMall/customer/wishlists/ShoppingmallCustomerWishlistsController";
import { ShoppingmallCustomersController } from "./controllers/shoppingMall/customers/ShoppingmallCustomersController";
import { ShoppingmallGuestSessionsController } from "./controllers/shoppingMall/guest/sessions/ShoppingmallGuestSessionsController";
import { ShoppingmallGuestsController } from "./controllers/shoppingMall/guests/ShoppingmallGuestsController";
import { ShoppingmallProductsReviewsController } from "./controllers/shoppingMall/products/reviews/ShoppingmallProductsReviewsController";
import { ShoppingmallProductsSearchController } from "./controllers/shoppingMall/products/search/ShoppingmallProductsSearchController";
import { ShoppingmallReviewsController } from "./controllers/shoppingMall/reviews/ShoppingmallReviewsController";
import { ShoppingmallSellerAdministrator_requestsController } from "./controllers/shoppingMall/seller/administrator-requests/ShoppingmallSellerAdministrator_requestsController";
import { ShoppingmallSellerCancellation_requestsController } from "./controllers/shoppingMall/seller/cancellation-requests/ShoppingmallSellerCancellation_requestsController";
import { ShoppingmallSellerCancellation_requestsSnapshotsController } from "./controllers/shoppingMall/seller/cancellation-requests/snapshots/ShoppingmallSellerCancellation_requestsSnapshotsController";
import { ShoppingmallSellerOrdersItemsController } from "./controllers/shoppingMall/seller/orders/items/ShoppingmallSellerOrdersItemsController";
import { ShoppingmallSellerOrdersItemsCancellationController } from "./controllers/shoppingMall/seller/orders/items/cancellation/ShoppingmallSellerOrdersItemsCancellationController";
import { ShoppingmallSellerOrdersItemsRefundController } from "./controllers/shoppingMall/seller/orders/items/refund/ShoppingmallSellerOrdersItemsRefundController";
import { ShoppingmallSellerOrdersShipmentsController } from "./controllers/shoppingMall/seller/orders/shipments/ShoppingmallSellerOrdersShipmentsController";
import { ShoppingmallSellerProductsController } from "./controllers/shoppingMall/seller/products/ShoppingmallSellerProductsController";
import { ShoppingmallSellerProductsImagesController } from "./controllers/shoppingMall/seller/products/images/ShoppingmallSellerProductsImagesController";
import { ShoppingmallSellerProductsSnapshotsController } from "./controllers/shoppingMall/seller/products/snapshots/ShoppingmallSellerProductsSnapshotsController";
import { ShoppingmallSellerProductsVariantsController } from "./controllers/shoppingMall/seller/products/variants/ShoppingmallSellerProductsVariantsController";
import { ShoppingmallSellerProductsVariantsInventoryController } from "./controllers/shoppingMall/seller/products/variants/inventory/ShoppingmallSellerProductsVariantsInventoryController";
import { ShoppingmallSellerProductsVariantsSnapshotsController } from "./controllers/shoppingMall/seller/products/variants/snapshots/ShoppingmallSellerProductsVariantsSnapshotsController";
import { ShoppingmallSellerProfileController } from "./controllers/shoppingMall/seller/profile/ShoppingmallSellerProfileController";
import { ShoppingmallSellerProfileSnapshotsController } from "./controllers/shoppingMall/seller/profile/snapshots/ShoppingmallSellerProfileSnapshotsController";
import { ShoppingmallSellerRefund_requestsController } from "./controllers/shoppingMall/seller/refund-requests/ShoppingmallSellerRefund_requestsController";
import { ShoppingmallSellerRefund_requestsSnapshotsController } from "./controllers/shoppingMall/seller/refund-requests/snapshots/ShoppingmallSellerRefund_requestsSnapshotsController";
import { ShoppingmallSellerRequest_snapshotsController } from "./controllers/shoppingMall/seller/request-snapshots/ShoppingmallSellerRequest_snapshotsController";
import { ShoppingmallSellerSellersMeController } from "./controllers/shoppingMall/seller/sellers/me/dashboard/ShoppingmallSellerSellersMeController";
import { ShoppingmallSellerSellersController } from "./controllers/shoppingMall/seller/sellers/reapply/ShoppingmallSellerSellersController";
import { ShoppingmallSellerShipmentsController } from "./controllers/shoppingMall/seller/shipments/ShoppingmallSellerShipmentsController";
import { ShoppingmallSellersController } from "./controllers/shoppingMall/sellers/ShoppingmallSellersController";

@Module({
  controllers: [
    ShoppingmallAuthGuestController,
    ShoppingmallAuthCustomerController,
    ShoppingmallAuthSellerController,
    ShoppingmallAuthAdministratorController,
    ShoppingmallGuestsController,
    ShoppingmallGuestSessionsController,
    ShoppingmallCustomersController,
    ShoppingmallCustomerProfileController,
    ShoppingmallCustomerPassword_resetsController,
    ShoppingmallSellersController,
    ShoppingmallAdministratorsController,
    ShoppingmallCustomerProfilesController,
    ShoppingmallCustomerAddressesController,
    ShoppingmallCustomerCustomersMeAddressesController,
    ShoppingmallCustomerWishlistsController,
    ShoppingmallCustomerCartsController,
    ShoppingmallCustomerCartController,
    ShoppingmallCustomerCartItemsController,
    ShoppingmallSellerProfileController,
    ShoppingmallSellerProfileSnapshotsController,
    ShoppingmallSellerProductsController,
    ShoppingmallSellerProductsImagesController,
    ShoppingmallSellerProductsVariantsController,
    ShoppingmallSellerProductsVariantsSnapshotsController,
    ShoppingmallSellerProductsVariantsInventoryController,
    ShoppingmallSellerProductsSnapshotsController,
    ShoppingmallCategoriesController,
    ShoppingmallAdministratorCategoriesController,
    ShoppingmallAdministratorAdminsCategoriesController,
    ShoppingmallCategoriesSnapshotsController,
    ShoppingmallCustomerOrdersController,
    ShoppingmallCustomerCustomersMeCheckoutController,
    ShoppingmallCustomerOrdersItemsController,
    ShoppingmallSellerOrdersItemsController,
    ShoppingmallCustomerShipmentsController,
    ShoppingmallSellerShipmentsController,
    ShoppingmallCustomerOrder_item_snapshotsController,
    ShoppingmallAdministratorOrder_itemsController,
    ShoppingmallReviewsController,
    ShoppingmallCustomerReviewsController,
    ShoppingmallCustomerReviewsSnapshotsController,
    ShoppingmallAdministratorReviewsSnapshotsController,
    ShoppingmallCustomerCancellation_requestsController,
    ShoppingmallSellerCancellation_requestsController,
    ShoppingmallAdministratorCancellation_requestsController,
    ShoppingmallCustomerCancellation_requestsSnapshotsController,
    ShoppingmallSellerCancellation_requestsSnapshotsController,
    ShoppingmallAdministratorCancellation_requestsSnapshotsController,
    ShoppingmallCustomerRefund_requestsController,
    ShoppingmallSellerRefund_requestsController,
    ShoppingmallAdministratorRefund_requestsController,
    ShoppingmallCustomerCustomersMeOrdersItemsRefundController,
    ShoppingmallCustomerRefund_requestsSnapshotsController,
    ShoppingmallSellerRefund_requestsSnapshotsController,
    ShoppingmallAdministratorRefund_requestsSnapshotsController,
    ShoppingmallCustomerRequest_snapshotsController,
    ShoppingmallSellerRequest_snapshotsController,
    ShoppingmallAdministratorRequest_snapshotsController,
    ShoppingmallCustomerAdministrator_requestsController,
    ShoppingmallSellerAdministrator_requestsController,
    ShoppingmallAdministratorAdministrator_requestsController,
    ShoppingmallAdministratorPromotion_requestsController,
    ShoppingmallAdministratorPromotion_requestsSnapshotsController,
    ShoppingmallAdministratorGrade_changesController,
    ShoppingmallAdministratorAudit_logsController,
    ShoppingmallCustomerController,
    ShoppingmallAdministratorCustomersController,
    ShoppingmallAdministratorSellersBanController,
    ShoppingmallAdministratorAdministratorsController,
    ShoppingmallAdministratorSellersController,
    ShoppingmallSellerSellersController,
    ShoppingmallAdministratorSellersPendingController,
    ShoppingmallSellerSellersMeController,
    ShoppingmallProductsSearchController,
    ShoppingmallCategoriesProductsController,
    ShoppingmallProductsReviewsController,
    ShoppingmallCustomerOrdersItemsCancellationController,
    ShoppingmallCustomerOrdersItemsRefundController,
    ShoppingmallCustomerOrdersShipmentsDeliveredController,
    ShoppingmallSellerOrdersShipmentsController,
    ShoppingmallSellerOrdersItemsCancellationController,
    ShoppingmallSellerOrdersItemsRefundController,
    ShoppingmallAdministratorOrdersItemsForce_cancelController,
    ShoppingmallAdministratorOrdersItemsForce_refundController,
    ShoppingmallAdministratorSeller_approvalsController,
  ],
})
export class MyModule {}
