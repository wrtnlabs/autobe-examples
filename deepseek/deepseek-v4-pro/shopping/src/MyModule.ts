import { Module } from "@nestjs/common";

import { ShoppingmallAdminAdminsController } from "./controllers/shoppingMall/admin/admins/ShoppingmallAdminAdminsController";
import { ShoppingmallAdminAdminsPassword_resetsController } from "./controllers/shoppingMall/admin/admins/password-resets/ShoppingmallAdminAdminsPassword_resetsController";
import { ShoppingmallAdminAdminsSessionsController } from "./controllers/shoppingMall/admin/admins/sessions/ShoppingmallAdminAdminsSessionsController";
import { ShoppingmallAdminAudit_logsController } from "./controllers/shoppingMall/admin/audit-logs/ShoppingmallAdminAudit_logsController";
import { ShoppingmallAdminCancellation_requestsController } from "./controllers/shoppingMall/admin/cancellation-requests/ShoppingmallAdminCancellation_requestsController";
import { ShoppingmallAdminCancellation_requestsSnapshotsController } from "./controllers/shoppingMall/admin/cancellation-requests/snapshots/ShoppingmallAdminCancellation_requestsSnapshotsController";
import { ShoppingmallAdminCategoriesController } from "./controllers/shoppingMall/admin/categories/ShoppingmallAdminCategoriesController";
import { ShoppingmallAdminCustomersController } from "./controllers/shoppingMall/admin/customers/ShoppingmallAdminCustomersController";
import { ShoppingmallAdminCustomersEmail_verificationsController } from "./controllers/shoppingMall/admin/customers/email-verifications/ShoppingmallAdminCustomersEmail_verificationsController";
import { ShoppingmallAdminCustomersPassword_resetsController } from "./controllers/shoppingMall/admin/customers/password-resets/ShoppingmallAdminCustomersPassword_resetsController";
import { ShoppingmallAdminCustomersSessionsController } from "./controllers/shoppingMall/admin/customers/sessions/ShoppingmallAdminCustomersSessionsController";
import { ShoppingmallAdminGuestsController } from "./controllers/shoppingMall/admin/guests/ShoppingmallAdminGuestsController";
import { ShoppingmallAdminGuestsSessionsController } from "./controllers/shoppingMall/admin/guests/sessions/ShoppingmallAdminGuestsSessionsController";
import { ShoppingmallAdminOrder_itemsForce_cancelController } from "./controllers/shoppingMall/admin/order-items/force-cancel/ShoppingmallAdminOrder_itemsForce_cancelController";
import { ShoppingmallAdminOrder_itemsForce_refundController } from "./controllers/shoppingMall/admin/order-items/force-refund/ShoppingmallAdminOrder_itemsForce_refundController";
import { ShoppingmallAdminOrder_itemsProduct_snapshotController } from "./controllers/shoppingMall/admin/order-items/product-snapshot/ShoppingmallAdminOrder_itemsProduct_snapshotController";
import { ShoppingmallAdminOrder_itemsProduct_snapshotImagesController } from "./controllers/shoppingMall/admin/order-items/product-snapshot/images/ShoppingmallAdminOrder_itemsProduct_snapshotImagesController";
import { ShoppingmallAdminOrder_itemsSeller_snapshotController } from "./controllers/shoppingMall/admin/order-items/seller-snapshot/ShoppingmallAdminOrder_itemsSeller_snapshotController";
import { ShoppingmallAdminOrder_itemsVariant_snapshotController } from "./controllers/shoppingMall/admin/order-items/variant-snapshot/ShoppingmallAdminOrder_itemsVariant_snapshotController";
import { ShoppingmallAdminOrdersController } from "./controllers/shoppingMall/admin/orders/ShoppingmallAdminOrdersController";
import { ShoppingmallAdminOrdersForce_cancelController } from "./controllers/shoppingMall/admin/orders/force-cancel/ShoppingmallAdminOrdersForce_cancelController";
import { ShoppingmallAdminOrdersForce_refundController } from "./controllers/shoppingMall/admin/orders/force-refund/ShoppingmallAdminOrdersForce_refundController";
import { ShoppingmallAdminOrdersItemsController } from "./controllers/shoppingMall/admin/orders/items/ShoppingmallAdminOrdersItemsController";
import { ShoppingmallAdminOrdersShipmentsController } from "./controllers/shoppingMall/admin/orders/shipments/ShoppingmallAdminOrdersShipmentsController";
import { ShoppingmallAdminProductsController } from "./controllers/shoppingMall/admin/products/ShoppingmallAdminProductsController";
import { ShoppingmallAdminProductsReview_statisticsController } from "./controllers/shoppingMall/admin/products/review-statistics/ShoppingmallAdminProductsReview_statisticsController";
import { ShoppingmallAdminProductsSnapshotsController } from "./controllers/shoppingMall/admin/products/snapshots/ShoppingmallAdminProductsSnapshotsController";
import { ShoppingmallAdminProductsSnapshotsImagesController } from "./controllers/shoppingMall/admin/products/snapshots/images/ShoppingmallAdminProductsSnapshotsImagesController";
import { ShoppingmallAdminProductsSnapshotsVariant_snapshotsController } from "./controllers/shoppingMall/admin/products/snapshots/variant-snapshots/ShoppingmallAdminProductsSnapshotsVariant_snapshotsController";
import { ShoppingmallAdminProductsVariantsController } from "./controllers/shoppingMall/admin/products/variants/ShoppingmallAdminProductsVariantsController";
import { ShoppingmallAdminProductsVariantsInventory_recordsController } from "./controllers/shoppingMall/admin/products/variants/inventory-records/ShoppingmallAdminProductsVariantsInventory_recordsController";
import { ShoppingmallAdminProductsVariantsSnapshotsController } from "./controllers/shoppingMall/admin/products/variants/snapshots/ShoppingmallAdminProductsVariantsSnapshotsController";
import { ShoppingmallAdminProfilesController } from "./controllers/shoppingMall/admin/profiles/ShoppingmallAdminProfilesController";
import { ShoppingmallAdminProfilesSnapshotsController } from "./controllers/shoppingMall/admin/profiles/snapshots/ShoppingmallAdminProfilesSnapshotsController";
import { ShoppingmallAdminRefund_requestsController } from "./controllers/shoppingMall/admin/refund-requests/ShoppingmallAdminRefund_requestsController";
import { ShoppingmallAdminRefund_requestsSnapshotsController } from "./controllers/shoppingMall/admin/refund-requests/snapshots/ShoppingmallAdminRefund_requestsSnapshotsController";
import { ShoppingmallAdminReviewsSnapshotsController } from "./controllers/shoppingMall/admin/reviews/snapshots/ShoppingmallAdminReviewsSnapshotsController";
import { ShoppingmallAdminSellersController } from "./controllers/shoppingMall/admin/sellers/ShoppingmallAdminSellersController";
import { ShoppingmallAdminSellersPassword_resetsController } from "./controllers/shoppingMall/admin/sellers/password-resets/ShoppingmallAdminSellersPassword_resetsController";
import { ShoppingmallAdminSellersSessionsController } from "./controllers/shoppingMall/admin/sellers/sessions/ShoppingmallAdminSellersSessionsController";
import { ShoppingmallAdminShipmentsController } from "./controllers/shoppingMall/admin/shipments/ShoppingmallAdminShipmentsController";
import { ShoppingmallAuthAdminController } from "./controllers/shoppingMall/auth/admin/ShoppingmallAuthAdminController";
import { ShoppingmallAuthCustomerController } from "./controllers/shoppingMall/auth/customer/ShoppingmallAuthCustomerController";
import { ShoppingmallAuthGuestController } from "./controllers/shoppingMall/auth/guest/ShoppingmallAuthGuestController";
import { ShoppingmallAuthSellerController } from "./controllers/shoppingMall/auth/seller/ShoppingmallAuthSellerController";
import { ShoppingmallCancellation_requestsSnapshotsController } from "./controllers/shoppingMall/cancellation-requests/snapshots/ShoppingmallCancellation_requestsSnapshotsController";
import { ShoppingmallCategoriesController } from "./controllers/shoppingMall/categories/ShoppingmallCategoriesController";
import { ShoppingmallCustomerCancellation_requestsController } from "./controllers/shoppingMall/customer/cancellation-requests/ShoppingmallCustomerCancellation_requestsController";
import { ShoppingmallCustomerCancellation_requestsSnapshotsController } from "./controllers/shoppingMall/customer/cancellation-requests/snapshots/ShoppingmallCustomerCancellation_requestsSnapshotsController";
import { ShoppingmallCustomerCart_itemsController } from "./controllers/shoppingMall/customer/cart-items/ShoppingmallCustomerCart_itemsController";
import { ShoppingmallCustomerCategoriesProductsController } from "./controllers/shoppingMall/customer/categories/products/ShoppingmallCustomerCategoriesProductsController";
import { ShoppingmallCustomerOrder_itemsCancellation_requestsController } from "./controllers/shoppingMall/customer/order-items/cancellation-requests/ShoppingmallCustomerOrder_itemsCancellation_requestsController";
import { ShoppingmallCustomerOrder_itemsProduct_snapshotController } from "./controllers/shoppingMall/customer/order-items/product-snapshot/ShoppingmallCustomerOrder_itemsProduct_snapshotController";
import { ShoppingmallCustomerOrder_itemsProduct_snapshotImagesController } from "./controllers/shoppingMall/customer/order-items/product-snapshot/images/ShoppingmallCustomerOrder_itemsProduct_snapshotImagesController";
import { ShoppingmallCustomerOrder_itemsRefund_requestsController } from "./controllers/shoppingMall/customer/order-items/refund-requests/ShoppingmallCustomerOrder_itemsRefund_requestsController";
import { ShoppingmallCustomerOrder_itemsSeller_snapshotController } from "./controllers/shoppingMall/customer/order-items/seller-snapshot/ShoppingmallCustomerOrder_itemsSeller_snapshotController";
import { ShoppingmallCustomerOrder_itemsVariant_snapshotController } from "./controllers/shoppingMall/customer/order-items/variant-snapshot/ShoppingmallCustomerOrder_itemsVariant_snapshotController";
import { ShoppingmallCustomerOrdersController } from "./controllers/shoppingMall/customer/orders/ShoppingmallCustomerOrdersController";
import { ShoppingmallCustomerOrdersItemsController } from "./controllers/shoppingMall/customer/orders/items/ShoppingmallCustomerOrdersItemsController";
import { ShoppingmallCustomerOrdersShipmentsController } from "./controllers/shoppingMall/customer/orders/shipments/ShoppingmallCustomerOrdersShipmentsController";
import { ShoppingmallCustomerProductsController } from "./controllers/shoppingMall/customer/products/ShoppingmallCustomerProductsController";
import { ShoppingmallCustomerProductsDetailController } from "./controllers/shoppingMall/customer/products/detail/ShoppingmallCustomerProductsDetailController";
import { ShoppingmallCustomerProductsImagesController } from "./controllers/shoppingMall/customer/products/images/ShoppingmallCustomerProductsImagesController";
import { ShoppingmallCustomerProductsReview_statisticsController } from "./controllers/shoppingMall/customer/products/review-statistics/ShoppingmallCustomerProductsReview_statisticsController";
import { ShoppingmallCustomerProductsVariantsController } from "./controllers/shoppingMall/customer/products/variants/ShoppingmallCustomerProductsVariantsController";
import { ShoppingmallCustomerProductsVariantsOptionsController } from "./controllers/shoppingMall/customer/products/variants/options/ShoppingmallCustomerProductsVariantsOptionsController";
import { ShoppingmallCustomerProfileController } from "./controllers/shoppingMall/customer/profile/ShoppingmallCustomerProfileController";
import { ShoppingmallCustomerProfilesController } from "./controllers/shoppingMall/customer/profiles/ShoppingmallCustomerProfilesController";
import { ShoppingmallCustomerRefund_requestsController } from "./controllers/shoppingMall/customer/refund-requests/ShoppingmallCustomerRefund_requestsController";
import { ShoppingmallCustomerRefund_requestsSnapshotsController } from "./controllers/shoppingMall/customer/refund-requests/snapshots/ShoppingmallCustomerRefund_requestsSnapshotsController";
import { ShoppingmallCustomerReviewsController } from "./controllers/shoppingMall/customer/reviews/ShoppingmallCustomerReviewsController";
import { ShoppingmallCustomerReviewsSnapshotsController } from "./controllers/shoppingMall/customer/reviews/snapshots/ShoppingmallCustomerReviewsSnapshotsController";
import { ShoppingmallCustomerSearchProductsController } from "./controllers/shoppingMall/customer/search/products/ShoppingmallCustomerSearchProductsController";
import { ShoppingmallCustomerSessionsController } from "./controllers/shoppingMall/customer/sessions/ShoppingmallCustomerSessionsController";
import { ShoppingmallCustomerShipmentsConfirm_deliveryController } from "./controllers/shoppingMall/customer/shipments/confirm-delivery/ShoppingmallCustomerShipmentsConfirm_deliveryController";
import { ShoppingmallCustomerWishlist_itemsController } from "./controllers/shoppingMall/customer/wishlist-items/ShoppingmallCustomerWishlist_itemsController";
import { ShoppingmallOrder_itemsProduct_snapshotImagesController } from "./controllers/shoppingMall/order-items/product-snapshot/images/ShoppingmallOrder_itemsProduct_snapshotImagesController";
import { ShoppingmallProductsReviewsController } from "./controllers/shoppingMall/products/reviews/ShoppingmallProductsReviewsController";
import { ShoppingmallRefund_requestsSnapshotsController } from "./controllers/shoppingMall/refund-requests/snapshots/ShoppingmallRefund_requestsSnapshotsController";
import { ShoppingmallSellerCancellation_requestsController } from "./controllers/shoppingMall/seller/cancellation-requests/ShoppingmallSellerCancellation_requestsController";
import { ShoppingmallSellerCancellation_requestsSnapshotsController } from "./controllers/shoppingMall/seller/cancellation-requests/snapshots/ShoppingmallSellerCancellation_requestsSnapshotsController";
import { ShoppingmallSellerDashboardController } from "./controllers/shoppingMall/seller/dashboard/ShoppingmallSellerDashboardController";
import { ShoppingmallSellerOrder_itemsController } from "./controllers/shoppingMall/seller/order-items/ShoppingmallSellerOrder_itemsController";
import { ShoppingmallSellerOrder_itemsProduct_snapshotController } from "./controllers/shoppingMall/seller/order-items/product-snapshot/ShoppingmallSellerOrder_itemsProduct_snapshotController";
import { ShoppingmallSellerOrder_itemsProduct_snapshotImagesController } from "./controllers/shoppingMall/seller/order-items/product-snapshot/images/ShoppingmallSellerOrder_itemsProduct_snapshotImagesController";
import { ShoppingmallSellerOrder_itemsSeller_snapshotController } from "./controllers/shoppingMall/seller/order-items/seller-snapshot/ShoppingmallSellerOrder_itemsSeller_snapshotController";
import { ShoppingmallSellerOrder_itemsVariant_snapshotController } from "./controllers/shoppingMall/seller/order-items/variant-snapshot/ShoppingmallSellerOrder_itemsVariant_snapshotController";
import { ShoppingmallSellerOrdersController } from "./controllers/shoppingMall/seller/orders/ShoppingmallSellerOrdersController";
import { ShoppingmallSellerOrdersShipmentsController } from "./controllers/shoppingMall/seller/orders/shipments/ShoppingmallSellerOrdersShipmentsController";
import { ShoppingmallSellerProductsController } from "./controllers/shoppingMall/seller/products/ShoppingmallSellerProductsController";
import { ShoppingmallSellerProductsImagesController } from "./controllers/shoppingMall/seller/products/images/ShoppingmallSellerProductsImagesController";
import { ShoppingmallSellerProductsReview_statisticsController } from "./controllers/shoppingMall/seller/products/review-statistics/ShoppingmallSellerProductsReview_statisticsController";
import { ShoppingmallSellerProductsSnapshotsController } from "./controllers/shoppingMall/seller/products/snapshots/ShoppingmallSellerProductsSnapshotsController";
import { ShoppingmallSellerProductsSnapshotsImagesController } from "./controllers/shoppingMall/seller/products/snapshots/images/ShoppingmallSellerProductsSnapshotsImagesController";
import { ShoppingmallSellerProductsSnapshotsVariant_snapshotsController } from "./controllers/shoppingMall/seller/products/snapshots/variant-snapshots/ShoppingmallSellerProductsSnapshotsVariant_snapshotsController";
import { ShoppingmallSellerProductsVariantsController } from "./controllers/shoppingMall/seller/products/variants/ShoppingmallSellerProductsVariantsController";
import { ShoppingmallSellerProductsVariantsInventory_recordsController } from "./controllers/shoppingMall/seller/products/variants/inventory-records/ShoppingmallSellerProductsVariantsInventory_recordsController";
import { ShoppingmallSellerProductsVariantsOptionsController } from "./controllers/shoppingMall/seller/products/variants/options/ShoppingmallSellerProductsVariantsOptionsController";
import { ShoppingmallSellerProductsVariantsSnapshotsController } from "./controllers/shoppingMall/seller/products/variants/snapshots/ShoppingmallSellerProductsVariantsSnapshotsController";
import { ShoppingmallSellerProfileController } from "./controllers/shoppingMall/seller/profile/ShoppingmallSellerProfileController";
import { ShoppingmallSellerProfileSnapshotsController } from "./controllers/shoppingMall/seller/profile/snapshots/ShoppingmallSellerProfileSnapshotsController";
import { ShoppingmallSellerRefund_requestsController } from "./controllers/shoppingMall/seller/refund-requests/ShoppingmallSellerRefund_requestsController";
import { ShoppingmallSellerRefund_requestsSnapshotsController } from "./controllers/shoppingMall/seller/refund-requests/snapshots/ShoppingmallSellerRefund_requestsSnapshotsController";
import { ShoppingmallSellerResubmissionController } from "./controllers/shoppingMall/seller/resubmission/ShoppingmallSellerResubmissionController";
import { ShoppingmallSellerShipmentsController } from "./controllers/shoppingMall/seller/shipments/ShoppingmallSellerShipmentsController";

@Module({
  controllers: [
    ShoppingmallAuthGuestController,
    ShoppingmallAuthCustomerController,
    ShoppingmallAuthSellerController,
    ShoppingmallAuthAdminController,
    ShoppingmallAdminGuestsController,
    ShoppingmallAdminGuestsSessionsController,
    ShoppingmallAdminCustomersController,
    ShoppingmallCustomerProfileController,
    ShoppingmallCustomerSessionsController,
    ShoppingmallAdminCustomersSessionsController,
    ShoppingmallAdminCustomersPassword_resetsController,
    ShoppingmallAdminCustomersEmail_verificationsController,
    ShoppingmallAdminSellersController,
    ShoppingmallAdminSellersSessionsController,
    ShoppingmallAdminSellersPassword_resetsController,
    ShoppingmallAdminProfilesController,
    ShoppingmallCustomerProfilesController,
    ShoppingmallSellerProfileController,
    ShoppingmallSellerProfileSnapshotsController,
    ShoppingmallAdminProfilesSnapshotsController,
    ShoppingmallAdminAdminsController,
    ShoppingmallAdminAdminsSessionsController,
    ShoppingmallAdminAdminsPassword_resetsController,
    ShoppingmallAdminAudit_logsController,
    ShoppingmallCategoriesController,
    ShoppingmallAdminCategoriesController,
    ShoppingmallCustomerCategoriesProductsController,
    ShoppingmallCustomerProductsController,
    ShoppingmallSellerProductsController,
    ShoppingmallAdminProductsController,
    ShoppingmallCustomerProductsImagesController,
    ShoppingmallSellerProductsImagesController,
    ShoppingmallCustomerProductsVariantsController,
    ShoppingmallSellerProductsVariantsController,
    ShoppingmallAdminProductsVariantsController,
    ShoppingmallCustomerProductsVariantsOptionsController,
    ShoppingmallSellerProductsVariantsOptionsController,
    ShoppingmallSellerProductsVariantsInventory_recordsController,
    ShoppingmallAdminProductsVariantsInventory_recordsController,
    ShoppingmallSellerProductsSnapshotsController,
    ShoppingmallAdminProductsSnapshotsController,
    ShoppingmallSellerProductsSnapshotsImagesController,
    ShoppingmallAdminProductsSnapshotsImagesController,
    ShoppingmallSellerProductsVariantsSnapshotsController,
    ShoppingmallAdminProductsVariantsSnapshotsController,
    ShoppingmallSellerProductsSnapshotsVariant_snapshotsController,
    ShoppingmallAdminProductsSnapshotsVariant_snapshotsController,
    ShoppingmallCustomerWishlist_itemsController,
    ShoppingmallCustomerCart_itemsController,
    ShoppingmallCustomerOrdersController,
    ShoppingmallAdminOrdersController,
    ShoppingmallSellerOrdersController,
    ShoppingmallCustomerOrdersItemsController,
    ShoppingmallAdminOrdersItemsController,
    ShoppingmallSellerOrder_itemsController,
    ShoppingmallSellerOrdersShipmentsController,
    ShoppingmallCustomerOrdersShipmentsController,
    ShoppingmallAdminOrdersShipmentsController,
    ShoppingmallSellerShipmentsController,
    ShoppingmallAdminShipmentsController,
    ShoppingmallCustomerOrder_itemsCancellation_requestsController,
    ShoppingmallCustomerCancellation_requestsController,
    ShoppingmallSellerCancellation_requestsController,
    ShoppingmallAdminCancellation_requestsController,
    ShoppingmallCustomerOrder_itemsRefund_requestsController,
    ShoppingmallCustomerRefund_requestsController,
    ShoppingmallSellerRefund_requestsController,
    ShoppingmallAdminRefund_requestsController,
    ShoppingmallCustomerOrder_itemsProduct_snapshotController,
    ShoppingmallSellerOrder_itemsProduct_snapshotController,
    ShoppingmallAdminOrder_itemsProduct_snapshotController,
    ShoppingmallCustomerOrder_itemsVariant_snapshotController,
    ShoppingmallSellerOrder_itemsVariant_snapshotController,
    ShoppingmallAdminOrder_itemsVariant_snapshotController,
    ShoppingmallCustomerOrder_itemsSeller_snapshotController,
    ShoppingmallSellerOrder_itemsSeller_snapshotController,
    ShoppingmallAdminOrder_itemsSeller_snapshotController,
    ShoppingmallCustomerOrder_itemsProduct_snapshotImagesController,
    ShoppingmallSellerOrder_itemsProduct_snapshotImagesController,
    ShoppingmallAdminOrder_itemsProduct_snapshotImagesController,
    ShoppingmallCustomerCancellation_requestsSnapshotsController,
    ShoppingmallSellerCancellation_requestsSnapshotsController,
    ShoppingmallAdminCancellation_requestsSnapshotsController,
    ShoppingmallCustomerRefund_requestsSnapshotsController,
    ShoppingmallSellerRefund_requestsSnapshotsController,
    ShoppingmallAdminRefund_requestsSnapshotsController,
    ShoppingmallCancellation_requestsSnapshotsController,
    ShoppingmallRefund_requestsSnapshotsController,
    ShoppingmallOrder_itemsProduct_snapshotImagesController,
    ShoppingmallProductsReviewsController,
    ShoppingmallCustomerReviewsController,
    ShoppingmallCustomerReviewsSnapshotsController,
    ShoppingmallAdminReviewsSnapshotsController,
    ShoppingmallSellerResubmissionController,
    ShoppingmallSellerDashboardController,
    ShoppingmallCustomerSearchProductsController,
    ShoppingmallCustomerProductsDetailController,
    ShoppingmallAdminOrder_itemsForce_cancelController,
    ShoppingmallAdminOrdersForce_cancelController,
    ShoppingmallAdminOrder_itemsForce_refundController,
    ShoppingmallAdminOrdersForce_refundController,
    ShoppingmallCustomerShipmentsConfirm_deliveryController,
    ShoppingmallCustomerProductsReview_statisticsController,
    ShoppingmallSellerProductsReview_statisticsController,
    ShoppingmallAdminProductsReview_statisticsController,
  ],
})
export class MyModule {}
