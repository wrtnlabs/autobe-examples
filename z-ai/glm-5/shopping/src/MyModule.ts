import { Module } from "@nestjs/common";

import { ShoppingmallAdminAdminCustomersController } from "./controllers/shoppingMall/admin/admin/customers/unban/ShoppingmallAdminAdminCustomersController";
import { ShoppingmallAdminAdminsController } from "./controllers/shoppingMall/admin/admins/ShoppingmallAdminAdminsController";
import { ShoppingmallAdminAudit_logsController } from "./controllers/shoppingMall/admin/audit-logs/ShoppingmallAdminAudit_logsController";
import { ShoppingmallAdminCancellation_requestsForce_approveController } from "./controllers/shoppingMall/admin/cancellation-requests/force-approve/ShoppingmallAdminCancellation_requestsForce_approveController";
import { ShoppingmallAdminCategoriesController } from "./controllers/shoppingMall/admin/categories/ShoppingmallAdminCategoriesController";
import { ShoppingmallAdminCustomersController } from "./controllers/shoppingMall/admin/customers/ban/ShoppingmallAdminCustomersController";
import { ShoppingmallAdminOrdersForce_cancelController } from "./controllers/shoppingMall/admin/orders/force-cancel/ShoppingmallAdminOrdersForce_cancelController";
import { ShoppingmallAdminOrdersForce_refundController } from "./controllers/shoppingMall/admin/orders/force-refund/ShoppingmallAdminOrdersForce_refundController";
import { ShoppingmallAdminProductsForceController } from "./controllers/shoppingMall/admin/products/force/ShoppingmallAdminProductsForceController";
import { ShoppingmallAdminRefund_requestsForce_approveController } from "./controllers/shoppingMall/admin/refund-requests/force-approve/ShoppingmallAdminRefund_requestsForce_approveController";
import { ShoppingmallAdminSellersController } from "./controllers/shoppingMall/admin/sellers/ShoppingmallAdminSellersController";
import { ShoppingmallAdminShipmentsForce_deliveryController } from "./controllers/shoppingMall/admin/shipments/force-delivery/ShoppingmallAdminShipmentsForce_deliveryController";
import { ShoppingmallAuthAdminController } from "./controllers/shoppingMall/auth/admin/ShoppingmallAuthAdminController";
import { ShoppingmallAuthCustomerController } from "./controllers/shoppingMall/auth/customer/ShoppingmallAuthCustomerController";
import { ShoppingmallAuthSellerController } from "./controllers/shoppingMall/auth/seller/ShoppingmallAuthSellerController";
import { ShoppingmallCategoriesController } from "./controllers/shoppingMall/categories/ShoppingmallCategoriesController";
import { ShoppingmallCustomerCancellation_requestsController } from "./controllers/shoppingMall/customer/cancellation-requests/ShoppingmallCustomerCancellation_requestsController";
import { ShoppingmallCustomerCancellation_requestsSnapshotsController } from "./controllers/shoppingMall/customer/cancellation-requests/snapshots/ShoppingmallCustomerCancellation_requestsSnapshotsController";
import { ShoppingmallCustomerCart_itemsController } from "./controllers/shoppingMall/customer/cart-items/ShoppingmallCustomerCart_itemsController";
import { ShoppingmallCustomerCartController } from "./controllers/shoppingMall/customer/cart/ShoppingmallCustomerCartController";
import { ShoppingmallCustomerCustomersMeController } from "./controllers/shoppingMall/customer/customers/me/ShoppingmallCustomerCustomersMeController";
import { ShoppingmallCustomerCustomersMeCartController } from "./controllers/shoppingMall/customer/customers/me/cart/ShoppingmallCustomerCustomersMeCartController";
import { ShoppingmallCustomerCustomersMeCheckoutController } from "./controllers/shoppingMall/customer/customers/me/checkout/prepare/ShoppingmallCustomerCustomersMeCheckoutController";
import { ShoppingmallCustomerCustomersMeOrdersController } from "./controllers/shoppingMall/customer/customers/me/orders/ShoppingmallCustomerCustomersMeOrdersController";
import { ShoppingmallCustomerCustomersMeReviewsController } from "./controllers/shoppingMall/customer/customers/me/reviews/ShoppingmallCustomerCustomersMeReviewsController";
import { ShoppingmallCustomerCustomersMeWishlistController } from "./controllers/shoppingMall/customer/customers/me/wishlist/ShoppingmallCustomerCustomersMeWishlistController";
import { ShoppingmallCustomerOrder_itemsCancellation_requestController } from "./controllers/shoppingMall/customer/order-items/cancellation-request/ShoppingmallCustomerOrder_itemsCancellation_requestController";
import { ShoppingmallCustomerOrdersController } from "./controllers/shoppingMall/customer/orders/ShoppingmallCustomerOrdersController";
import { ShoppingmallCustomerOrdersAddressController } from "./controllers/shoppingMall/customer/orders/address/ShoppingmallCustomerOrdersAddressController";
import { ShoppingmallCustomerOrdersItemsController } from "./controllers/shoppingMall/customer/orders/items/ShoppingmallCustomerOrdersItemsController";
import { ShoppingmallCustomerOrdersItemsRefundController } from "./controllers/shoppingMall/customer/orders/items/refund/ShoppingmallCustomerOrdersItemsRefundController";
import { ShoppingmallCustomerOrdersItemsVariant_optionsController } from "./controllers/shoppingMall/customer/orders/items/variant-options/ShoppingmallCustomerOrdersItemsVariant_optionsController";
import { ShoppingmallCustomerProductsReview_eligibilityController } from "./controllers/shoppingMall/customer/products/review-eligibility/ShoppingmallCustomerProductsReview_eligibilityController";
import { ShoppingmallCustomerRefund_requestsController } from "./controllers/shoppingMall/customer/refund-requests/ShoppingmallCustomerRefund_requestsController";
import { ShoppingmallCustomerReviewsController } from "./controllers/shoppingMall/customer/reviews/ShoppingmallCustomerReviewsController";
import { ShoppingmallCustomerReviewsSnapshotsController } from "./controllers/shoppingMall/customer/reviews/snapshots/ShoppingmallCustomerReviewsSnapshotsController";
import { ShoppingmallCustomerSessionsController } from "./controllers/shoppingMall/customer/sessions/ShoppingmallCustomerSessionsController";
import { ShoppingmallCustomerShipmentsConfirm_deliveryController } from "./controllers/shoppingMall/customer/shipments/confirm-delivery/ShoppingmallCustomerShipmentsConfirm_deliveryController";
import { ShoppingmallCustomerWishlistsController } from "./controllers/shoppingMall/customer/wishlists/ShoppingmallCustomerWishlistsController";
import { ShoppingmallCustomersController } from "./controllers/shoppingMall/customers/ShoppingmallCustomersController";
import { ShoppingmallProductsController } from "./controllers/shoppingMall/products/ShoppingmallProductsController";
import { ShoppingmallProductsReviewsController } from "./controllers/shoppingMall/products/reviews/ShoppingmallProductsReviewsController";
import { ShoppingmallReviewsController } from "./controllers/shoppingMall/reviews/ShoppingmallReviewsController";
import { ShoppingmallSellerCancellation_requestsController } from "./controllers/shoppingMall/seller/cancellation-requests/ShoppingmallSellerCancellation_requestsController";
import { ShoppingmallSellerOrder_item_statsController } from "./controllers/shoppingMall/seller/order-item-stats/ShoppingmallSellerOrder_item_statsController";
import { ShoppingmallSellerOrder_itemsPendingController } from "./controllers/shoppingMall/seller/order-items/pending/ShoppingmallSellerOrder_itemsPendingController";
import { ShoppingmallSellerProductsController } from "./controllers/shoppingMall/seller/products/ShoppingmallSellerProductsController";
import { ShoppingmallSellerProductsImagesController } from "./controllers/shoppingMall/seller/products/images/ShoppingmallSellerProductsImagesController";
import { ShoppingmallSellerProductsSnapshotsController } from "./controllers/shoppingMall/seller/products/snapshots/ShoppingmallSellerProductsSnapshotsController";
import { ShoppingmallSellerProductsVariantsController } from "./controllers/shoppingMall/seller/products/variants/ShoppingmallSellerProductsVariantsController";
import { ShoppingmallSellerController } from "./controllers/shoppingMall/seller/reapply/ShoppingmallSellerController";
import { ShoppingmallSellerRefund_requestsController } from "./controllers/shoppingMall/seller/refund-requests/approve/ShoppingmallSellerRefund_requestsController";
import { ShoppingmallSellerSellersMeCancellation_requestsController } from "./controllers/shoppingMall/seller/sellers/me/cancellation-requests/ShoppingmallSellerSellersMeCancellation_requestsController";
import { ShoppingmallSellerSellersMeController } from "./controllers/shoppingMall/seller/sellers/me/dashboard/ShoppingmallSellerSellersMeController";
import { ShoppingmallSellerSellersMeOrder_itemsController } from "./controllers/shoppingMall/seller/sellers/me/order-items/ShoppingmallSellerSellersMeOrder_itemsController";
import { ShoppingmallSellerSellersMeProductsController } from "./controllers/shoppingMall/seller/sellers/me/products/ShoppingmallSellerSellersMeProductsController";
import { ShoppingmallSellerSellersMeProductsImagesController } from "./controllers/shoppingMall/seller/sellers/me/products/images/ShoppingmallSellerSellersMeProductsImagesController";
import { ShoppingmallSellerSellersMeProductsVariantsController } from "./controllers/shoppingMall/seller/sellers/me/products/variants/ShoppingmallSellerSellersMeProductsVariantsController";
import { ShoppingmallSellerSellersMeRefund_requestsController } from "./controllers/shoppingMall/seller/sellers/me/refund-requests/reject/ShoppingmallSellerSellersMeRefund_requestsController";
import { ShoppingmallSellerSellersMeShipmentsController } from "./controllers/shoppingMall/seller/sellers/me/shipments/ShoppingmallSellerSellersMeShipmentsController";
import { ShoppingmallSellerSellersMeVariantsInventoryAddController } from "./controllers/shoppingMall/seller/sellers/me/variants/inventory/add/ShoppingmallSellerSellersMeVariantsInventoryAddController";
import { ShoppingmallSellerSellersMeVariantsInventorySubtractController } from "./controllers/shoppingMall/seller/sellers/me/variants/inventory/subtract/ShoppingmallSellerSellersMeVariantsInventorySubtractController";
import { ShoppingmallSellerShipmentsController } from "./controllers/shoppingMall/seller/shipments/ShoppingmallSellerShipmentsController";
import { ShoppingmallSellerShipmentsAudit_logsController } from "./controllers/shoppingMall/seller/shipments/audit-logs/ShoppingmallSellerShipmentsAudit_logsController";
import { ShoppingmallSellerVariantsInventoryHistoriesController } from "./controllers/shoppingMall/seller/variants/inventory/histories/ShoppingmallSellerVariantsInventoryHistoriesController";
import { ShoppingmallSellersController } from "./controllers/shoppingMall/sellers/ShoppingmallSellersController";

@Module({
  controllers: [
    ShoppingmallAuthCustomerController,
    ShoppingmallAuthSellerController,
    ShoppingmallAuthAdminController,
    ShoppingmallCustomersController,
    ShoppingmallCustomerCustomersMeController,
    ShoppingmallCustomerSessionsController,
    ShoppingmallCustomerWishlistsController,
    ShoppingmallCustomerCustomersMeWishlistController,
    ShoppingmallCustomerCart_itemsController,
    ShoppingmallSellersController,
    ShoppingmallAdminAdminsController,
    ShoppingmallAdminAudit_logsController,
    ShoppingmallCategoriesController,
    ShoppingmallAdminCategoriesController,
    ShoppingmallProductsController,
    ShoppingmallProductsReviewsController,
    ShoppingmallSellerProductsController,
    ShoppingmallSellerSellersMeProductsController,
    ShoppingmallSellerProductsVariantsController,
    ShoppingmallSellerSellersMeProductsVariantsController,
    ShoppingmallSellerSellersMeProductsImagesController,
    ShoppingmallSellerProductsImagesController,
    ShoppingmallSellerSellersMeVariantsInventoryAddController,
    ShoppingmallSellerSellersMeVariantsInventorySubtractController,
    ShoppingmallSellerVariantsInventoryHistoriesController,
    ShoppingmallSellerProductsSnapshotsController,
    ShoppingmallCustomerCartController,
    ShoppingmallCustomerCustomersMeCartController,
    ShoppingmallCustomerOrdersController,
    ShoppingmallCustomerCustomersMeOrdersController,
    ShoppingmallCustomerOrdersItemsController,
    ShoppingmallCustomerOrdersAddressController,
    ShoppingmallCustomerOrdersItemsVariant_optionsController,
    ShoppingmallSellerShipmentsController,
    ShoppingmallSellerSellersMeShipmentsController,
    ShoppingmallSellerShipmentsAudit_logsController,
    ShoppingmallCustomerOrder_itemsCancellation_requestController,
    ShoppingmallCustomerCancellation_requestsController,
    ShoppingmallSellerSellersMeCancellation_requestsController,
    ShoppingmallCustomerCancellation_requestsSnapshotsController,
    ShoppingmallCustomerOrdersItemsRefundController,
    ShoppingmallCustomerRefund_requestsController,
    ShoppingmallSellerRefund_requestsController,
    ShoppingmallSellerSellersMeRefund_requestsController,
    ShoppingmallAdminRefund_requestsForce_approveController,
    ShoppingmallCustomerReviewsController,
    ShoppingmallReviewsController,
    ShoppingmallCustomerCustomersMeReviewsController,
    ShoppingmallCustomerReviewsSnapshotsController,
    ShoppingmallSellerSellersMeController,
    ShoppingmallSellerSellersMeOrder_itemsController,
    ShoppingmallSellerController,
    ShoppingmallAdminSellersController,
    ShoppingmallAdminProductsForceController,
    ShoppingmallAdminOrdersForce_cancelController,
    ShoppingmallAdminOrdersForce_refundController,
    ShoppingmallAdminCustomersController,
    ShoppingmallAdminAdminCustomersController,
    ShoppingmallCustomerCustomersMeCheckoutController,
    ShoppingmallCustomerShipmentsConfirm_deliveryController,
    ShoppingmallSellerOrder_item_statsController,
    ShoppingmallSellerOrder_itemsPendingController,
    ShoppingmallAdminShipmentsForce_deliveryController,
    ShoppingmallSellerCancellation_requestsController,
    ShoppingmallAdminCancellation_requestsForce_approveController,
    ShoppingmallCustomerProductsReview_eligibilityController,
  ],
})
export class MyModule {}
