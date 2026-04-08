import { Module } from "@nestjs/common";

import { EcommercemallAdminAdminsController } from "./controllers/ecommerceMall/admin/admins/EcommercemallAdminAdminsController";
import { EcommercemallAdminArchived_sellersController } from "./controllers/ecommerceMall/admin/archived-sellers/EcommercemallAdminArchived_sellersController";
import { EcommercemallAdminAudit_logsController } from "./controllers/ecommerceMall/admin/audit-logs/EcommercemallAdminAudit_logsController";
import { EcommercemallAdminCancellation_requestsController } from "./controllers/ecommerceMall/admin/cancellation-requests/EcommercemallAdminCancellation_requestsController";
import { EcommercemallAdminCancellation_requestsSnapshotsController } from "./controllers/ecommerceMall/admin/cancellation-requests/snapshots/EcommercemallAdminCancellation_requestsSnapshotsController";
import { EcommercemallAdminCategoriesController } from "./controllers/ecommerceMall/admin/categories/EcommercemallAdminCategoriesController";
import { EcommercemallAdminCustomer_sessionsController } from "./controllers/ecommerceMall/admin/customer-sessions/EcommercemallAdminCustomer_sessionsController";
import { EcommercemallAdminDeleted_productsController } from "./controllers/ecommerceMall/admin/deleted-products/EcommercemallAdminDeleted_productsController";
import { EcommercemallAdminGuest_sessionsController } from "./controllers/ecommerceMall/admin/guest-sessions/EcommercemallAdminGuest_sessionsController";
import { EcommercemallAdminGuestsController } from "./controllers/ecommerceMall/admin/guests/EcommercemallAdminGuestsController";
import { EcommercemallAdminInventory_recordsController } from "./controllers/ecommerceMall/admin/inventory-records/EcommercemallAdminInventory_recordsController";
import { EcommercemallAdminItemsController } from "./controllers/ecommerceMall/admin/items/EcommercemallAdminItemsController";
import { EcommercemallAdminOrder_itemsCancellation_requestsController } from "./controllers/ecommerceMall/admin/order-items/cancellation-requests/EcommercemallAdminOrder_itemsCancellation_requestsController";
import { EcommercemallAdminOrder_itemsRefund_requestsController } from "./controllers/ecommerceMall/admin/order-items/refund-requests/EcommercemallAdminOrder_itemsRefund_requestsController";
import { EcommercemallAdminOrderitemsProductsnapshotController } from "./controllers/ecommerceMall/admin/orderItems/productSnapshot/EcommercemallAdminOrderitemsProductsnapshotController";
import { EcommercemallAdminOrderitemsVariantsnapshotController } from "./controllers/ecommerceMall/admin/orderItems/variantSnapshot/EcommercemallAdminOrderitemsVariantsnapshotController";
import { EcommercemallAdminOrdersController } from "./controllers/ecommerceMall/admin/orders/EcommercemallAdminOrdersController";
import { EcommercemallAdminOrdersItemsProductsnapshotController } from "./controllers/ecommerceMall/admin/orders/items/productSnapshot/EcommercemallAdminOrdersItemsProductsnapshotController";
import { EcommercemallAdminOrdersItemsSellersnapshotController } from "./controllers/ecommerceMall/admin/orders/items/sellerSnapshot/EcommercemallAdminOrdersItemsSellersnapshotController";
import { EcommercemallAdminOrdersItemsSnapshotController } from "./controllers/ecommerceMall/admin/orders/items/snapshot/EcommercemallAdminOrdersItemsSnapshotController";
import { EcommercemallAdminOrdersItemsVariantsnapshotController } from "./controllers/ecommerceMall/admin/orders/items/variantSnapshot/EcommercemallAdminOrdersItemsVariantsnapshotController";
import { EcommercemallAdminOrdersSnapshotsController } from "./controllers/ecommerceMall/admin/orders/snapshots/EcommercemallAdminOrdersSnapshotsController";
import { EcommercemallAdminPassword_resetsController } from "./controllers/ecommerceMall/admin/password-resets/EcommercemallAdminPassword_resetsController";
import { EcommercemallAdminProduct_variantsSnapshotsController } from "./controllers/ecommerceMall/admin/product-variants/snapshots/EcommercemallAdminProduct_variantsSnapshotsController";
import { EcommercemallAdminProductsnapshotsImagesController } from "./controllers/ecommerceMall/admin/productSnapshots/images/EcommercemallAdminProductsnapshotsImagesController";
import { EcommercemallAdminProductvariantsnapshotsOptionvaluesController } from "./controllers/ecommerceMall/admin/productVariantSnapshots/optionValues/EcommercemallAdminProductvariantsnapshotsOptionvaluesController";
import { EcommercemallAdminProductvariantsSnapshotsController } from "./controllers/ecommerceMall/admin/productVariants/snapshots/EcommercemallAdminProductvariantsSnapshotsController";
import { EcommercemallAdminProductsReview_statsController } from "./controllers/ecommerceMall/admin/products/review-stats/EcommercemallAdminProductsReview_statsController";
import { EcommercemallAdminProductsSnapshotsController } from "./controllers/ecommerceMall/admin/products/snapshots/EcommercemallAdminProductsSnapshotsController";
import { EcommercemallAdminRefund_requestsController } from "./controllers/ecommerceMall/admin/refund-requests/EcommercemallAdminRefund_requestsController";
import { EcommercemallAdminRefund_requestsSnapshotsController } from "./controllers/ecommerceMall/admin/refund-requests/snapshots/EcommercemallAdminRefund_requestsSnapshotsController";
import { EcommercemallAdminRegistrationsController } from "./controllers/ecommerceMall/admin/registrations/EcommercemallAdminRegistrationsController";
import { EcommercemallAdminRegistrationsSnapshotsController } from "./controllers/ecommerceMall/admin/registrations/snapshots/EcommercemallAdminRegistrationsSnapshotsController";
import { EcommercemallAdminReviewsSnapshotsController } from "./controllers/ecommerceMall/admin/reviews/snapshots/EcommercemallAdminReviewsSnapshotsController";
import { EcommercemallAdminSellersController } from "./controllers/ecommerceMall/admin/sellers/EcommercemallAdminSellersController";
import { EcommercemallAdminSellersProfile_snapshotsController } from "./controllers/ecommerceMall/admin/sellers/profile-snapshots/EcommercemallAdminSellersProfile_snapshotsController";
import { EcommercemallAdminShipmentsController } from "./controllers/ecommerceMall/admin/shipments/EcommercemallAdminShipmentsController";
import { EcommercemallAdminShipmentsDeliveryController } from "./controllers/ecommerceMall/admin/shipments/delivery/EcommercemallAdminShipmentsDeliveryController";
import { EcommercemallAdminShipmentsItemsController } from "./controllers/ecommerceMall/admin/shipments/items/EcommercemallAdminShipmentsItemsController";
import { EcommercemallAuthAdminController } from "./controllers/ecommerceMall/auth/admin/EcommercemallAuthAdminController";
import { EcommercemallAuthCustomerController } from "./controllers/ecommerceMall/auth/customer/EcommercemallAuthCustomerController";
import { EcommercemallAuthGuestController } from "./controllers/ecommerceMall/auth/guest/EcommercemallAuthGuestController";
import { EcommercemallAuthSellerController } from "./controllers/ecommerceMall/auth/seller/EcommercemallAuthSellerController";
import { EcommercemallAuthSuperadminController } from "./controllers/ecommerceMall/auth/superAdmin/EcommercemallAuthSuperadminController";
import { EcommercemallCategoriesController } from "./controllers/ecommerceMall/categories/EcommercemallCategoriesController";
import { EcommercemallCustomerAddressesController } from "./controllers/ecommerceMall/customer/addresses/EcommercemallCustomerAddressesController";
import { EcommercemallCustomerAdmin_promotion_requestsController } from "./controllers/ecommerceMall/customer/admin-promotion-requests/EcommercemallCustomerAdmin_promotion_requestsController";
import { EcommercemallCustomerCancellation_requestsController } from "./controllers/ecommerceMall/customer/cancellation-requests/EcommercemallCustomerCancellation_requestsController";
import { EcommercemallCustomerCancellation_requestsSnapshotsController } from "./controllers/ecommerceMall/customer/cancellation-requests/snapshots/EcommercemallCustomerCancellation_requestsSnapshotsController";
import { EcommercemallCustomerCart_itemsController } from "./controllers/ecommerceMall/customer/cart-items/EcommercemallCustomerCart_itemsController";
import { EcommercemallCustomerCustomerReviewsController } from "./controllers/ecommerceMall/customer/customer/reviews/EcommercemallCustomerCustomerReviewsController";
import { EcommercemallCustomerOrder_itemsCan_write_reviewController } from "./controllers/ecommerceMall/customer/order-items/can-write-review/EcommercemallCustomerOrder_itemsCan_write_reviewController";
import { EcommercemallCustomerOrder_itemsCancellation_requestsController } from "./controllers/ecommerceMall/customer/order-items/cancellation-requests/EcommercemallCustomerOrder_itemsCancellation_requestsController";
import { EcommercemallCustomerOrder_itemsRefund_requestsController } from "./controllers/ecommerceMall/customer/order-items/refund-requests/EcommercemallCustomerOrder_itemsRefund_requestsController";
import { EcommercemallCustomerOrderitemsProductsnapshotController } from "./controllers/ecommerceMall/customer/orderItems/productSnapshot/EcommercemallCustomerOrderitemsProductsnapshotController";
import { EcommercemallCustomerOrderitemsVariantsnapshotController } from "./controllers/ecommerceMall/customer/orderItems/variantSnapshot/EcommercemallCustomerOrderitemsVariantsnapshotController";
import { EcommercemallCustomerOrdersController } from "./controllers/ecommerceMall/customer/orders/EcommercemallCustomerOrdersController";
import { EcommercemallCustomerOrdersItemsProductsnapshotController } from "./controllers/ecommerceMall/customer/orders/items/productSnapshot/EcommercemallCustomerOrdersItemsProductsnapshotController";
import { EcommercemallCustomerOrdersItemsSellersnapshotController } from "./controllers/ecommerceMall/customer/orders/items/sellerSnapshot/EcommercemallCustomerOrdersItemsSellersnapshotController";
import { EcommercemallCustomerOrdersItemsSnapshotController } from "./controllers/ecommerceMall/customer/orders/items/snapshot/EcommercemallCustomerOrdersItemsSnapshotController";
import { EcommercemallCustomerOrdersItemsVariantsnapshotController } from "./controllers/ecommerceMall/customer/orders/items/variantSnapshot/EcommercemallCustomerOrdersItemsVariantsnapshotController";
import { EcommercemallCustomerProductsDetailController } from "./controllers/ecommerceMall/customer/products/detail/EcommercemallCustomerProductsDetailController";
import { EcommercemallCustomerProductsReview_statsController } from "./controllers/ecommerceMall/customer/products/review-stats/EcommercemallCustomerProductsReview_statsController";
import { EcommercemallCustomerProductsSearchController } from "./controllers/ecommerceMall/customer/products/search/EcommercemallCustomerProductsSearchController";
import { EcommercemallCustomerProfileController } from "./controllers/ecommerceMall/customer/profile/EcommercemallCustomerProfileController";
import { EcommercemallCustomerRefund_requestsController } from "./controllers/ecommerceMall/customer/refund-requests/EcommercemallCustomerRefund_requestsController";
import { EcommercemallCustomerRefund_requestsSnapshotsController } from "./controllers/ecommerceMall/customer/refund-requests/snapshots/EcommercemallCustomerRefund_requestsSnapshotsController";
import { EcommercemallCustomerReviewsController } from "./controllers/ecommerceMall/customer/reviews/EcommercemallCustomerReviewsController";
import { EcommercemallCustomerReviewsSnapshotsController } from "./controllers/ecommerceMall/customer/reviews/snapshots/EcommercemallCustomerReviewsSnapshotsController";
import { EcommercemallCustomerSellersProfileController } from "./controllers/ecommerceMall/customer/sellers/profile/EcommercemallCustomerSellersProfileController";
import { EcommercemallCustomerShipmentsController } from "./controllers/ecommerceMall/customer/shipments/EcommercemallCustomerShipmentsController";
import { EcommercemallCustomerShipmentsDeliveryController } from "./controllers/ecommerceMall/customer/shipments/delivery/EcommercemallCustomerShipmentsDeliveryController";
import { EcommercemallCustomerWishlist_itemsController } from "./controllers/ecommerceMall/customer/wishlist-items/EcommercemallCustomerWishlist_itemsController";
import { EcommercemallCustomersController } from "./controllers/ecommerceMall/customers/EcommercemallCustomersController";
import { EcommercemallGuestProductsReview_statsController } from "./controllers/ecommerceMall/guest/products/review-stats/EcommercemallGuestProductsReview_statsController";
import { EcommercemallGuestSellersProfileController } from "./controllers/ecommerceMall/guest/sellers/profile/EcommercemallGuestSellersProfileController";
import { EcommercemallProductsController } from "./controllers/ecommerceMall/products/EcommercemallProductsController";
import { EcommercemallProductsImagesController } from "./controllers/ecommerceMall/products/images/EcommercemallProductsImagesController";
import { EcommercemallProductsReviewsController } from "./controllers/ecommerceMall/products/reviews/EcommercemallProductsReviewsController";
import { EcommercemallProductsVariantsController } from "./controllers/ecommerceMall/products/variants/EcommercemallProductsVariantsController";
import { EcommercemallProductsVariantsOptionsController } from "./controllers/ecommerceMall/products/variants/options/EcommercemallProductsVariantsOptionsController";
import { EcommercemallReviewsController } from "./controllers/ecommerceMall/reviews/EcommercemallReviewsController";
import { EcommercemallSellerAdmin_promotion_requestsController } from "./controllers/ecommerceMall/seller/admin-promotion-requests/EcommercemallSellerAdmin_promotion_requestsController";
import { EcommercemallSellerCancellation_requestsController } from "./controllers/ecommerceMall/seller/cancellation-requests/EcommercemallSellerCancellation_requestsController";
import { EcommercemallSellerCancellation_requestsSnapshotsController } from "./controllers/ecommerceMall/seller/cancellation-requests/snapshots/EcommercemallSellerCancellation_requestsSnapshotsController";
import { EcommercemallSellerDashboardController } from "./controllers/ecommerceMall/seller/dashboard/EcommercemallSellerDashboardController";
import { EcommercemallSellerInventory_recordsController } from "./controllers/ecommerceMall/seller/inventory-records/EcommercemallSellerInventory_recordsController";
import { EcommercemallSellerItemsController } from "./controllers/ecommerceMall/seller/items/EcommercemallSellerItemsController";
import { EcommercemallSellerOrder_itemsController } from "./controllers/ecommerceMall/seller/order-items/EcommercemallSellerOrder_itemsController";
import { EcommercemallSellerOrder_itemsCancellation_requestsController } from "./controllers/ecommerceMall/seller/order-items/cancellation-requests/EcommercemallSellerOrder_itemsCancellation_requestsController";
import { EcommercemallSellerOrder_itemsRefund_requestsController } from "./controllers/ecommerceMall/seller/order-items/refund-requests/EcommercemallSellerOrder_itemsRefund_requestsController";
import { EcommercemallSellerOrderitemsProductsnapshotController } from "./controllers/ecommerceMall/seller/orderItems/productSnapshot/EcommercemallSellerOrderitemsProductsnapshotController";
import { EcommercemallSellerOrderitemsVariantsnapshotController } from "./controllers/ecommerceMall/seller/orderItems/variantSnapshot/EcommercemallSellerOrderitemsVariantsnapshotController";
import { EcommercemallSellerOrdersController } from "./controllers/ecommerceMall/seller/orders/EcommercemallSellerOrdersController";
import { EcommercemallSellerOrdersItemsProductsnapshotController } from "./controllers/ecommerceMall/seller/orders/items/productSnapshot/EcommercemallSellerOrdersItemsProductsnapshotController";
import { EcommercemallSellerOrdersItemsSellersnapshotController } from "./controllers/ecommerceMall/seller/orders/items/sellerSnapshot/EcommercemallSellerOrdersItemsSellersnapshotController";
import { EcommercemallSellerOrdersItemsSnapshotController } from "./controllers/ecommerceMall/seller/orders/items/snapshot/EcommercemallSellerOrdersItemsSnapshotController";
import { EcommercemallSellerOrdersItemsVariantsnapshotController } from "./controllers/ecommerceMall/seller/orders/items/variantSnapshot/EcommercemallSellerOrdersItemsVariantsnapshotController";
import { EcommercemallSellerPending_requests_countController } from "./controllers/ecommerceMall/seller/pending-requests-count/EcommercemallSellerPending_requests_countController";
import { EcommercemallSellerProduct_variantsSnapshotsController } from "./controllers/ecommerceMall/seller/product-variants/snapshots/EcommercemallSellerProduct_variantsSnapshotsController";
import { EcommercemallSellerProductsnapshotsImagesController } from "./controllers/ecommerceMall/seller/productSnapshots/images/EcommercemallSellerProductsnapshotsImagesController";
import { EcommercemallSellerProductvariantsnapshotsOptionvaluesController } from "./controllers/ecommerceMall/seller/productVariantSnapshots/optionValues/EcommercemallSellerProductvariantsnapshotsOptionvaluesController";
import { EcommercemallSellerProductvariantsSnapshotsController } from "./controllers/ecommerceMall/seller/productVariants/snapshots/EcommercemallSellerProductvariantsSnapshotsController";
import { EcommercemallSellerProductsController } from "./controllers/ecommerceMall/seller/products/EcommercemallSellerProductsController";
import { EcommercemallSellerProductsImagesController } from "./controllers/ecommerceMall/seller/products/images/EcommercemallSellerProductsImagesController";
import { EcommercemallSellerProductsReview_statsController } from "./controllers/ecommerceMall/seller/products/review-stats/EcommercemallSellerProductsReview_statsController";
import { EcommercemallSellerProductsSnapshotsController } from "./controllers/ecommerceMall/seller/products/snapshots/EcommercemallSellerProductsSnapshotsController";
import { EcommercemallSellerProductsVariantsController } from "./controllers/ecommerceMall/seller/products/variants/EcommercemallSellerProductsVariantsController";
import { EcommercemallSellerProductsVariantsOptionsController } from "./controllers/ecommerceMall/seller/products/variants/options/EcommercemallSellerProductsVariantsOptionsController";
import { EcommercemallSellerProfile_snapshotsController } from "./controllers/ecommerceMall/seller/profile-snapshots/EcommercemallSellerProfile_snapshotsController";
import { EcommercemallSellerRefund_requestsController } from "./controllers/ecommerceMall/seller/refund-requests/EcommercemallSellerRefund_requestsController";
import { EcommercemallSellerRefund_requestsSnapshotsController } from "./controllers/ecommerceMall/seller/refund-requests/snapshots/EcommercemallSellerRefund_requestsSnapshotsController";
import { EcommercemallSellerRegistrationsController } from "./controllers/ecommerceMall/seller/registrations/EcommercemallSellerRegistrationsController";
import { EcommercemallSellerRegistrationsSnapshotsController } from "./controllers/ecommerceMall/seller/registrations/snapshots/EcommercemallSellerRegistrationsSnapshotsController";
import { EcommercemallSellerReviewsSnapshotsController } from "./controllers/ecommerceMall/seller/reviews/snapshots/EcommercemallSellerReviewsSnapshotsController";
import { EcommercemallSellerSessionsController } from "./controllers/ecommerceMall/seller/sessions/EcommercemallSellerSessionsController";
import { EcommercemallSellerShipmentsController } from "./controllers/ecommerceMall/seller/shipments/EcommercemallSellerShipmentsController";
import { EcommercemallSellerShipmentsDeliveryController } from "./controllers/ecommerceMall/seller/shipments/delivery/EcommercemallSellerShipmentsDeliveryController";
import { EcommercemallSellerShipmentsItemsController } from "./controllers/ecommerceMall/seller/shipments/items/EcommercemallSellerShipmentsItemsController";
import { EcommercemallSuperadminAdmin_promotion_requestsController } from "./controllers/ecommerceMall/superAdmin/admin-promotion-requests/EcommercemallSuperadminAdmin_promotion_requestsController";
import { EcommercemallSuperadminAdmin_promotion_requestsSnapshotsController } from "./controllers/ecommerceMall/superAdmin/admin-promotion-requests/snapshots/EcommercemallSuperadminAdmin_promotion_requestsSnapshotsController";
import { EcommercemallSuperadminAdminsController } from "./controllers/ecommerceMall/superAdmin/admins/EcommercemallSuperadminAdminsController";
import { EcommercemallSuperadminAudit_logsController } from "./controllers/ecommerceMall/superAdmin/audit-logs/EcommercemallSuperadminAudit_logsController";
import { EcommercemallSuperadminCustomer_sessionsController } from "./controllers/ecommerceMall/superAdmin/customer-sessions/EcommercemallSuperadminCustomer_sessionsController";
import { EcommercemallSuperadminGuest_sessionsController } from "./controllers/ecommerceMall/superAdmin/guest-sessions/EcommercemallSuperadminGuest_sessionsController";
import { EcommercemallSuperadminGuestsController } from "./controllers/ecommerceMall/superAdmin/guests/EcommercemallSuperadminGuestsController";
import { EcommercemallSuperadminItemsController } from "./controllers/ecommerceMall/superAdmin/items/EcommercemallSuperadminItemsController";
import { EcommercemallSuperadminOrdersController } from "./controllers/ecommerceMall/superAdmin/orders/EcommercemallSuperadminOrdersController";
import { EcommercemallSuperadminOrdersSnapshotsController } from "./controllers/ecommerceMall/superAdmin/orders/snapshots/EcommercemallSuperadminOrdersSnapshotsController";
import { EcommercemallSuperadminShipmentsController } from "./controllers/ecommerceMall/superAdmin/shipments/EcommercemallSuperadminShipmentsController";
import { EcommercemallSuperadminShipmentsDeliveryController } from "./controllers/ecommerceMall/superAdmin/shipments/delivery/EcommercemallSuperadminShipmentsDeliveryController";
import { EcommercemallSuperadminShipmentsItemsController } from "./controllers/ecommerceMall/superAdmin/shipments/items/EcommercemallSuperadminShipmentsItemsController";
import { EcommercemallSuperadminSuper_adminsController } from "./controllers/ecommerceMall/superAdmin/super-admins/EcommercemallSuperadminSuper_adminsController";

@Module({
  controllers: [
    EcommercemallAuthGuestController,
    EcommercemallAuthCustomerController,
    EcommercemallAuthSellerController,
    EcommercemallAuthAdminController,
    EcommercemallAuthSuperadminController,
    EcommercemallCustomersController,
    EcommercemallCustomerProfileController,
    EcommercemallAdminCustomer_sessionsController,
    EcommercemallSuperadminCustomer_sessionsController,
    EcommercemallAdminGuestsController,
    EcommercemallSuperadminGuestsController,
    EcommercemallAdminGuest_sessionsController,
    EcommercemallSuperadminGuest_sessionsController,
    EcommercemallCustomerAddressesController,
    EcommercemallAdminSellersController,
    EcommercemallSellerSessionsController,
    EcommercemallSellerRegistrationsController,
    EcommercemallAdminRegistrationsController,
    EcommercemallSellerRegistrationsSnapshotsController,
    EcommercemallAdminRegistrationsSnapshotsController,
    EcommercemallSellerProfile_snapshotsController,
    EcommercemallAdminSellersProfile_snapshotsController,
    EcommercemallGuestSellersProfileController,
    EcommercemallCustomerSellersProfileController,
    EcommercemallAdminAdminsController,
    EcommercemallSuperadminAdminsController,
    EcommercemallAdminPassword_resetsController,
    EcommercemallAdminAudit_logsController,
    EcommercemallSuperadminAudit_logsController,
    EcommercemallSuperadminSuper_adminsController,
    EcommercemallCustomerAdmin_promotion_requestsController,
    EcommercemallSellerAdmin_promotion_requestsController,
    EcommercemallSuperadminAdmin_promotion_requestsController,
    EcommercemallSuperadminAdmin_promotion_requestsSnapshotsController,
    EcommercemallCategoriesController,
    EcommercemallAdminCategoriesController,
    EcommercemallProductsController,
    EcommercemallSellerProductsController,
    EcommercemallProductsImagesController,
    EcommercemallSellerProductsImagesController,
    EcommercemallProductsVariantsController,
    EcommercemallSellerProductsVariantsController,
    EcommercemallProductsVariantsOptionsController,
    EcommercemallSellerProductsVariantsOptionsController,
    EcommercemallSellerProductsSnapshotsController,
    EcommercemallAdminProductsSnapshotsController,
    EcommercemallSellerProductsnapshotsImagesController,
    EcommercemallAdminProductsnapshotsImagesController,
    EcommercemallSellerProduct_variantsSnapshotsController,
    EcommercemallAdminProduct_variantsSnapshotsController,
    EcommercemallSellerProductvariantsSnapshotsController,
    EcommercemallAdminProductvariantsSnapshotsController,
    EcommercemallSellerProductvariantsnapshotsOptionvaluesController,
    EcommercemallAdminProductvariantsnapshotsOptionvaluesController,
    EcommercemallCustomerOrderitemsProductsnapshotController,
    EcommercemallSellerOrderitemsProductsnapshotController,
    EcommercemallAdminOrderitemsProductsnapshotController,
    EcommercemallCustomerOrderitemsVariantsnapshotController,
    EcommercemallSellerOrderitemsVariantsnapshotController,
    EcommercemallAdminOrderitemsVariantsnapshotController,
    EcommercemallSellerInventory_recordsController,
    EcommercemallAdminInventory_recordsController,
    EcommercemallCustomerWishlist_itemsController,
    EcommercemallCustomerCart_itemsController,
    EcommercemallSellerItemsController,
    EcommercemallAdminItemsController,
    EcommercemallSuperadminItemsController,
    EcommercemallSellerShipmentsItemsController,
    EcommercemallAdminShipmentsItemsController,
    EcommercemallSuperadminShipmentsItemsController,
    EcommercemallCustomerShipmentsDeliveryController,
    EcommercemallAdminShipmentsDeliveryController,
    EcommercemallSuperadminShipmentsDeliveryController,
    EcommercemallSellerShipmentsDeliveryController,
    EcommercemallCustomerShipmentsController,
    EcommercemallSellerShipmentsController,
    EcommercemallAdminShipmentsController,
    EcommercemallSuperadminShipmentsController,
    EcommercemallAdminOrdersSnapshotsController,
    EcommercemallSuperadminOrdersSnapshotsController,
    EcommercemallCustomerOrdersController,
    EcommercemallSellerOrdersController,
    EcommercemallAdminOrdersController,
    EcommercemallSuperadminOrdersController,
    EcommercemallCustomerOrdersItemsSnapshotController,
    EcommercemallSellerOrdersItemsSnapshotController,
    EcommercemallAdminOrdersItemsSnapshotController,
    EcommercemallCustomerOrdersItemsProductsnapshotController,
    EcommercemallSellerOrdersItemsProductsnapshotController,
    EcommercemallAdminOrdersItemsProductsnapshotController,
    EcommercemallCustomerOrdersItemsVariantsnapshotController,
    EcommercemallSellerOrdersItemsVariantsnapshotController,
    EcommercemallAdminOrdersItemsVariantsnapshotController,
    EcommercemallCustomerOrdersItemsSellersnapshotController,
    EcommercemallSellerOrdersItemsSellersnapshotController,
    EcommercemallAdminOrdersItemsSellersnapshotController,
    EcommercemallCustomerCancellation_requestsController,
    EcommercemallSellerCancellation_requestsController,
    EcommercemallAdminCancellation_requestsController,
    EcommercemallCustomerCancellation_requestsSnapshotsController,
    EcommercemallSellerCancellation_requestsSnapshotsController,
    EcommercemallAdminCancellation_requestsSnapshotsController,
    EcommercemallCustomerRefund_requestsController,
    EcommercemallSellerRefund_requestsController,
    EcommercemallAdminRefund_requestsController,
    EcommercemallCustomerRefund_requestsSnapshotsController,
    EcommercemallSellerRefund_requestsSnapshotsController,
    EcommercemallAdminRefund_requestsSnapshotsController,
    EcommercemallReviewsController,
    EcommercemallCustomerReviewsController,
    EcommercemallCustomerReviewsSnapshotsController,
    EcommercemallSellerReviewsSnapshotsController,
    EcommercemallAdminReviewsSnapshotsController,
    EcommercemallProductsReviewsController,
    EcommercemallCustomerOrder_itemsCancellation_requestsController,
    EcommercemallSellerOrder_itemsCancellation_requestsController,
    EcommercemallAdminOrder_itemsCancellation_requestsController,
    EcommercemallCustomerOrder_itemsRefund_requestsController,
    EcommercemallSellerOrder_itemsRefund_requestsController,
    EcommercemallAdminOrder_itemsRefund_requestsController,
    EcommercemallCustomerCustomerReviewsController,
    EcommercemallSellerDashboardController,
    EcommercemallSellerOrder_itemsController,
    EcommercemallCustomerProductsSearchController,
    EcommercemallCustomerProductsDetailController,
    EcommercemallCustomerOrder_itemsCan_write_reviewController,
    EcommercemallAdminDeleted_productsController,
    EcommercemallAdminArchived_sellersController,
    EcommercemallGuestProductsReview_statsController,
    EcommercemallCustomerProductsReview_statsController,
    EcommercemallSellerProductsReview_statsController,
    EcommercemallAdminProductsReview_statsController,
    EcommercemallSellerPending_requests_countController,
  ],
})
export class MyModule {}
