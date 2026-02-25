import { Module } from "@nestjs/common";

import { ShoppingmallAdminAdminRefund_requestsController } from "./controllers/shoppingMall/admin/admin/refund-requests/ShoppingmallAdminAdminRefund_requestsController";
import { ShoppingmallAdminConversionController } from "./controllers/shoppingMall/admin/conversion/ShoppingmallAdminConversionController";
import { ShoppingmallAdminCustomersController } from "./controllers/shoppingMall/admin/customers/ShoppingmallAdminCustomersController";
import { ShoppingmallAdminInventoryController } from "./controllers/shoppingMall/admin/inventory/adjust/ShoppingmallAdminInventoryController";
import { ShoppingmallAdminInventoryHistoryController } from "./controllers/shoppingMall/admin/inventory/history/ShoppingmallAdminInventoryHistoryController";
import { ShoppingmallAdminOrder_item_snapshotsController } from "./controllers/shoppingMall/admin/order-item-snapshots/ShoppingmallAdminOrder_item_snapshotsController";
import { ShoppingmallAdminProductsSnapshotsController } from "./controllers/shoppingMall/admin/products/snapshots/ShoppingmallAdminProductsSnapshotsController";
import { ShoppingmallAdminProductsVariantsSnapshotsController } from "./controllers/shoppingMall/admin/products/variants/snapshots/ShoppingmallAdminProductsVariantsSnapshotsController";
import { ShoppingmallAdminRefund_requestsController } from "./controllers/shoppingMall/admin/refund-requests/respond/ShoppingmallAdminRefund_requestsController";
import { ShoppingmallAdminReviews_snapshotsController } from "./controllers/shoppingMall/admin/reviews-snapshots/ShoppingmallAdminReviews_snapshotsController";
import { ShoppingmallAdminReviewsSnapshotsController } from "./controllers/shoppingMall/admin/reviews/snapshots/ShoppingmallAdminReviewsSnapshotsController";
import { ShoppingmallAdminSnapshotsController } from "./controllers/shoppingMall/admin/snapshots/ShoppingmallAdminSnapshotsController";
import { ShoppingmallAdminUsersController } from "./controllers/shoppingMall/admin/users/ShoppingmallAdminUsersController";
import { ShoppingmallAuthAdminController } from "./controllers/shoppingMall/auth/admin/ShoppingmallAuthAdminController";
import { ShoppingmallAuthCustomerController } from "./controllers/shoppingMall/auth/customer/ShoppingmallAuthCustomerController";
import { ShoppingmallAuthSellerController } from "./controllers/shoppingMall/auth/seller/ShoppingmallAuthSellerController";
import { ShoppingmallCustomerCancellation_requestsController } from "./controllers/shoppingMall/customer/cancellation-requests/ShoppingmallCustomerCancellation_requestsController";
import { ShoppingmallCustomerCancellationsSnapshotsController } from "./controllers/shoppingMall/customer/cancellations/snapshots/ShoppingmallCustomerCancellationsSnapshotsController";
import { ShoppingmallCustomerCart_itemsController } from "./controllers/shoppingMall/customer/cart-items/ShoppingmallCustomerCart_itemsController";
import { ShoppingmallCustomerCartController } from "./controllers/shoppingMall/customer/cart/ShoppingmallCustomerCartController";
import { ShoppingmallCustomerCartsController } from "./controllers/shoppingMall/customer/carts/ShoppingmallCustomerCartsController";
import { ShoppingmallCustomerCustomersMeController } from "./controllers/shoppingMall/customer/customers/me/ShoppingmallCustomerCustomersMeController";
import { ShoppingmallCustomerCustomersOrder_itemsCancel_requestController } from "./controllers/shoppingMall/customer/customers/order-items/cancel-request/ShoppingmallCustomerCustomersOrder_itemsCancel_requestController";
import { ShoppingmallCustomerDashboardController } from "./controllers/shoppingMall/customer/dashboard/ShoppingmallCustomerDashboardController";
import { ShoppingmallCustomerOrder_item_snapshotsController } from "./controllers/shoppingMall/customer/order-item-snapshots/ShoppingmallCustomerOrder_item_snapshotsController";
import { ShoppingmallCustomerOrder_itemsCancel_requestController } from "./controllers/shoppingMall/customer/order-items/cancel-request/ShoppingmallCustomerOrder_itemsCancel_requestController";
import { ShoppingmallCustomerOrdersController } from "./controllers/shoppingMall/customer/orders/ShoppingmallCustomerOrdersController";
import { ShoppingmallCustomerOrdersItemsController } from "./controllers/shoppingMall/customer/orders/items/ShoppingmallCustomerOrdersItemsController";
import { ShoppingmallCustomerOrdersShipmentsController } from "./controllers/shoppingMall/customer/orders/shipments/ShoppingmallCustomerOrdersShipmentsController";
import { ShoppingmallCustomerProductsSnapshotsController } from "./controllers/shoppingMall/customer/products/snapshots/ShoppingmallCustomerProductsSnapshotsController";
import { ShoppingmallCustomerProductsVariantsSnapshotsController } from "./controllers/shoppingMall/customer/products/variants/snapshots/ShoppingmallCustomerProductsVariantsSnapshotsController";
import { ShoppingmallCustomerRefund_requestsController } from "./controllers/shoppingMall/customer/refund-requests/ShoppingmallCustomerRefund_requestsController";
import { ShoppingmallCustomerReviewsSnapshotsController } from "./controllers/shoppingMall/customer/reviews/snapshots/ShoppingmallCustomerReviewsSnapshotsController";
import { ShoppingmallCustomerSessionsController } from "./controllers/shoppingMall/customer/sessions/ShoppingmallCustomerSessionsController";
import { ShoppingmallCustomerSnapshotsController } from "./controllers/shoppingMall/customer/snapshots/ShoppingmallCustomerSnapshotsController";
import { ShoppingmallProductsController } from "./controllers/shoppingMall/products/ShoppingmallProductsController";
import { ShoppingmallProductsImagesController } from "./controllers/shoppingMall/products/images/ShoppingmallProductsImagesController";
import { ShoppingmallProductsVariantsController } from "./controllers/shoppingMall/products/variants/ShoppingmallProductsVariantsController";
import { ShoppingmallReviewsController } from "./controllers/shoppingMall/reviews/ShoppingmallReviewsController";
import { ShoppingmallSellerDashboardsController } from "./controllers/shoppingMall/seller/dashboards/ShoppingmallSellerDashboardsController";
import { ShoppingmallSellerInventory_logsController } from "./controllers/shoppingMall/seller/inventory-logs/ShoppingmallSellerInventory_logsController";
import { ShoppingmallSellerInventoryController } from "./controllers/shoppingMall/seller/inventory/adjust/ShoppingmallSellerInventoryController";
import { ShoppingmallSellerInventoryHistoryController } from "./controllers/shoppingMall/seller/inventory/history/ShoppingmallSellerInventoryHistoryController";
import { ShoppingmallSellerOrder_item_snapshotsController } from "./controllers/shoppingMall/seller/order-item-snapshots/ShoppingmallSellerOrder_item_snapshotsController";
import { ShoppingmallSellerOrdersController } from "./controllers/shoppingMall/seller/orders/ShoppingmallSellerOrdersController";
import { ShoppingmallSellerProductsController } from "./controllers/shoppingMall/seller/products/ShoppingmallSellerProductsController";
import { ShoppingmallSellerProductsImagesController } from "./controllers/shoppingMall/seller/products/images/ShoppingmallSellerProductsImagesController";
import { ShoppingmallSellerProductsImagesReorderController } from "./controllers/shoppingMall/seller/products/images/reorder/ShoppingmallSellerProductsImagesReorderController";
import { ShoppingmallSellerProductsSnapshotsController } from "./controllers/shoppingMall/seller/products/snapshots/ShoppingmallSellerProductsSnapshotsController";
import { ShoppingmallSellerProductsVariantsController } from "./controllers/shoppingMall/seller/products/variants/ShoppingmallSellerProductsVariantsController";
import { ShoppingmallSellerProductsVariantsSnapshotsController } from "./controllers/shoppingMall/seller/products/variants/snapshots/ShoppingmallSellerProductsVariantsSnapshotsController";
import { ShoppingmallSellerRefund_requestsResponseController } from "./controllers/shoppingMall/seller/refund-requests/response/ShoppingmallSellerRefund_requestsResponseController";
import { ShoppingmallSellerReviews_snapshotsController } from "./controllers/shoppingMall/seller/reviews-snapshots/ShoppingmallSellerReviews_snapshotsController";
import { ShoppingmallSellerReviewsSnapshotsController } from "./controllers/shoppingMall/seller/reviews/snapshots/ShoppingmallSellerReviewsSnapshotsController";
import { ShoppingmallSellerShipmentsController } from "./controllers/shoppingMall/seller/shipments/ShoppingmallSellerShipmentsController";
import { ShoppingmallSellerSnapshotsController } from "./controllers/shoppingMall/seller/snapshots/ShoppingmallSellerSnapshotsController";

@Module({
  controllers: [
    ShoppingmallAuthCustomerController,
    ShoppingmallAuthSellerController,
    ShoppingmallAuthAdminController,
    ShoppingmallCustomerCustomersMeController,
    ShoppingmallCustomerSessionsController,
    ShoppingmallAdminCustomersController,
    ShoppingmallAdminUsersController,
    ShoppingmallSellerProductsController,
    ShoppingmallSellerProductsImagesController,
    ShoppingmallSellerProductsImagesReorderController,
    ShoppingmallSellerProductsVariantsController,
    ShoppingmallCustomerProductsSnapshotsController,
    ShoppingmallSellerProductsSnapshotsController,
    ShoppingmallAdminProductsSnapshotsController,
    ShoppingmallCustomerProductsVariantsSnapshotsController,
    ShoppingmallSellerProductsVariantsSnapshotsController,
    ShoppingmallAdminProductsVariantsSnapshotsController,
    ShoppingmallProductsImagesController,
    ShoppingmallProductsVariantsController,
    ShoppingmallProductsController,
    ShoppingmallSellerInventory_logsController,
    ShoppingmallCustomerCartsController,
    ShoppingmallCustomerCartController,
    ShoppingmallCustomerCart_itemsController,
    ShoppingmallSellerOrdersController,
    ShoppingmallSellerShipmentsController,
    ShoppingmallCustomerOrdersController,
    ShoppingmallCustomerOrdersItemsController,
    ShoppingmallCustomerOrdersShipmentsController,
    ShoppingmallCustomerOrder_item_snapshotsController,
    ShoppingmallSellerOrder_item_snapshotsController,
    ShoppingmallAdminOrder_item_snapshotsController,
    ShoppingmallReviewsController,
    ShoppingmallCustomerCustomersOrder_itemsCancel_requestController,
    ShoppingmallCustomerOrder_itemsCancel_requestController,
    ShoppingmallCustomerCancellation_requestsController,
    ShoppingmallCustomerCancellationsSnapshotsController,
    ShoppingmallAdminRefund_requestsController,
    ShoppingmallCustomerRefund_requestsController,
    ShoppingmallCustomerSnapshotsController,
    ShoppingmallSellerSnapshotsController,
    ShoppingmallAdminSnapshotsController,
    ShoppingmallSellerDashboardsController,
    ShoppingmallSellerInventoryHistoryController,
    ShoppingmallAdminInventoryHistoryController,
    ShoppingmallSellerInventoryController,
    ShoppingmallAdminInventoryController,
    ShoppingmallCustomerDashboardController,
    ShoppingmallAdminConversionController,
    ShoppingmallCustomerReviewsSnapshotsController,
    ShoppingmallSellerReviewsSnapshotsController,
    ShoppingmallAdminReviewsSnapshotsController,
    ShoppingmallSellerReviews_snapshotsController,
    ShoppingmallAdminReviews_snapshotsController,
    ShoppingmallSellerRefund_requestsResponseController,
    ShoppingmallAdminAdminRefund_requestsController,
  ],
})
export class MyModule {}
