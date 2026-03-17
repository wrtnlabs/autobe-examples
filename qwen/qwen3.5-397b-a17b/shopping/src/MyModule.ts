import { Module } from "@nestjs/common";

import { ShoppingmallAdminAdmin_requestsController } from "./controllers/shoppingMall/admin/admin-requests/ShoppingmallAdminAdmin_requestsController";
import { ShoppingmallAdminAdmin_requestsSnapshotsController } from "./controllers/shoppingMall/admin/admin-requests/snapshots/ShoppingmallAdminAdmin_requestsSnapshotsController";
import { ShoppingmallAdminAdminCategoriesController } from "./controllers/shoppingMall/admin/admin/categories/ShoppingmallAdminAdminCategoriesController";
import { ShoppingmallAdminAdminCustomersController } from "./controllers/shoppingMall/admin/admin/customers/unban/ShoppingmallAdminAdminCustomersController";
import { ShoppingmallAdminAdminSellersController } from "./controllers/shoppingMall/admin/admin/sellers/ShoppingmallAdminAdminSellersController";
import { ShoppingmallAdminAdminrequestsSnapshotsController } from "./controllers/shoppingMall/admin/adminRequests/snapshots/ShoppingmallAdminAdminrequestsSnapshotsController";
import { ShoppingmallAdminCancellation_requestsSnapshotsController } from "./controllers/shoppingMall/admin/cancellation-requests/snapshots/ShoppingmallAdminCancellation_requestsSnapshotsController";
import { ShoppingmallAdminCategoriesController } from "./controllers/shoppingMall/admin/categories/ShoppingmallAdminCategoriesController";
import { ShoppingmallAdminCustomersController } from "./controllers/shoppingMall/admin/customers/ShoppingmallAdminCustomersController";
import { ShoppingmallAdminOrder_itemsCancelController } from "./controllers/shoppingMall/admin/order-items/cancel/ShoppingmallAdminOrder_itemsCancelController";
import { ShoppingmallAdminOrder_itemsRefundController } from "./controllers/shoppingMall/admin/order-items/refund/ShoppingmallAdminOrder_itemsRefundController";
import { ShoppingmallAdminOrdersItemsController } from "./controllers/shoppingMall/admin/orders/items/ShoppingmallAdminOrdersItemsController";
import { ShoppingmallAdminProductsSnapshotsController } from "./controllers/shoppingMall/admin/products/snapshots/ShoppingmallAdminProductsSnapshotsController";
import { ShoppingmallAdminProductsSnapshotsImagesController } from "./controllers/shoppingMall/admin/products/snapshots/images/ShoppingmallAdminProductsSnapshotsImagesController";
import { ShoppingmallAdminProductsSnapshotsVariantsnapshotsController } from "./controllers/shoppingMall/admin/products/snapshots/variantSnapshots/ShoppingmallAdminProductsSnapshotsVariantsnapshotsController";
import { ShoppingmallAdminRefund_requestsSnapshotsController } from "./controllers/shoppingMall/admin/refund-requests/snapshots/ShoppingmallAdminRefund_requestsSnapshotsController";
import { ShoppingmallAdminReviewsSnapshotsController } from "./controllers/shoppingMall/admin/reviews/snapshots/ShoppingmallAdminReviewsSnapshotsController";
import { ShoppingmallAdminSellersController } from "./controllers/shoppingMall/admin/sellers/ShoppingmallAdminSellersController";
import { ShoppingmallAdminSellersPendingController } from "./controllers/shoppingMall/admin/sellers/pending/ShoppingmallAdminSellersPendingController";
import { ShoppingmallAdminSellersProfileSnapshotsController } from "./controllers/shoppingMall/admin/sellers/profile/snapshots/ShoppingmallAdminSellersProfileSnapshotsController";
import { ShoppingmallAdminShipmentsController } from "./controllers/shoppingMall/admin/shipments/ShoppingmallAdminShipmentsController";
import { ShoppingmallAdminShipmentsItemsController } from "./controllers/shoppingMall/admin/shipments/items/ShoppingmallAdminShipmentsItemsController";
import { ShoppingmallAuthAdminController } from "./controllers/shoppingMall/auth/admin/ShoppingmallAuthAdminController";
import { ShoppingmallAuthCustomerController } from "./controllers/shoppingMall/auth/customer/ShoppingmallAuthCustomerController";
import { ShoppingmallAuthSellerController } from "./controllers/shoppingMall/auth/seller/ShoppingmallAuthSellerController";
import { ShoppingmallAuthSuperadminController } from "./controllers/shoppingMall/auth/superAdmin/ShoppingmallAuthSuperadminController";
import { ShoppingmallCategoriesController } from "./controllers/shoppingMall/categories/ShoppingmallCategoriesController";
import { ShoppingmallCategoriesProductsController } from "./controllers/shoppingMall/categories/products/ShoppingmallCategoriesProductsController";
import { ShoppingmallCustomerAdmin_requestsController } from "./controllers/shoppingMall/customer/admin-requests/ShoppingmallCustomerAdmin_requestsController";
import { ShoppingmallCustomerCancellation_request_snapshotsController } from "./controllers/shoppingMall/customer/cancellation-request-snapshots/ShoppingmallCustomerCancellation_request_snapshotsController";
import { ShoppingmallCustomerCancellation_requestsController } from "./controllers/shoppingMall/customer/cancellation-requests/ShoppingmallCustomerCancellation_requestsController";
import { ShoppingmallCustomerCancellation_requestsSnapshotsController } from "./controllers/shoppingMall/customer/cancellation-requests/snapshots/ShoppingmallCustomerCancellation_requestsSnapshotsController";
import { ShoppingmallCustomerCartController } from "./controllers/shoppingMall/customer/cart/ShoppingmallCustomerCartController";
import { ShoppingmallCustomerCartItemsController } from "./controllers/shoppingMall/customer/cart/items/ShoppingmallCustomerCartItemsController";
import { ShoppingmallCustomerCustomersCartItemsController } from "./controllers/shoppingMall/customer/customers/cart/items/ShoppingmallCustomerCustomersCartItemsController";
import { ShoppingmallCustomerCustomersOrder_itemsReviewController } from "./controllers/shoppingMall/customer/customers/order-items/review/ShoppingmallCustomerCustomersOrder_itemsReviewController";
import { ShoppingmallCustomerCustomersProfileController } from "./controllers/shoppingMall/customer/customers/profile/ShoppingmallCustomerCustomersProfileController";
import { ShoppingmallCustomerCustomersWishlistController } from "./controllers/shoppingMall/customer/customers/wishlist/ShoppingmallCustomerCustomersWishlistController";
import { ShoppingmallCustomerCustomersWishlistProductsController } from "./controllers/shoppingMall/customer/customers/wishlist/products/ShoppingmallCustomerCustomersWishlistProductsController";
import { ShoppingmallCustomerEmail_verificationsController } from "./controllers/shoppingMall/customer/email-verifications/ShoppingmallCustomerEmail_verificationsController";
import { ShoppingmallCustomerOrdersController } from "./controllers/shoppingMall/customer/orders/ShoppingmallCustomerOrdersController";
import { ShoppingmallCustomerOrdersItemsController } from "./controllers/shoppingMall/customer/orders/items/ShoppingmallCustomerOrdersItemsController";
import { ShoppingmallCustomerPassword_resetsController } from "./controllers/shoppingMall/customer/password-resets/ShoppingmallCustomerPassword_resetsController";
import { ShoppingmallCustomerProfileController } from "./controllers/shoppingMall/customer/profile/ShoppingmallCustomerProfileController";
import { ShoppingmallCustomerRefund_request_snapshotsController } from "./controllers/shoppingMall/customer/refund-request-snapshots/ShoppingmallCustomerRefund_request_snapshotsController";
import { ShoppingmallCustomerRefund_requestsController } from "./controllers/shoppingMall/customer/refund-requests/ShoppingmallCustomerRefund_requestsController";
import { ShoppingmallCustomerRefund_requestsSnapshotsController } from "./controllers/shoppingMall/customer/refund-requests/snapshots/ShoppingmallCustomerRefund_requestsSnapshotsController";
import { ShoppingmallCustomerReviewsController } from "./controllers/shoppingMall/customer/reviews/ShoppingmallCustomerReviewsController";
import { ShoppingmallCustomerReviewsSnapshotsController } from "./controllers/shoppingMall/customer/reviews/snapshots/ShoppingmallCustomerReviewsSnapshotsController";
import { ShoppingmallCustomerSessionsController } from "./controllers/shoppingMall/customer/sessions/ShoppingmallCustomerSessionsController";
import { ShoppingmallCustomerShipmentsController } from "./controllers/shoppingMall/customer/shipments/ShoppingmallCustomerShipmentsController";
import { ShoppingmallCustomerShipmentsConfirm_deliveryController } from "./controllers/shoppingMall/customer/shipments/confirm-delivery/ShoppingmallCustomerShipmentsConfirm_deliveryController";
import { ShoppingmallCustomerShipmentsItemsController } from "./controllers/shoppingMall/customer/shipments/items/ShoppingmallCustomerShipmentsItemsController";
import { ShoppingmallCustomerWishlistsController } from "./controllers/shoppingMall/customer/wishlists/ShoppingmallCustomerWishlistsController";
import { ShoppingmallProductsController } from "./controllers/shoppingMall/products/ShoppingmallProductsController";
import { ShoppingmallProductsImagesController } from "./controllers/shoppingMall/products/images/ShoppingmallProductsImagesController";
import { ShoppingmallProductsReviewsController } from "./controllers/shoppingMall/products/reviews/ShoppingmallProductsReviewsController";
import { ShoppingmallProductsVariantsController } from "./controllers/shoppingMall/products/variants/ShoppingmallProductsVariantsController";
import { ShoppingmallProductsVariantsOptionsController } from "./controllers/shoppingMall/products/variants/options/ShoppingmallProductsVariantsOptionsController";
import { ShoppingmallSellerCancellation_requestsController } from "./controllers/shoppingMall/seller/cancellation-requests/ShoppingmallSellerCancellation_requestsController";
import { ShoppingmallSellerCancellation_requestsSnapshotsController } from "./controllers/shoppingMall/seller/cancellation-requests/snapshots/ShoppingmallSellerCancellation_requestsSnapshotsController";
import { ShoppingmallSellerDashboardController } from "./controllers/shoppingMall/seller/dashboard/ShoppingmallSellerDashboardController";
import { ShoppingmallSellerOrder_itemsController } from "./controllers/shoppingMall/seller/order-items/ShoppingmallSellerOrder_itemsController";
import { ShoppingmallSellerOrdersItemsController } from "./controllers/shoppingMall/seller/orders/items/ShoppingmallSellerOrdersItemsController";
import { ShoppingmallSellerProductsController } from "./controllers/shoppingMall/seller/products/ShoppingmallSellerProductsController";
import { ShoppingmallSellerProductsImagesController } from "./controllers/shoppingMall/seller/products/images/ShoppingmallSellerProductsImagesController";
import { ShoppingmallSellerProductsSnapshotsController } from "./controllers/shoppingMall/seller/products/snapshots/ShoppingmallSellerProductsSnapshotsController";
import { ShoppingmallSellerProductsSnapshotsImagesController } from "./controllers/shoppingMall/seller/products/snapshots/images/ShoppingmallSellerProductsSnapshotsImagesController";
import { ShoppingmallSellerProductsSnapshotsVariantsnapshotsController } from "./controllers/shoppingMall/seller/products/snapshots/variantSnapshots/ShoppingmallSellerProductsSnapshotsVariantsnapshotsController";
import { ShoppingmallSellerProductsVariantsController } from "./controllers/shoppingMall/seller/products/variants/ShoppingmallSellerProductsVariantsController";
import { ShoppingmallSellerProductsVariantsInventoryController } from "./controllers/shoppingMall/seller/products/variants/inventory/ShoppingmallSellerProductsVariantsInventoryController";
import { ShoppingmallSellerProductsVariantsOptionsController } from "./controllers/shoppingMall/seller/products/variants/options/ShoppingmallSellerProductsVariantsOptionsController";
import { ShoppingmallSellerProfileSnapshotsController } from "./controllers/shoppingMall/seller/profile/snapshots/ShoppingmallSellerProfileSnapshotsController";
import { ShoppingmallSellerRefund_requestsController } from "./controllers/shoppingMall/seller/refund-requests/ShoppingmallSellerRefund_requestsController";
import { ShoppingmallSellerRefund_requestsSnapshotsController } from "./controllers/shoppingMall/seller/refund-requests/snapshots/ShoppingmallSellerRefund_requestsSnapshotsController";
import { ShoppingmallSellerReviewsSnapshotsController } from "./controllers/shoppingMall/seller/reviews/snapshots/ShoppingmallSellerReviewsSnapshotsController";
import { ShoppingmallSellerSellersProductsVariantsController } from "./controllers/shoppingMall/seller/sellers/products/variants/ShoppingmallSellerSellersProductsVariantsController";
import { ShoppingmallSellerShipmentsController } from "./controllers/shoppingMall/seller/shipments/ShoppingmallSellerShipmentsController";
import { ShoppingmallSellerShipmentsItemsController } from "./controllers/shoppingMall/seller/shipments/items/ShoppingmallSellerShipmentsItemsController";
import { ShoppingmallSuperadminAdmin_requestsController } from "./controllers/shoppingMall/superAdmin/admin-requests/ShoppingmallSuperadminAdmin_requestsController";
import { ShoppingmallSuperadminAdmin_requestsSnapshotsController } from "./controllers/shoppingMall/superAdmin/admin-requests/snapshots/ShoppingmallSuperadminAdmin_requestsSnapshotsController";
import { ShoppingmallSuperadminAdminrequestsPendingController } from "./controllers/shoppingMall/superAdmin/adminRequests/pending/ShoppingmallSuperadminAdminrequestsPendingController";
import { ShoppingmallSuperadminAdminrequestsSnapshotsController } from "./controllers/shoppingMall/superAdmin/adminRequests/snapshots/ShoppingmallSuperadminAdminrequestsSnapshotsController";
import { ShoppingmallSuperadminAdminsController } from "./controllers/shoppingMall/superAdmin/admins/ShoppingmallSuperadminAdminsController";
import { ShoppingmallSuperadminCustomersController } from "./controllers/shoppingMall/superAdmin/customers/ShoppingmallSuperadminCustomersController";
import { ShoppingmallSuperadminSellersController } from "./controllers/shoppingMall/superAdmin/sellers/ShoppingmallSuperadminSellersController";
import { ShoppingmallSuperadminSuper_adminsController } from "./controllers/shoppingMall/superAdmin/super-admins/ShoppingmallSuperadminSuper_adminsController";

@Module({
  controllers: [
    ShoppingmallAuthCustomerController,
    ShoppingmallAuthSellerController,
    ShoppingmallAuthAdminController,
    ShoppingmallAuthSuperadminController,
    ShoppingmallAdminCustomersController,
    ShoppingmallCustomerCustomersProfileController,
    ShoppingmallCustomerSessionsController,
    ShoppingmallCustomerPassword_resetsController,
    ShoppingmallCustomerEmail_verificationsController,
    ShoppingmallAdminSellersController,
    ShoppingmallSuperadminAdminsController,
    ShoppingmallSuperadminSuper_adminsController,
    ShoppingmallCustomerProfileController,
    ShoppingmallCustomerWishlistsController,
    ShoppingmallCustomerCustomersWishlistController,
    ShoppingmallCustomerCustomersWishlistProductsController,
    ShoppingmallSellerProfileSnapshotsController,
    ShoppingmallAdminSellersProfileSnapshotsController,
    ShoppingmallCategoriesController,
    ShoppingmallAdminCategoriesController,
    ShoppingmallAdminAdminCategoriesController,
    ShoppingmallProductsController,
    ShoppingmallSellerProductsController,
    ShoppingmallProductsImagesController,
    ShoppingmallSellerProductsImagesController,
    ShoppingmallProductsVariantsController,
    ShoppingmallSellerProductsVariantsController,
    ShoppingmallSellerSellersProductsVariantsController,
    ShoppingmallProductsVariantsOptionsController,
    ShoppingmallSellerProductsVariantsOptionsController,
    ShoppingmallSellerProductsSnapshotsController,
    ShoppingmallAdminProductsSnapshotsController,
    ShoppingmallSellerProductsSnapshotsVariantsnapshotsController,
    ShoppingmallAdminProductsSnapshotsVariantsnapshotsController,
    ShoppingmallSellerProductsSnapshotsImagesController,
    ShoppingmallAdminProductsSnapshotsImagesController,
    ShoppingmallSellerProductsVariantsInventoryController,
    ShoppingmallCustomerCartController,
    ShoppingmallCustomerCustomersCartItemsController,
    ShoppingmallCustomerCartItemsController,
    ShoppingmallCustomerOrdersController,
    ShoppingmallCustomerOrdersItemsController,
    ShoppingmallSellerOrder_itemsController,
    ShoppingmallSellerShipmentsController,
    ShoppingmallCustomerShipmentsController,
    ShoppingmallAdminShipmentsController,
    ShoppingmallSellerShipmentsItemsController,
    ShoppingmallCustomerShipmentsItemsController,
    ShoppingmallAdminShipmentsItemsController,
    ShoppingmallSellerOrdersItemsController,
    ShoppingmallAdminOrdersItemsController,
    ShoppingmallProductsReviewsController,
    ShoppingmallCustomerCustomersOrder_itemsReviewController,
    ShoppingmallCustomerReviewsController,
    ShoppingmallCustomerReviewsSnapshotsController,
    ShoppingmallSellerReviewsSnapshotsController,
    ShoppingmallAdminReviewsSnapshotsController,
    ShoppingmallCustomerCancellation_requestsController,
    ShoppingmallSellerCancellation_requestsController,
    ShoppingmallCustomerCancellation_request_snapshotsController,
    ShoppingmallCustomerRefund_requestsController,
    ShoppingmallSellerRefund_requestsController,
    ShoppingmallCustomerRefund_requestsSnapshotsController,
    ShoppingmallCustomerRefund_request_snapshotsController,
    ShoppingmallAdminAdmin_requestsController,
    ShoppingmallSuperadminAdmin_requestsController,
    ShoppingmallCustomerAdmin_requestsController,
    ShoppingmallAdminAdminrequestsSnapshotsController,
    ShoppingmallSuperadminAdminrequestsSnapshotsController,
    ShoppingmallAdminAdmin_requestsSnapshotsController,
    ShoppingmallSuperadminAdmin_requestsSnapshotsController,
    ShoppingmallSuperadminCustomersController,
    ShoppingmallSuperadminSellersController,
    ShoppingmallSellerDashboardController,
    ShoppingmallCategoriesProductsController,
    ShoppingmallAdminOrder_itemsCancelController,
    ShoppingmallAdminOrder_itemsRefundController,
    ShoppingmallCustomerShipmentsConfirm_deliveryController,
    ShoppingmallCustomerCancellation_requestsSnapshotsController,
    ShoppingmallSellerCancellation_requestsSnapshotsController,
    ShoppingmallAdminCancellation_requestsSnapshotsController,
    ShoppingmallSellerRefund_requestsSnapshotsController,
    ShoppingmallAdminRefund_requestsSnapshotsController,
    ShoppingmallSuperadminAdminrequestsPendingController,
    ShoppingmallAdminSellersPendingController,
    ShoppingmallAdminAdminSellersController,
    ShoppingmallAdminAdminCustomersController,
  ],
})
export class MyModule {}
