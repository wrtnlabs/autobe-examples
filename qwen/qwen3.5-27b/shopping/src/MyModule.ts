import { Module } from "@nestjs/common";

import { ShoppingmallAdminAdmin_promotion_requestsController } from "./controllers/shoppingMall/admin/admin-promotion-requests/ShoppingmallAdminAdmin_promotion_requestsController";
import { ShoppingmallAdminAdmin_promotion_requestsSnapshotsController } from "./controllers/shoppingMall/admin/admin-promotion-requests/snapshots/ShoppingmallAdminAdmin_promotion_requestsSnapshotsController";
import { ShoppingmallAdminAdminCategoriesController } from "./controllers/shoppingMall/admin/admin/categories/ShoppingmallAdminAdminCategoriesController";
import { ShoppingmallAdminAdminpromotionrequestsController } from "./controllers/shoppingMall/admin/adminPromotionRequests/ShoppingmallAdminAdminpromotionrequestsController";
import { ShoppingmallAdminAdminpromotionrequestsSnapshotsController } from "./controllers/shoppingMall/admin/adminPromotionRequests/snapshots/ShoppingmallAdminAdminpromotionrequestsSnapshotsController";
import { ShoppingmallAdminAdminsController } from "./controllers/shoppingMall/admin/admins/ShoppingmallAdminAdminsController";
import { ShoppingmallAdminAnalyticsCustomersController } from "./controllers/shoppingMall/admin/analytics/customers/ShoppingmallAdminAnalyticsCustomersController";
import { ShoppingmallAdminAnalyticsOrdersController } from "./controllers/shoppingMall/admin/analytics/orders/ShoppingmallAdminAnalyticsOrdersController";
import { ShoppingmallAdminAnalyticsSellersController } from "./controllers/shoppingMall/admin/analytics/sellers/ShoppingmallAdminAnalyticsSellersController";
import { ShoppingmallAdminCancellation_requestsController } from "./controllers/shoppingMall/admin/cancellation-requests/ShoppingmallAdminCancellation_requestsController";
import { ShoppingmallAdminCancellationrequestsController } from "./controllers/shoppingMall/admin/cancellationRequests/ShoppingmallAdminCancellationrequestsController";
import { ShoppingmallAdminCancellationsnapshotsController } from "./controllers/shoppingMall/admin/cancellationSnapshots/ShoppingmallAdminCancellationsnapshotsController";
import { ShoppingmallAdminCategoriesController } from "./controllers/shoppingMall/admin/categories/ShoppingmallAdminCategoriesController";
import { ShoppingmallAdminCustomersController } from "./controllers/shoppingMall/admin/customers/ShoppingmallAdminCustomersController";
import { ShoppingmallAdminCustomersBulk_banController } from "./controllers/shoppingMall/admin/customers/bulk-ban/ShoppingmallAdminCustomersBulk_banController";
import { ShoppingmallAdminCustomersBulk_unbanController } from "./controllers/shoppingMall/admin/customers/bulk-unban/ShoppingmallAdminCustomersBulk_unbanController";
import { ShoppingmallAdminCustomersMetricsController } from "./controllers/shoppingMall/admin/customers/metrics/ShoppingmallAdminCustomersMetricsController";
import { ShoppingmallAdminOrdersController } from "./controllers/shoppingMall/admin/orders/ShoppingmallAdminOrdersController";
import { ShoppingmallAdminOrdersItemsController } from "./controllers/shoppingMall/admin/orders/items/ShoppingmallAdminOrdersItemsController";
import { ShoppingmallAdminOrdersItemsForce_cancelController } from "./controllers/shoppingMall/admin/orders/items/force-cancel/ShoppingmallAdminOrdersItemsForce_cancelController";
import { ShoppingmallAdminOrdersItemsForce_refundController } from "./controllers/shoppingMall/admin/orders/items/force-refund/ShoppingmallAdminOrdersItemsForce_refundController";
import { ShoppingmallAdminRefund_requestsController } from "./controllers/shoppingMall/admin/refund-requests/ShoppingmallAdminRefund_requestsController";
import { ShoppingmallAdminRefund_requestsSnapshotsController } from "./controllers/shoppingMall/admin/refund-requests/snapshots/ShoppingmallAdminRefund_requestsSnapshotsController";
import { ShoppingmallAdminReviewsSnapshotsController } from "./controllers/shoppingMall/admin/reviews/snapshots/ShoppingmallAdminReviewsSnapshotsController";
import { ShoppingmallAdminSeller_approval_requestsController } from "./controllers/shoppingMall/admin/seller-approval-requests/ShoppingmallAdminSeller_approval_requestsController";
import { ShoppingmallAdminSeller_approval_requestsSnapshotsController } from "./controllers/shoppingMall/admin/seller-approval-requests/snapshots/ShoppingmallAdminSeller_approval_requestsSnapshotsController";
import { ShoppingmallAdminSellerapprovalrequestsController } from "./controllers/shoppingMall/admin/sellerApprovalRequests/ShoppingmallAdminSellerapprovalrequestsController";
import { ShoppingmallAdminSellerapprovalrequestsSnapshotsController } from "./controllers/shoppingMall/admin/sellerApprovalRequests/snapshots/ShoppingmallAdminSellerapprovalrequestsSnapshotsController";
import { ShoppingmallAdminSellersController } from "./controllers/shoppingMall/admin/sellers/ShoppingmallAdminSellersController";
import { ShoppingmallAdminSellersAnalyticsOrdersController } from "./controllers/shoppingMall/admin/sellers/analytics/orders/ShoppingmallAdminSellersAnalyticsOrdersController";
import { ShoppingmallAdminSellersBulk_banController } from "./controllers/shoppingMall/admin/sellers/bulk-ban/ShoppingmallAdminSellersBulk_banController";
import { ShoppingmallAdminSellersBulk_unbanController } from "./controllers/shoppingMall/admin/sellers/bulk-unban/ShoppingmallAdminSellersBulk_unbanController";
import { ShoppingmallAdminSellersMetricsController } from "./controllers/shoppingMall/admin/sellers/metrics/ShoppingmallAdminSellersMetricsController";
import { ShoppingmallAdminSellersSnapshotsController } from "./controllers/shoppingMall/admin/sellers/snapshots/ShoppingmallAdminSellersSnapshotsController";
import { ShoppingmallAdminShipmentsItemsController } from "./controllers/shoppingMall/admin/shipments/items/ShoppingmallAdminShipmentsItemsController";
import { ShoppingmallAuthAdminController } from "./controllers/shoppingMall/auth/admin/ShoppingmallAuthAdminController";
import { ShoppingmallAuthCustomerController } from "./controllers/shoppingMall/auth/customer/ShoppingmallAuthCustomerController";
import { ShoppingmallAuthGuestController } from "./controllers/shoppingMall/auth/guest/ShoppingmallAuthGuestController";
import { ShoppingmallAuthSellerController } from "./controllers/shoppingMall/auth/seller/ShoppingmallAuthSellerController";
import { ShoppingmallCategoriesController } from "./controllers/shoppingMall/categories/ShoppingmallCategoriesController";
import { ShoppingmallCustomerCancellation_requestsController } from "./controllers/shoppingMall/customer/cancellation-requests/dashboard/ShoppingmallCustomerCancellation_requestsController";
import { ShoppingmallCustomerCancellationrequestsController } from "./controllers/shoppingMall/customer/cancellationRequests/ShoppingmallCustomerCancellationrequestsController";
import { ShoppingmallCustomerCancellationsnapshotsController } from "./controllers/shoppingMall/customer/cancellationSnapshots/ShoppingmallCustomerCancellationsnapshotsController";
import { ShoppingmallCustomerCart_itemsController } from "./controllers/shoppingMall/customer/cart-items/ShoppingmallCustomerCart_itemsController";
import { ShoppingmallCustomerCart_itemsSnapshotsController } from "./controllers/shoppingMall/customer/cart-items/snapshots/ShoppingmallCustomerCart_itemsSnapshotsController";
import { ShoppingmallCustomerCheckoutController } from "./controllers/shoppingMall/customer/checkout/review/ShoppingmallCustomerCheckoutController";
import { ShoppingmallCustomerCustomersMeCart_itemsController } from "./controllers/shoppingMall/customer/customers/me/cart-items/ShoppingmallCustomerCustomersMeCart_itemsController";
import { ShoppingmallCustomerCustomersMeOrdersController } from "./controllers/shoppingMall/customer/customers/me/orders/ShoppingmallCustomerCustomersMeOrdersController";
import { ShoppingmallCustomerOrdersController } from "./controllers/shoppingMall/customer/orders/ShoppingmallCustomerOrdersController";
import { ShoppingmallCustomerOrdersItemsController } from "./controllers/shoppingMall/customer/orders/items/ShoppingmallCustomerOrdersItemsController";
import { ShoppingmallCustomerProductsController } from "./controllers/shoppingMall/customer/products/ShoppingmallCustomerProductsController";
import { ShoppingmallCustomerProfileController } from "./controllers/shoppingMall/customer/profile/ShoppingmallCustomerProfileController";
import { ShoppingmallCustomerRefund_requestsController } from "./controllers/shoppingMall/customer/refund-requests/ShoppingmallCustomerRefund_requestsController";
import { ShoppingmallCustomerRefund_requestsSnapshotsController } from "./controllers/shoppingMall/customer/refund-requests/snapshots/ShoppingmallCustomerRefund_requestsSnapshotsController";
import { ShoppingmallCustomerReviewsController } from "./controllers/shoppingMall/customer/reviews/ShoppingmallCustomerReviewsController";
import { ShoppingmallCustomerReviewsMy_historyController } from "./controllers/shoppingMall/customer/reviews/my-history/ShoppingmallCustomerReviewsMy_historyController";
import { ShoppingmallCustomerReviewsSnapshotsController } from "./controllers/shoppingMall/customer/reviews/snapshots/ShoppingmallCustomerReviewsSnapshotsController";
import { ShoppingmallCustomerShipmentsConfirm_deliveryController } from "./controllers/shoppingMall/customer/shipments/confirm-delivery/ShoppingmallCustomerShipmentsConfirm_deliveryController";
import { ShoppingmallCustomerShipmentsItemsController } from "./controllers/shoppingMall/customer/shipments/items/ShoppingmallCustomerShipmentsItemsController";
import { ShoppingmallCustomerWishlistController } from "./controllers/shoppingMall/customer/wishlist/ShoppingmallCustomerWishlistController";
import { ShoppingmallCustomerWishlistSnapshotsController } from "./controllers/shoppingMall/customer/wishlist/snapshots/ShoppingmallCustomerWishlistSnapshotsController";
import { ShoppingmallCustomersController } from "./controllers/shoppingMall/customers/ShoppingmallCustomersController";
import { ShoppingmallGuestProductsController } from "./controllers/shoppingMall/guest/products/ShoppingmallGuestProductsController";
import { ShoppingmallGuestSessionsController } from "./controllers/shoppingMall/guest/sessions/ShoppingmallGuestSessionsController";
import { ShoppingmallGuestsController } from "./controllers/shoppingMall/guests/ShoppingmallGuestsController";
import { ShoppingmallProductsReviewsController } from "./controllers/shoppingMall/products/reviews/ShoppingmallProductsReviewsController";
import { ShoppingmallProductsReviewsStatisticsController } from "./controllers/shoppingMall/products/reviews/statistics/ShoppingmallProductsReviewsStatisticsController";
import { ShoppingmallReviewsController } from "./controllers/shoppingMall/reviews/ShoppingmallReviewsController";
import { ShoppingmallSellerCancellation_requestsDashboardController } from "./controllers/shoppingMall/seller/cancellation-requests/dashboard/ShoppingmallSellerCancellation_requestsDashboardController";
import { ShoppingmallSellerCancellationrequestsController } from "./controllers/shoppingMall/seller/cancellationRequests/ShoppingmallSellerCancellationrequestsController";
import { ShoppingmallSellerCancellationsnapshotsController } from "./controllers/shoppingMall/seller/cancellationSnapshots/ShoppingmallSellerCancellationsnapshotsController";
import { ShoppingmallSellerDashboardController } from "./controllers/shoppingMall/seller/dashboard/ShoppingmallSellerDashboardController";
import { ShoppingmallSellerDashboardOrdersController } from "./controllers/shoppingMall/seller/dashboard/orders/ShoppingmallSellerDashboardOrdersController";
import { ShoppingmallSellerOrdersItemsController } from "./controllers/shoppingMall/seller/orders/items/ShoppingmallSellerOrdersItemsController";
import { ShoppingmallSellerProductsController } from "./controllers/shoppingMall/seller/products/analytics/ShoppingmallSellerProductsController";
import { ShoppingmallSellerProductsInventoryStatusController } from "./controllers/shoppingMall/seller/products/inventory/status/ShoppingmallSellerProductsInventoryStatusController";
import { ShoppingmallSellerProfileController } from "./controllers/shoppingMall/seller/profile/ShoppingmallSellerProfileController";
import { ShoppingmallSellerRefund_requestsController } from "./controllers/shoppingMall/seller/refund-requests/ShoppingmallSellerRefund_requestsController";
import { ShoppingmallSellerRefund_requestsSnapshotsController } from "./controllers/shoppingMall/seller/refund-requests/snapshots/ShoppingmallSellerRefund_requestsSnapshotsController";
import { ShoppingmallSellerReviewsMy_productsController } from "./controllers/shoppingMall/seller/reviews/my-products/ShoppingmallSellerReviewsMy_productsController";
import { ShoppingmallSellerSeller_approval_requestsController } from "./controllers/shoppingMall/seller/seller-approval-requests/ShoppingmallSellerSeller_approval_requestsController";
import { ShoppingmallSellerSeller_approval_requestsSnapshotsController } from "./controllers/shoppingMall/seller/seller-approval-requests/snapshots/ShoppingmallSellerSeller_approval_requestsSnapshotsController";
import { ShoppingmallSellerSellerapprovalrequestsController } from "./controllers/shoppingMall/seller/sellerApprovalRequests/ShoppingmallSellerSellerapprovalrequestsController";
import { ShoppingmallSellerSellerapprovalrequestsSnapshotsController } from "./controllers/shoppingMall/seller/sellerApprovalRequests/snapshots/ShoppingmallSellerSellerapprovalrequestsSnapshotsController";
import { ShoppingmallSellerSellersMeShipmentsController } from "./controllers/shoppingMall/seller/sellers/me/shipments/ShoppingmallSellerSellersMeShipmentsController";
import { ShoppingmallSellerShipmentsController } from "./controllers/shoppingMall/seller/shipments/ShoppingmallSellerShipmentsController";
import { ShoppingmallSellerShipmentsItemsController } from "./controllers/shoppingMall/seller/shipments/items/ShoppingmallSellerShipmentsItemsController";
import { ShoppingmallSellersController } from "./controllers/shoppingMall/sellers/ShoppingmallSellersController";

@Module({
  controllers: [
    ShoppingmallAuthGuestController,
    ShoppingmallAuthCustomerController,
    ShoppingmallAuthSellerController,
    ShoppingmallAuthAdminController,
    ShoppingmallGuestsController,
    ShoppingmallGuestSessionsController,
    ShoppingmallCustomersController,
    ShoppingmallCustomerProfileController,
    ShoppingmallSellersController,
    ShoppingmallSellerSeller_approval_requestsController,
    ShoppingmallAdminSeller_approval_requestsController,
    ShoppingmallSellerSeller_approval_requestsSnapshotsController,
    ShoppingmallAdminSeller_approval_requestsSnapshotsController,
    ShoppingmallAdminAdminsController,
    ShoppingmallAdminAdmin_promotion_requestsController,
    ShoppingmallAdminAdmin_promotion_requestsSnapshotsController,
    ShoppingmallSellerProfileController,
    ShoppingmallCategoriesController,
    ShoppingmallAdminCategoriesController,
    ShoppingmallAdminAdminCategoriesController,
    ShoppingmallCustomerOrdersController,
    ShoppingmallCustomerOrdersItemsController,
    ShoppingmallCustomerWishlistController,
    ShoppingmallCustomerWishlistSnapshotsController,
    ShoppingmallCustomerCart_itemsController,
    ShoppingmallCustomerCustomersMeCart_itemsController,
    ShoppingmallCustomerCart_itemsSnapshotsController,
    ShoppingmallCustomerCustomersMeOrdersController,
    ShoppingmallSellerOrdersItemsController,
    ShoppingmallSellerShipmentsController,
    ShoppingmallSellerSellersMeShipmentsController,
    ShoppingmallCustomerShipmentsConfirm_deliveryController,
    ShoppingmallSellerShipmentsItemsController,
    ShoppingmallCustomerShipmentsItemsController,
    ShoppingmallAdminShipmentsItemsController,
    ShoppingmallReviewsController,
    ShoppingmallCustomerReviewsController,
    ShoppingmallProductsReviewsController,
    ShoppingmallCustomerReviewsSnapshotsController,
    ShoppingmallAdminReviewsSnapshotsController,
    ShoppingmallCustomerCancellationrequestsController,
    ShoppingmallSellerCancellationrequestsController,
    ShoppingmallAdminCancellationrequestsController,
    ShoppingmallCustomerCancellationsnapshotsController,
    ShoppingmallSellerCancellationsnapshotsController,
    ShoppingmallAdminCancellationsnapshotsController,
    ShoppingmallCustomerRefund_requestsController,
    ShoppingmallSellerRefund_requestsController,
    ShoppingmallAdminRefund_requestsController,
    ShoppingmallCustomerRefund_requestsSnapshotsController,
    ShoppingmallSellerRefund_requestsSnapshotsController,
    ShoppingmallAdminRefund_requestsSnapshotsController,
    ShoppingmallAdminSellerapprovalrequestsController,
    ShoppingmallSellerSellerapprovalrequestsController,
    ShoppingmallAdminSellerapprovalrequestsSnapshotsController,
    ShoppingmallSellerSellerapprovalrequestsSnapshotsController,
    ShoppingmallAdminAdminpromotionrequestsController,
    ShoppingmallAdminAdminpromotionrequestsSnapshotsController,
    ShoppingmallAdminSellersController,
    ShoppingmallAdminCustomersController,
    ShoppingmallAdminOrdersController,
    ShoppingmallAdminOrdersItemsController,
    ShoppingmallAdminCancellation_requestsController,
    ShoppingmallSellerDashboardController,
    ShoppingmallAdminSellersSnapshotsController,
    ShoppingmallGuestProductsController,
    ShoppingmallCustomerProductsController,
    ShoppingmallSellerProductsController,
    ShoppingmallSellerProductsInventoryStatusController,
    ShoppingmallCustomerCheckoutController,
    ShoppingmallSellerDashboardOrdersController,
    ShoppingmallAdminAnalyticsOrdersController,
    ShoppingmallAdminSellersAnalyticsOrdersController,
    ShoppingmallProductsReviewsStatisticsController,
    ShoppingmallCustomerReviewsMy_historyController,
    ShoppingmallSellerReviewsMy_productsController,
    ShoppingmallCustomerCancellation_requestsController,
    ShoppingmallSellerCancellation_requestsDashboardController,
    ShoppingmallAdminAnalyticsSellersController,
    ShoppingmallAdminAnalyticsCustomersController,
    ShoppingmallAdminCustomersMetricsController,
    ShoppingmallAdminSellersMetricsController,
    ShoppingmallAdminOrdersItemsForce_cancelController,
    ShoppingmallAdminOrdersItemsForce_refundController,
    ShoppingmallAdminCustomersBulk_banController,
    ShoppingmallAdminCustomersBulk_unbanController,
    ShoppingmallAdminSellersBulk_banController,
    ShoppingmallAdminSellersBulk_unbanController,
  ],
})
export class MyModule {}
