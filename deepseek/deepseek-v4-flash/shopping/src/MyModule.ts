import { Module } from "@nestjs/common";

import { EcommercemallAdministratorAdministratorsController } from "./controllers/eCommerceMall/administrator/administrators/EcommercemallAdministratorAdministratorsController";
import { EcommercemallAdministratorApproval_requestsController } from "./controllers/eCommerceMall/administrator/approval-requests/EcommercemallAdministratorApproval_requestsController";
import { EcommercemallAdministratorAudit_logsController } from "./controllers/eCommerceMall/administrator/audit-logs/EcommercemallAdministratorAudit_logsController";
import { EcommercemallAdministratorCancellation_requestsController } from "./controllers/eCommerceMall/administrator/cancellation-requests/EcommercemallAdministratorCancellation_requestsController";
import { EcommercemallAdministratorCancellation_requestsSnapshotsController } from "./controllers/eCommerceMall/administrator/cancellation-requests/snapshots/EcommercemallAdministratorCancellation_requestsSnapshotsController";
import { EcommercemallAdministratorCategoriesController } from "./controllers/eCommerceMall/administrator/categories/EcommercemallAdministratorCategoriesController";
import { EcommercemallAdministratorCategoriesHierarchyController } from "./controllers/eCommerceMall/administrator/categories/hierarchy/EcommercemallAdministratorCategoriesHierarchyController";
import { EcommercemallAdministratorCustomersController } from "./controllers/eCommerceMall/administrator/customers/EcommercemallAdministratorCustomersController";
import { EcommercemallAdministratorCustomersAddressesController } from "./controllers/eCommerceMall/administrator/customers/addresses/EcommercemallAdministratorCustomersAddressesController";
import { EcommercemallAdministratorGradechangelogsController } from "./controllers/eCommerceMall/administrator/gradeChangeLogs/EcommercemallAdministratorGradechangelogsController";
import { EcommercemallAdministratorOrder_itemsForce_cancelController } from "./controllers/eCommerceMall/administrator/order-items/force-cancel/EcommercemallAdministratorOrder_itemsForce_cancelController";
import { EcommercemallAdministratorOrder_itemsForce_refundController } from "./controllers/eCommerceMall/administrator/order-items/force-refund/EcommercemallAdministratorOrder_itemsForce_refundController";
import { EcommercemallAdministratorOrder_itemsProduct_snapshotController } from "./controllers/eCommerceMall/administrator/order-items/product-snapshot/EcommercemallAdministratorOrder_itemsProduct_snapshotController";
import { EcommercemallAdministratorOrder_itemsSeller_snapshotController } from "./controllers/eCommerceMall/administrator/order-items/seller-snapshot/EcommercemallAdministratorOrder_itemsSeller_snapshotController";
import { EcommercemallAdministratorOrder_itemsStatus_logsController } from "./controllers/eCommerceMall/administrator/order-items/status-logs/EcommercemallAdministratorOrder_itemsStatus_logsController";
import { EcommercemallAdministratorOrderitemsStatuslogsController } from "./controllers/eCommerceMall/administrator/orderItems/statusLogs/EcommercemallAdministratorOrderitemsStatuslogsController";
import { EcommercemallAdministratorOrdersForce_cancelController } from "./controllers/eCommerceMall/administrator/orders/force-cancel/EcommercemallAdministratorOrdersForce_cancelController";
import { EcommercemallAdministratorOrdersForce_refundController } from "./controllers/eCommerceMall/administrator/orders/force-refund/EcommercemallAdministratorOrdersForce_refundController";
import { EcommercemallAdministratorProductsController } from "./controllers/eCommerceMall/administrator/products/EcommercemallAdministratorProductsController";
import { EcommercemallAdministratorProductsImagesController } from "./controllers/eCommerceMall/administrator/products/images/EcommercemallAdministratorProductsImagesController";
import { EcommercemallAdministratorProductsRatingsController } from "./controllers/eCommerceMall/administrator/products/ratings/EcommercemallAdministratorProductsRatingsController";
import { EcommercemallAdministratorProductsSnapshotsController } from "./controllers/eCommerceMall/administrator/products/snapshots/EcommercemallAdministratorProductsSnapshotsController";
import { EcommercemallAdministratorProductsVariantsController } from "./controllers/eCommerceMall/administrator/products/variants/EcommercemallAdministratorProductsVariantsController";
import { EcommercemallAdministratorProductsVariantsInventoryController } from "./controllers/eCommerceMall/administrator/products/variants/inventory/EcommercemallAdministratorProductsVariantsInventoryController";
import { EcommercemallAdministratorRefund_requestsController } from "./controllers/eCommerceMall/administrator/refund-requests/EcommercemallAdministratorRefund_requestsController";
import { EcommercemallAdministratorRefund_requestsSnapshotsController } from "./controllers/eCommerceMall/administrator/refund-requests/snapshots/EcommercemallAdministratorRefund_requestsSnapshotsController";
import { EcommercemallAdministratorReviewsController } from "./controllers/eCommerceMall/administrator/reviews/EcommercemallAdministratorReviewsController";
import { EcommercemallAdministratorReviewsSnapshotsController } from "./controllers/eCommerceMall/administrator/reviews/snapshots/EcommercemallAdministratorReviewsSnapshotsController";
import { EcommercemallAdministratorSellersController } from "./controllers/eCommerceMall/administrator/sellers/EcommercemallAdministratorSellersController";
import { EcommercemallAdministratorSellersBanController } from "./controllers/eCommerceMall/administrator/sellers/ban/EcommercemallAdministratorSellersBanController";
import { EcommercemallAdministratorSellersProfileController } from "./controllers/eCommerceMall/administrator/sellers/profile/EcommercemallAdministratorSellersProfileController";
import { EcommercemallAdministratorSellersProfileSnapshotsController } from "./controllers/eCommerceMall/administrator/sellers/profile/snapshots/EcommercemallAdministratorSellersProfileSnapshotsController";
import { EcommercemallAdministratorSellersSuspension_logsController } from "./controllers/eCommerceMall/administrator/sellers/suspension-logs/EcommercemallAdministratorSellersSuspension_logsController";
import { EcommercemallAdministratorShipmentsController } from "./controllers/eCommerceMall/administrator/shipments/EcommercemallAdministratorShipmentsController";
import { EcommercemallAdministratorShipmentsItemsController } from "./controllers/eCommerceMall/administrator/shipments/items/EcommercemallAdministratorShipmentsItemsController";
import { EcommercemallAuthAdministratorController } from "./controllers/eCommerceMall/auth/administrator/EcommercemallAuthAdministratorController";
import { EcommercemallAuthCustomerController } from "./controllers/eCommerceMall/auth/customer/EcommercemallAuthCustomerController";
import { EcommercemallAuthGuestController } from "./controllers/eCommerceMall/auth/guest/EcommercemallAuthGuestController";
import { EcommercemallAuthSellerController } from "./controllers/eCommerceMall/auth/seller/EcommercemallAuthSellerController";
import { EcommercemallAuthSuperadministratorController } from "./controllers/eCommerceMall/auth/superAdministrator/EcommercemallAuthSuperadministratorController";
import { EcommercemallCustomerAddressesController } from "./controllers/eCommerceMall/customer/addresses/EcommercemallCustomerAddressesController";
import { EcommercemallCustomerAdmin_registration_requestsController } from "./controllers/eCommerceMall/customer/admin-registration-requests/EcommercemallCustomerAdmin_registration_requestsController";
import { EcommercemallCustomerCancellation_requestsController } from "./controllers/eCommerceMall/customer/cancellation-requests/EcommercemallCustomerCancellation_requestsController";
import { EcommercemallCustomerCancellation_requestsSnapshotsController } from "./controllers/eCommerceMall/customer/cancellation-requests/snapshots/EcommercemallCustomerCancellation_requestsSnapshotsController";
import { EcommercemallCustomerCart_itemsController } from "./controllers/eCommerceMall/customer/cart-items/EcommercemallCustomerCart_itemsController";
import { EcommercemallCustomerCartController } from "./controllers/eCommerceMall/customer/cart/overview/EcommercemallCustomerCartController";
import { EcommercemallCustomerCategoriesController } from "./controllers/eCommerceMall/customer/categories/EcommercemallCustomerCategoriesController";
import { EcommercemallCustomerCategoriesHierarchyController } from "./controllers/eCommerceMall/customer/categories/hierarchy/EcommercemallCustomerCategoriesHierarchyController";
import { EcommercemallCustomerOrder_itemsProduct_snapshotController } from "./controllers/eCommerceMall/customer/order-items/product-snapshot/EcommercemallCustomerOrder_itemsProduct_snapshotController";
import { EcommercemallCustomerOrder_itemsSeller_snapshotController } from "./controllers/eCommerceMall/customer/order-items/seller-snapshot/EcommercemallCustomerOrder_itemsSeller_snapshotController";
import { EcommercemallCustomerOrder_itemsStatus_logsController } from "./controllers/eCommerceMall/customer/order-items/status-logs/EcommercemallCustomerOrder_itemsStatus_logsController";
import { EcommercemallCustomerOrderitemsStatuslogsController } from "./controllers/eCommerceMall/customer/orderItems/statusLogs/EcommercemallCustomerOrderitemsStatuslogsController";
import { EcommercemallCustomerOrdersController } from "./controllers/eCommerceMall/customer/orders/EcommercemallCustomerOrdersController";
import { EcommercemallCustomerOrdersCancellable_itemsController } from "./controllers/eCommerceMall/customer/orders/cancellable-items/EcommercemallCustomerOrdersCancellable_itemsController";
import { EcommercemallCustomerOrdersItemsController } from "./controllers/eCommerceMall/customer/orders/items/EcommercemallCustomerOrdersItemsController";
import { EcommercemallCustomerProductsController } from "./controllers/eCommerceMall/customer/products/EcommercemallCustomerProductsController";
import { EcommercemallCustomerProductsRatingsController } from "./controllers/eCommerceMall/customer/products/ratings/EcommercemallCustomerProductsRatingsController";
import { EcommercemallCustomerProductsVariantsController } from "./controllers/eCommerceMall/customer/products/variants/EcommercemallCustomerProductsVariantsController";
import { EcommercemallCustomerProfileController } from "./controllers/eCommerceMall/customer/profile/EcommercemallCustomerProfileController";
import { EcommercemallCustomerRefund_requestsController } from "./controllers/eCommerceMall/customer/refund-requests/EcommercemallCustomerRefund_requestsController";
import { EcommercemallCustomerRefund_requestsSnapshotsController } from "./controllers/eCommerceMall/customer/refund-requests/snapshots/EcommercemallCustomerRefund_requestsSnapshotsController";
import { EcommercemallCustomerReviewsController } from "./controllers/eCommerceMall/customer/reviews/EcommercemallCustomerReviewsController";
import { EcommercemallCustomerReviewsSnapshotsController } from "./controllers/eCommerceMall/customer/reviews/snapshots/EcommercemallCustomerReviewsSnapshotsController";
import { EcommercemallCustomerSearchProductsController } from "./controllers/eCommerceMall/customer/search/products/EcommercemallCustomerSearchProductsController";
import { EcommercemallCustomerSellersController } from "./controllers/eCommerceMall/customer/sellers/EcommercemallCustomerSellersController";
import { EcommercemallCustomerSessionsController } from "./controllers/eCommerceMall/customer/sessions/EcommercemallCustomerSessionsController";
import { EcommercemallCustomerShipmentsController } from "./controllers/eCommerceMall/customer/shipments/EcommercemallCustomerShipmentsController";
import { EcommercemallCustomerShipmentsConfirm_deliveryController } from "./controllers/eCommerceMall/customer/shipments/confirm-delivery/EcommercemallCustomerShipmentsConfirm_deliveryController";
import { EcommercemallCustomerShipmentsItemsController } from "./controllers/eCommerceMall/customer/shipments/items/EcommercemallCustomerShipmentsItemsController";
import { EcommercemallCustomerWishlist_itemsController } from "./controllers/eCommerceMall/customer/wishlist-items/EcommercemallCustomerWishlist_itemsController";
import { EcommercemallSellerAdmin_registration_requestsController } from "./controllers/eCommerceMall/seller/admin-registration-requests/EcommercemallSellerAdmin_registration_requestsController";
import { EcommercemallSellerApproval_requestsController } from "./controllers/eCommerceMall/seller/approval-requests/EcommercemallSellerApproval_requestsController";
import { EcommercemallSellerCancellation_requestsController } from "./controllers/eCommerceMall/seller/cancellation-requests/EcommercemallSellerCancellation_requestsController";
import { EcommercemallSellerCancellation_requestsSnapshotsController } from "./controllers/eCommerceMall/seller/cancellation-requests/snapshots/EcommercemallSellerCancellation_requestsSnapshotsController";
import { EcommercemallSellerCategoriesController } from "./controllers/eCommerceMall/seller/categories/EcommercemallSellerCategoriesController";
import { EcommercemallSellerDashboardController } from "./controllers/eCommerceMall/seller/dashboard/EcommercemallSellerDashboardController";
import { EcommercemallSellerOrder_itemsController } from "./controllers/eCommerceMall/seller/order-items/EcommercemallSellerOrder_itemsController";
import { EcommercemallSellerOrder_itemsProduct_snapshotController } from "./controllers/eCommerceMall/seller/order-items/product-snapshot/EcommercemallSellerOrder_itemsProduct_snapshotController";
import { EcommercemallSellerOrder_itemsSeller_snapshotController } from "./controllers/eCommerceMall/seller/order-items/seller-snapshot/EcommercemallSellerOrder_itemsSeller_snapshotController";
import { EcommercemallSellerOrder_itemsStatus_logsController } from "./controllers/eCommerceMall/seller/order-items/status-logs/EcommercemallSellerOrder_itemsStatus_logsController";
import { EcommercemallSellerOrderitemsStatuslogsController } from "./controllers/eCommerceMall/seller/orderItems/statusLogs/EcommercemallSellerOrderitemsStatuslogsController";
import { EcommercemallSellerProductsController } from "./controllers/eCommerceMall/seller/products/EcommercemallSellerProductsController";
import { EcommercemallSellerProductsImagesController } from "./controllers/eCommerceMall/seller/products/images/EcommercemallSellerProductsImagesController";
import { EcommercemallSellerProductsRatingsController } from "./controllers/eCommerceMall/seller/products/ratings/EcommercemallSellerProductsRatingsController";
import { EcommercemallSellerProductsSnapshotsController } from "./controllers/eCommerceMall/seller/products/snapshots/EcommercemallSellerProductsSnapshotsController";
import { EcommercemallSellerProductsVariantsController } from "./controllers/eCommerceMall/seller/products/variants/EcommercemallSellerProductsVariantsController";
import { EcommercemallSellerProductsVariantsInventoryController } from "./controllers/eCommerceMall/seller/products/variants/inventory/EcommercemallSellerProductsVariantsInventoryController";
import { EcommercemallSellerProfileSnapshotsController } from "./controllers/eCommerceMall/seller/profile/snapshots/EcommercemallSellerProfileSnapshotsController";
import { EcommercemallSellerRefund_requestsController } from "./controllers/eCommerceMall/seller/refund-requests/EcommercemallSellerRefund_requestsController";
import { EcommercemallSellerRefund_requestsSnapshotsController } from "./controllers/eCommerceMall/seller/refund-requests/snapshots/EcommercemallSellerRefund_requestsSnapshotsController";
import { EcommercemallSellerShipmentsController } from "./controllers/eCommerceMall/seller/shipments/EcommercemallSellerShipmentsController";
import { EcommercemallSellerShipmentsItemsController } from "./controllers/eCommerceMall/seller/shipments/items/EcommercemallSellerShipmentsItemsController";
import { EcommercemallSuperadministratorAdmin_registration_requestsController } from "./controllers/eCommerceMall/superAdministrator/admin-registration-requests/EcommercemallSuperadministratorAdmin_registration_requestsController";
import { EcommercemallSuperadministratorAdministratorsController } from "./controllers/eCommerceMall/superAdministrator/administrators/EcommercemallSuperadministratorAdministratorsController";
import { EcommercemallSuperadministratorAdministratorsAudit_logsController } from "./controllers/eCommerceMall/superAdministrator/administrators/audit-logs/EcommercemallSuperadministratorAdministratorsAudit_logsController";
import { EcommercemallSuperadministratorAdministratorsGrade_change_logsController } from "./controllers/eCommerceMall/superAdministrator/administrators/grade-change-logs/EcommercemallSuperadministratorAdministratorsGrade_change_logsController";
import { EcommercemallSuperadministratorApproval_requestsController } from "./controllers/eCommerceMall/superAdministrator/approval-requests/EcommercemallSuperadministratorApproval_requestsController";
import { EcommercemallSuperadministratorCategoriesController } from "./controllers/eCommerceMall/superAdministrator/categories/EcommercemallSuperadministratorCategoriesController";
import { EcommercemallSuperadministratorCategoriesHierarchyController } from "./controllers/eCommerceMall/superAdministrator/categories/hierarchy/EcommercemallSuperadministratorCategoriesHierarchyController";
import { EcommercemallSuperadministratorCustomersController } from "./controllers/eCommerceMall/superAdministrator/customers/EcommercemallSuperadministratorCustomersController";
import { EcommercemallSuperadministratorCustomersAddressesController } from "./controllers/eCommerceMall/superAdministrator/customers/addresses/EcommercemallSuperadministratorCustomersAddressesController";
import { EcommercemallSuperadministratorOrder_itemsForce_cancelController } from "./controllers/eCommerceMall/superAdministrator/order-items/force-cancel/EcommercemallSuperadministratorOrder_itemsForce_cancelController";
import { EcommercemallSuperadministratorOrder_itemsForce_refundController } from "./controllers/eCommerceMall/superAdministrator/order-items/force-refund/EcommercemallSuperadministratorOrder_itemsForce_refundController";
import { EcommercemallSuperadministratorOrdersForce_cancelController } from "./controllers/eCommerceMall/superAdministrator/orders/force-cancel/EcommercemallSuperadministratorOrdersForce_cancelController";
import { EcommercemallSuperadministratorOrdersForce_refundController } from "./controllers/eCommerceMall/superAdministrator/orders/force-refund/EcommercemallSuperadministratorOrdersForce_refundController";
import { EcommercemallSuperadministratorReviewsController } from "./controllers/eCommerceMall/superAdministrator/reviews/EcommercemallSuperadministratorReviewsController";
import { EcommercemallSuperadministratorReviewsSnapshotsController } from "./controllers/eCommerceMall/superAdministrator/reviews/snapshots/EcommercemallSuperadministratorReviewsSnapshotsController";
import { EcommercemallSuperadministratorSellersController } from "./controllers/eCommerceMall/superAdministrator/sellers/EcommercemallSuperadministratorSellersController";
import { EcommercemallSuperadministratorSellersBanController } from "./controllers/eCommerceMall/superAdministrator/sellers/ban/EcommercemallSuperadministratorSellersBanController";
import { EcommercemallSuperadministratorSellersProfileController } from "./controllers/eCommerceMall/superAdministrator/sellers/profile/EcommercemallSuperadministratorSellersProfileController";
import { EcommercemallSuperadministratorSellersProfileSnapshotsController } from "./controllers/eCommerceMall/superAdministrator/sellers/profile/snapshots/EcommercemallSuperadministratorSellersProfileSnapshotsController";
import { EcommercemallSuperadministratorSellersSuspension_logsController } from "./controllers/eCommerceMall/superAdministrator/sellers/suspension-logs/EcommercemallSuperadministratorSellersSuspension_logsController";
import { EcommercemallSuperadministratorSuper_administratorsController } from "./controllers/eCommerceMall/superAdministrator/super-administrators/EcommercemallSuperadministratorSuper_administratorsController";

@Module({
  controllers: [
    EcommercemallAuthGuestController,
    EcommercemallAuthCustomerController,
    EcommercemallAuthSellerController,
    EcommercemallAuthAdministratorController,
    EcommercemallAuthSuperadministratorController,
    EcommercemallCustomerSessionsController,
    EcommercemallAdministratorCustomersController,
    EcommercemallSuperadministratorCustomersController,
    EcommercemallCustomerProfileController,
    EcommercemallCustomerAddressesController,
    EcommercemallAdministratorCustomersAddressesController,
    EcommercemallSuperadministratorCustomersAddressesController,
    EcommercemallAdministratorSellersController,
    EcommercemallSuperadministratorSellersController,
    EcommercemallCustomerSellersController,
    EcommercemallAdministratorSellersProfileController,
    EcommercemallSuperadministratorSellersProfileController,
    EcommercemallSellerProfileSnapshotsController,
    EcommercemallAdministratorSellersProfileSnapshotsController,
    EcommercemallSuperadministratorSellersProfileSnapshotsController,
    EcommercemallSellerApproval_requestsController,
    EcommercemallAdministratorApproval_requestsController,
    EcommercemallSuperadministratorApproval_requestsController,
    EcommercemallAdministratorSellersSuspension_logsController,
    EcommercemallSuperadministratorSellersSuspension_logsController,
    EcommercemallSuperadministratorAdministratorsController,
    EcommercemallAdministratorAdministratorsController,
    EcommercemallSuperadministratorSuper_administratorsController,
    EcommercemallCustomerAdmin_registration_requestsController,
    EcommercemallSellerAdmin_registration_requestsController,
    EcommercemallSuperadministratorAdmin_registration_requestsController,
    EcommercemallAdministratorGradechangelogsController,
    EcommercemallSuperadministratorAdministratorsGrade_change_logsController,
    EcommercemallAdministratorAudit_logsController,
    EcommercemallSuperadministratorAdministratorsAudit_logsController,
    EcommercemallCustomerCategoriesController,
    EcommercemallSellerCategoriesController,
    EcommercemallAdministratorCategoriesController,
    EcommercemallSuperadministratorCategoriesController,
    EcommercemallCustomerProductsController,
    EcommercemallSellerProductsController,
    EcommercemallAdministratorProductsController,
    EcommercemallSellerProductsImagesController,
    EcommercemallAdministratorProductsImagesController,
    EcommercemallSellerProductsVariantsController,
    EcommercemallAdministratorProductsVariantsController,
    EcommercemallCustomerProductsVariantsController,
    EcommercemallSellerProductsVariantsInventoryController,
    EcommercemallAdministratorProductsVariantsInventoryController,
    EcommercemallSellerProductsSnapshotsController,
    EcommercemallAdministratorProductsSnapshotsController,
    EcommercemallCustomerWishlist_itemsController,
    EcommercemallCustomerCart_itemsController,
    EcommercemallCustomerOrdersController,
    EcommercemallCustomerOrdersItemsController,
    EcommercemallSellerOrder_itemsController,
    EcommercemallCustomerOrder_itemsProduct_snapshotController,
    EcommercemallSellerOrder_itemsProduct_snapshotController,
    EcommercemallAdministratorOrder_itemsProduct_snapshotController,
    EcommercemallCustomerOrder_itemsSeller_snapshotController,
    EcommercemallSellerOrder_itemsSeller_snapshotController,
    EcommercemallAdministratorOrder_itemsSeller_snapshotController,
    EcommercemallCustomerOrderitemsStatuslogsController,
    EcommercemallSellerOrderitemsStatuslogsController,
    EcommercemallAdministratorOrderitemsStatuslogsController,
    EcommercemallCustomerOrder_itemsStatus_logsController,
    EcommercemallSellerOrder_itemsStatus_logsController,
    EcommercemallAdministratorOrder_itemsStatus_logsController,
    EcommercemallSellerShipmentsController,
    EcommercemallCustomerShipmentsController,
    EcommercemallAdministratorShipmentsController,
    EcommercemallCustomerShipmentsItemsController,
    EcommercemallSellerShipmentsItemsController,
    EcommercemallAdministratorShipmentsItemsController,
    EcommercemallCustomerCancellation_requestsController,
    EcommercemallSellerCancellation_requestsController,
    EcommercemallAdministratorCancellation_requestsController,
    EcommercemallCustomerCancellation_requestsSnapshotsController,
    EcommercemallSellerCancellation_requestsSnapshotsController,
    EcommercemallAdministratorCancellation_requestsSnapshotsController,
    EcommercemallCustomerRefund_requestsController,
    EcommercemallSellerRefund_requestsController,
    EcommercemallAdministratorRefund_requestsController,
    EcommercemallCustomerRefund_requestsSnapshotsController,
    EcommercemallSellerRefund_requestsSnapshotsController,
    EcommercemallAdministratorRefund_requestsSnapshotsController,
    EcommercemallCustomerReviewsController,
    EcommercemallAdministratorReviewsController,
    EcommercemallSuperadministratorReviewsController,
    EcommercemallCustomerReviewsSnapshotsController,
    EcommercemallAdministratorReviewsSnapshotsController,
    EcommercemallSuperadministratorReviewsSnapshotsController,
    EcommercemallSellerDashboardController,
    EcommercemallAdministratorSellersBanController,
    EcommercemallSuperadministratorSellersBanController,
    EcommercemallCustomerCategoriesHierarchyController,
    EcommercemallAdministratorCategoriesHierarchyController,
    EcommercemallSuperadministratorCategoriesHierarchyController,
    EcommercemallCustomerSearchProductsController,
    EcommercemallCustomerCartController,
    EcommercemallCustomerShipmentsConfirm_deliveryController,
    EcommercemallAdministratorOrder_itemsForce_cancelController,
    EcommercemallSuperadministratorOrder_itemsForce_cancelController,
    EcommercemallAdministratorOrder_itemsForce_refundController,
    EcommercemallSuperadministratorOrder_itemsForce_refundController,
    EcommercemallAdministratorOrdersForce_cancelController,
    EcommercemallSuperadministratorOrdersForce_cancelController,
    EcommercemallAdministratorOrdersForce_refundController,
    EcommercemallSuperadministratorOrdersForce_refundController,
    EcommercemallCustomerOrdersCancellable_itemsController,
    EcommercemallCustomerProductsRatingsController,
    EcommercemallSellerProductsRatingsController,
    EcommercemallAdministratorProductsRatingsController,
  ],
})
export class MyModule {}
