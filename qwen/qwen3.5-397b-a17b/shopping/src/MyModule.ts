import { Module } from "@nestjs/common";

import { ShoppingmallAdministratorApproval_requestsController } from "./controllers/shoppingMall/administrator/approval-requests/ShoppingmallAdministratorApproval_requestsController";
import { ShoppingmallAdministratorApproval_requestsSnapshotsController } from "./controllers/shoppingMall/administrator/approval-requests/snapshots/ShoppingmallAdministratorApproval_requestsSnapshotsController";
import { ShoppingmallAdministratorCartsController } from "./controllers/shoppingMall/administrator/carts/ShoppingmallAdministratorCartsController";
import { ShoppingmallAdministratorCartsItemsController } from "./controllers/shoppingMall/administrator/carts/items/ShoppingmallAdministratorCartsItemsController";
import { ShoppingmallAdministratorCategoriesController } from "./controllers/shoppingMall/administrator/categories/ShoppingmallAdministratorCategoriesController";
import { ShoppingmallAdministratorCategoriesSnapshotsController } from "./controllers/shoppingMall/administrator/categories/snapshots/ShoppingmallAdministratorCategoriesSnapshotsController";
import { ShoppingmallAdministratorCustomersController } from "./controllers/shoppingMall/administrator/customers/ShoppingmallAdministratorCustomersController";
import { ShoppingmallAdministratorCustomersProfileController } from "./controllers/shoppingMall/administrator/customers/profile/ShoppingmallAdministratorCustomersProfileController";
import { ShoppingmallAdministratorCustomersProfileSnapshotsController } from "./controllers/shoppingMall/administrator/customers/profile/snapshots/ShoppingmallAdministratorCustomersProfileSnapshotsController";
import { ShoppingmallAdministratorCustomersProfilesController } from "./controllers/shoppingMall/administrator/customers/profiles/ShoppingmallAdministratorCustomersProfilesController";
import { ShoppingmallAdministratorCustomersProfilesSnapshotsController } from "./controllers/shoppingMall/administrator/customers/profiles/snapshots/ShoppingmallAdministratorCustomersProfilesSnapshotsController";
import { ShoppingmallAdministratorProductsController } from "./controllers/shoppingMall/administrator/products/ShoppingmallAdministratorProductsController";
import { ShoppingmallAdministratorProductsSnapshotsController } from "./controllers/shoppingMall/administrator/products/snapshots/ShoppingmallAdministratorProductsSnapshotsController";
import { ShoppingmallAdministratorProductsSnapshotsVariantsController } from "./controllers/shoppingMall/administrator/products/snapshots/variants/ShoppingmallAdministratorProductsSnapshotsVariantsController";
import { ShoppingmallAdministratorProductsVariantsSnapshotsController } from "./controllers/shoppingMall/administrator/products/variants/snapshots/ShoppingmallAdministratorProductsVariantsSnapshotsController";
import { ShoppingmallAdministratorSellersController } from "./controllers/shoppingMall/administrator/sellers/ShoppingmallAdministratorSellersController";
import { ShoppingmallAdministratorSellersProfileSnapshotsController } from "./controllers/shoppingMall/administrator/sellers/profile/snapshots/ShoppingmallAdministratorSellersProfileSnapshotsController";
import { ShoppingmallAdministratorShipment_logsController } from "./controllers/shoppingMall/administrator/shipment-logs/ShoppingmallAdministratorShipment_logsController";
import { ShoppingmallAuthAdministratorController } from "./controllers/shoppingMall/auth/administrator/ShoppingmallAuthAdministratorController";
import { ShoppingmallAuthCustomerController } from "./controllers/shoppingMall/auth/customer/ShoppingmallAuthCustomerController";
import { ShoppingmallAuthSellerController } from "./controllers/shoppingMall/auth/seller/ShoppingmallAuthSellerController";
import { ShoppingmallAuthSuperadministratorController } from "./controllers/shoppingMall/auth/superAdministrator/ShoppingmallAuthSuperadministratorController";
import { ShoppingmallCategoriesController } from "./controllers/shoppingMall/categories/ShoppingmallCategoriesController";
import { ShoppingmallCustomerAddressesController } from "./controllers/shoppingMall/customer/addresses/ShoppingmallCustomerAddressesController";
import { ShoppingmallCustomerAddressesSnapshotsController } from "./controllers/shoppingMall/customer/addresses/snapshots/ShoppingmallCustomerAddressesSnapshotsController";
import { ShoppingmallCustomerAdmin_promotion_requestsController } from "./controllers/shoppingMall/customer/admin-promotion-requests/ShoppingmallCustomerAdmin_promotion_requestsController";
import { ShoppingmallCustomerAdmin_promotion_requestsMeController } from "./controllers/shoppingMall/customer/admin-promotion-requests/me/ShoppingmallCustomerAdmin_promotion_requestsMeController";
import { ShoppingmallCustomerAdmin_promotion_requestsSnapshotsController } from "./controllers/shoppingMall/customer/admin-promotion-requests/snapshots/ShoppingmallCustomerAdmin_promotion_requestsSnapshotsController";
import { ShoppingmallCustomerCartController } from "./controllers/shoppingMall/customer/cart/ShoppingmallCustomerCartController";
import { ShoppingmallCustomerCartItemsController } from "./controllers/shoppingMall/customer/cart/items/ShoppingmallCustomerCartItemsController";
import { ShoppingmallCustomerOrder_itemsCancellation_requestsController } from "./controllers/shoppingMall/customer/order-items/cancellation-requests/ShoppingmallCustomerOrder_itemsCancellation_requestsController";
import { ShoppingmallCustomerOrder_itemsCancellation_requestsSnapshotsController } from "./controllers/shoppingMall/customer/order-items/cancellation-requests/snapshots/ShoppingmallCustomerOrder_itemsCancellation_requestsSnapshotsController";
import { ShoppingmallCustomerOrder_itemsRefund_requestsController } from "./controllers/shoppingMall/customer/order-items/refund-requests/ShoppingmallCustomerOrder_itemsRefund_requestsController";
import { ShoppingmallCustomerOrder_itemsRefund_requestsSnapshotsController } from "./controllers/shoppingMall/customer/order-items/refund-requests/snapshots/ShoppingmallCustomerOrder_itemsRefund_requestsSnapshotsController";
import { ShoppingmallCustomerOrdersController } from "./controllers/shoppingMall/customer/orders/ShoppingmallCustomerOrdersController";
import { ShoppingmallCustomerOrdersItemsController } from "./controllers/shoppingMall/customer/orders/items/ShoppingmallCustomerOrdersItemsController";
import { ShoppingmallCustomerOrdersItemsSnapshotVariant_optionsController } from "./controllers/shoppingMall/customer/orders/items/snapshot/variant-options/ShoppingmallCustomerOrdersItemsSnapshotVariant_optionsController";
import { ShoppingmallCustomerOrdersItemsSnapshotsController } from "./controllers/shoppingMall/customer/orders/items/snapshots/ShoppingmallCustomerOrdersItemsSnapshotsController";
import { ShoppingmallCustomerOrdersItemsSnapshotsVariant_optionsController } from "./controllers/shoppingMall/customer/orders/items/snapshots/variant-options/ShoppingmallCustomerOrdersItemsSnapshotsVariant_optionsController";
import { ShoppingmallCustomerProductsRatingsController } from "./controllers/shoppingMall/customer/products/ratings/ShoppingmallCustomerProductsRatingsController";
import { ShoppingmallCustomerProductsReviewsController } from "./controllers/shoppingMall/customer/products/reviews/ShoppingmallCustomerProductsReviewsController";
import { ShoppingmallCustomerProductsController } from "./controllers/shoppingMall/customer/products/search/ShoppingmallCustomerProductsController";
import { ShoppingmallCustomerProfileController } from "./controllers/shoppingMall/customer/profile/ShoppingmallCustomerProfileController";
import { ShoppingmallCustomerProfileSnapshotsController } from "./controllers/shoppingMall/customer/profile/snapshots/ShoppingmallCustomerProfileSnapshotsController";
import { ShoppingmallCustomerReviewsController } from "./controllers/shoppingMall/customer/reviews/ShoppingmallCustomerReviewsController";
import { ShoppingmallCustomerReviewsSnapshotsController } from "./controllers/shoppingMall/customer/reviews/snapshots/ShoppingmallCustomerReviewsSnapshotsController";
import { ShoppingmallCustomerSessionsController } from "./controllers/shoppingMall/customer/sessions/ShoppingmallCustomerSessionsController";
import { ShoppingmallCustomerShipmentsConfirm_deliveryController } from "./controllers/shoppingMall/customer/shipments/confirm-delivery/ShoppingmallCustomerShipmentsConfirm_deliveryController";
import { ShoppingmallCustomerWishlist_itemsController } from "./controllers/shoppingMall/customer/wishlist-items/ShoppingmallCustomerWishlist_itemsController";
import { ShoppingmallProductsController } from "./controllers/shoppingMall/products/ShoppingmallProductsController";
import { ShoppingmallReviewsController } from "./controllers/shoppingMall/reviews/ShoppingmallReviewsController";
import { ShoppingmallSellerAdmin_promotion_requestsController } from "./controllers/shoppingMall/seller/admin-promotion-requests/ShoppingmallSellerAdmin_promotion_requestsController";
import { ShoppingmallSellerAdmin_promotion_requestsMeController } from "./controllers/shoppingMall/seller/admin-promotion-requests/me/ShoppingmallSellerAdmin_promotion_requestsMeController";
import { ShoppingmallSellerAdmin_promotion_requestsSnapshotsController } from "./controllers/shoppingMall/seller/admin-promotion-requests/snapshots/ShoppingmallSellerAdmin_promotion_requestsSnapshotsController";
import { ShoppingmallSellerAnalyticsOrdersController } from "./controllers/shoppingMall/seller/analytics/orders/ShoppingmallSellerAnalyticsOrdersController";
import { ShoppingmallSellerApproval_requestsController } from "./controllers/shoppingMall/seller/approval-requests/ShoppingmallSellerApproval_requestsController";
import { ShoppingmallSellerApproval_requestsSnapshotsController } from "./controllers/shoppingMall/seller/approval-requests/snapshots/ShoppingmallSellerApproval_requestsSnapshotsController";
import { ShoppingmallSellerCancellation_requestsController } from "./controllers/shoppingMall/seller/cancellation-requests/ShoppingmallSellerCancellation_requestsController";
import { ShoppingmallSellerDashboardController } from "./controllers/shoppingMall/seller/dashboard/ShoppingmallSellerDashboardController";
import { ShoppingmallSellerDashboard_summaryController } from "./controllers/shoppingMall/seller/dashboard/summary/ShoppingmallSellerDashboard_summaryController";
import { ShoppingmallSellerInventory_recordsController } from "./controllers/shoppingMall/seller/inventory-records/ShoppingmallSellerInventory_recordsController";
import { ShoppingmallSellerInventoryHistoryController } from "./controllers/shoppingMall/seller/inventory/history/ShoppingmallSellerInventoryHistoryController";
import { ShoppingmallSellerOrder_itemsController } from "./controllers/shoppingMall/seller/order-items/ShoppingmallSellerOrder_itemsController";
import { ShoppingmallSellerOrder_itemsCancellation_requestsController } from "./controllers/shoppingMall/seller/order-items/cancellation-requests/ShoppingmallSellerOrder_itemsCancellation_requestsController";
import { ShoppingmallSellerOrder_itemsCancellation_requestsSnapshotsController } from "./controllers/shoppingMall/seller/order-items/cancellation-requests/snapshots/ShoppingmallSellerOrder_itemsCancellation_requestsSnapshotsController";
import { ShoppingmallSellerOrder_itemsRefund_requestsController } from "./controllers/shoppingMall/seller/order-items/refund-requests/ShoppingmallSellerOrder_itemsRefund_requestsController";
import { ShoppingmallSellerOrder_itemsRefund_requestsSnapshotsController } from "./controllers/shoppingMall/seller/order-items/refund-requests/snapshots/ShoppingmallSellerOrder_itemsRefund_requestsSnapshotsController";
import { ShoppingmallSellerOrdersItemsController } from "./controllers/shoppingMall/seller/orders/items/ShoppingmallSellerOrdersItemsController";
import { ShoppingmallSellerOrdersItemsSnapshotsController } from "./controllers/shoppingMall/seller/orders/items/snapshots/ShoppingmallSellerOrdersItemsSnapshotsController";
import { ShoppingmallSellerOrdersItemsSnapshotsVariant_optionsController } from "./controllers/shoppingMall/seller/orders/items/snapshots/variant-options/ShoppingmallSellerOrdersItemsSnapshotsVariant_optionsController";
import { ShoppingmallSellerProductsController } from "./controllers/shoppingMall/seller/products/ShoppingmallSellerProductsController";
import { ShoppingmallSellerProductsImagesController } from "./controllers/shoppingMall/seller/products/images/ShoppingmallSellerProductsImagesController";
import { ShoppingmallSellerProductsInventoryLow_stockController } from "./controllers/shoppingMall/seller/products/inventory/low-stock/ShoppingmallSellerProductsInventoryLow_stockController";
import { ShoppingmallSellerProductsOption_definitionsController } from "./controllers/shoppingMall/seller/products/option-definitions/ShoppingmallSellerProductsOption_definitionsController";
import { ShoppingmallSellerProductsOption_definitionsOption_valuesController } from "./controllers/shoppingMall/seller/products/option-definitions/option-values/ShoppingmallSellerProductsOption_definitionsOption_valuesController";
import { ShoppingmallSellerProductsSnapshotsController } from "./controllers/shoppingMall/seller/products/snapshots/ShoppingmallSellerProductsSnapshotsController";
import { ShoppingmallSellerProductsSnapshotsVariantsController } from "./controllers/shoppingMall/seller/products/snapshots/variants/ShoppingmallSellerProductsSnapshotsVariantsController";
import { ShoppingmallSellerProductsVariantsController } from "./controllers/shoppingMall/seller/products/variants/ShoppingmallSellerProductsVariantsController";
import { ShoppingmallSellerProductsVariantsInventoryController } from "./controllers/shoppingMall/seller/products/variants/inventory/ShoppingmallSellerProductsVariantsInventoryController";
import { ShoppingmallSellerProductsVariantsSnapshotsController } from "./controllers/shoppingMall/seller/products/variants/snapshots/ShoppingmallSellerProductsVariantsSnapshotsController";
import { ShoppingmallSellerProductsVariantsStockController } from "./controllers/shoppingMall/seller/products/variants/stock/ShoppingmallSellerProductsVariantsStockController";
import { ShoppingmallSellerRefund_requestsController } from "./controllers/shoppingMall/seller/refund-requests/ShoppingmallSellerRefund_requestsController";
import { ShoppingmallSellerShipment_logsController } from "./controllers/shoppingMall/seller/shipment-logs/ShoppingmallSellerShipment_logsController";
import { ShoppingmallSellerShipmentsController } from "./controllers/shoppingMall/seller/shipments/ShoppingmallSellerShipmentsController";
import { ShoppingmallSellersProfileController } from "./controllers/shoppingMall/sellers/profile/ShoppingmallSellersProfileController";
import { ShoppingmallSuperadministratorAdmin_promotion_requestsController } from "./controllers/shoppingMall/superAdministrator/admin-promotion-requests/ShoppingmallSuperadministratorAdmin_promotion_requestsController";
import { ShoppingmallSuperadministratorAdmin_promotion_requestsSnapshotsController } from "./controllers/shoppingMall/superAdministrator/admin-promotion-requests/snapshots/ShoppingmallSuperadministratorAdmin_promotion_requestsSnapshotsController";
import { ShoppingmallSuperadministratorAdministrator_grade_changesController } from "./controllers/shoppingMall/superAdministrator/administrator-grade-changes/ShoppingmallSuperadministratorAdministrator_grade_changesController";
import { ShoppingmallSuperadministratorAdministratorsController } from "./controllers/shoppingMall/superAdministrator/administrators/ShoppingmallSuperadministratorAdministratorsController";
import { ShoppingmallSuperadministratorCustomersController } from "./controllers/shoppingMall/superAdministrator/customers/ShoppingmallSuperadministratorCustomersController";
import { ShoppingmallSuperadministratorSellersController } from "./controllers/shoppingMall/superAdministrator/sellers/ShoppingmallSuperadministratorSellersController";
import { ShoppingmallSuperadministratorSuper_administratorsController } from "./controllers/shoppingMall/superAdministrator/super-administrators/ShoppingmallSuperadministratorSuper_administratorsController";

@Module({
  controllers: [
    ShoppingmallAuthCustomerController,
    ShoppingmallAuthSellerController,
    ShoppingmallAuthAdministratorController,
    ShoppingmallAuthSuperadministratorController,
    ShoppingmallAdministratorCustomersController,
    ShoppingmallSuperadministratorCustomersController,
    ShoppingmallCustomerProfileController,
    ShoppingmallAdministratorSellersController,
    ShoppingmallSuperadministratorSellersController,
    ShoppingmallSuperadministratorAdministratorsController,
    ShoppingmallSuperadministratorSuper_administratorsController,
    ShoppingmallCustomerSessionsController,
    ShoppingmallAdministratorCustomersProfilesController,
    ShoppingmallAdministratorCustomersProfileController,
    ShoppingmallCustomerProfileSnapshotsController,
    ShoppingmallAdministratorCustomersProfilesSnapshotsController,
    ShoppingmallAdministratorCustomersProfileSnapshotsController,
    ShoppingmallSellersProfileController,
    ShoppingmallAdministratorSellersProfileSnapshotsController,
    ShoppingmallCustomerAddressesController,
    ShoppingmallCustomerAddressesSnapshotsController,
    ShoppingmallCategoriesController,
    ShoppingmallAdministratorCategoriesController,
    ShoppingmallAdministratorCategoriesSnapshotsController,
    ShoppingmallProductsController,
    ShoppingmallSellerProductsController,
    ShoppingmallAdministratorProductsController,
    ShoppingmallSellerProductsVariantsController,
    ShoppingmallSellerProductsOption_definitionsController,
    ShoppingmallSellerProductsOption_definitionsOption_valuesController,
    ShoppingmallSellerProductsImagesController,
    ShoppingmallSellerProductsSnapshotsController,
    ShoppingmallAdministratorProductsSnapshotsController,
    ShoppingmallSellerProductsSnapshotsVariantsController,
    ShoppingmallAdministratorProductsSnapshotsVariantsController,
    ShoppingmallSellerProductsVariantsSnapshotsController,
    ShoppingmallAdministratorProductsVariantsSnapshotsController,
    ShoppingmallSellerProductsVariantsInventoryController,
    ShoppingmallSellerInventory_recordsController,
    ShoppingmallCustomerWishlist_itemsController,
    ShoppingmallCustomerCartController,
    ShoppingmallAdministratorCartsController,
    ShoppingmallCustomerCartItemsController,
    ShoppingmallAdministratorCartsItemsController,
    ShoppingmallCustomerOrdersController,
    ShoppingmallCustomerOrdersItemsController,
    ShoppingmallSellerOrdersItemsController,
    ShoppingmallCustomerOrdersItemsSnapshotsController,
    ShoppingmallSellerOrdersItemsSnapshotsController,
    ShoppingmallCustomerOrdersItemsSnapshotsVariant_optionsController,
    ShoppingmallCustomerOrdersItemsSnapshotVariant_optionsController,
    ShoppingmallSellerOrdersItemsSnapshotsVariant_optionsController,
    ShoppingmallSellerShipmentsController,
    ShoppingmallCustomerShipmentsConfirm_deliveryController,
    ShoppingmallAdministratorShipment_logsController,
    ShoppingmallSellerShipment_logsController,
    ShoppingmallReviewsController,
    ShoppingmallCustomerReviewsController,
    ShoppingmallCustomerReviewsSnapshotsController,
    ShoppingmallCustomerOrder_itemsCancellation_requestsController,
    ShoppingmallSellerOrder_itemsCancellation_requestsController,
    ShoppingmallCustomerOrder_itemsCancellation_requestsSnapshotsController,
    ShoppingmallSellerOrder_itemsCancellation_requestsSnapshotsController,
    ShoppingmallCustomerOrder_itemsRefund_requestsController,
    ShoppingmallSellerOrder_itemsRefund_requestsController,
    ShoppingmallCustomerOrder_itemsRefund_requestsSnapshotsController,
    ShoppingmallSellerOrder_itemsRefund_requestsSnapshotsController,
    ShoppingmallSellerApproval_requestsController,
    ShoppingmallAdministratorApproval_requestsController,
    ShoppingmallSellerApproval_requestsSnapshotsController,
    ShoppingmallAdministratorApproval_requestsSnapshotsController,
    ShoppingmallCustomerAdmin_promotion_requestsController,
    ShoppingmallSellerAdmin_promotion_requestsController,
    ShoppingmallSuperadministratorAdmin_promotion_requestsController,
    ShoppingmallCustomerAdmin_promotion_requestsSnapshotsController,
    ShoppingmallSellerAdmin_promotion_requestsSnapshotsController,
    ShoppingmallSuperadministratorAdmin_promotion_requestsSnapshotsController,
    ShoppingmallSuperadministratorAdministrator_grade_changesController,
    ShoppingmallSellerOrder_itemsController,
    ShoppingmallSellerCancellation_requestsController,
    ShoppingmallSellerRefund_requestsController,
    ShoppingmallSellerDashboardController,
    ShoppingmallCustomerProductsController,
    ShoppingmallSellerProductsInventoryLow_stockController,
    ShoppingmallSellerProductsVariantsStockController,
    ShoppingmallCustomerProductsReviewsController,
    ShoppingmallCustomerProductsRatingsController,
    ShoppingmallSellerDashboard_summaryController,
    ShoppingmallCustomerAdmin_promotion_requestsMeController,
    ShoppingmallSellerAdmin_promotion_requestsMeController,
    ShoppingmallSellerAnalyticsOrdersController,
    ShoppingmallSellerInventoryHistoryController,
  ],
})
export class MyModule {}
