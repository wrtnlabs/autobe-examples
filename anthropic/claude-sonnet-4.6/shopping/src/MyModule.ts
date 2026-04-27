import { Module } from "@nestjs/common";

import { ShoppingmallAdminAdminsController } from "./controllers/shoppingMall/admin/admins/ShoppingmallAdminAdminsController";
import { ShoppingmallAdminAdminsOfsellerController } from "./controllers/shoppingMall/admin/admins/ofSeller/ShoppingmallAdminAdminsOfsellerController";
import { ShoppingmallAdminCategoriesController } from "./controllers/shoppingMall/admin/categories/ShoppingmallAdminCategoriesController";
import { ShoppingmallAdminCustomersController } from "./controllers/shoppingMall/admin/customers/ShoppingmallAdminCustomersController";
import { ShoppingmallAdminCustomersAddressesController } from "./controllers/shoppingMall/admin/customers/addresses/ShoppingmallAdminCustomersAddressesController";
import { ShoppingmallAdminCustomersSessionsController } from "./controllers/shoppingMall/admin/customers/sessions/ShoppingmallAdminCustomersSessionsController";
import { ShoppingmallAdminGuestsController } from "./controllers/shoppingMall/admin/guests/ShoppingmallAdminGuestsController";
import { ShoppingmallAdminGuestsSessionsController } from "./controllers/shoppingMall/admin/guests/sessions/ShoppingmallAdminGuestsSessionsController";
import { ShoppingmallAdminOrdersController } from "./controllers/shoppingMall/admin/orders/ShoppingmallAdminOrdersController";
import { ShoppingmallAdminOrdersItemsController } from "./controllers/shoppingMall/admin/orders/items/ShoppingmallAdminOrdersItemsController";
import { ShoppingmallAdminProductsReviewsSnapshotsController } from "./controllers/shoppingMall/admin/products/reviews/snapshots/ShoppingmallAdminProductsReviewsSnapshotsController";
import { ShoppingmallAdminSellerapprovalsController } from "./controllers/shoppingMall/admin/sellerApprovals/ShoppingmallAdminSellerapprovalsController";
import { ShoppingmallAdminSellersController } from "./controllers/shoppingMall/admin/sellers/ShoppingmallAdminSellersController";
import { ShoppingmallAdminSellersProductsController } from "./controllers/shoppingMall/admin/sellers/products/ShoppingmallAdminSellersProductsController";
import { ShoppingmallAdminSellersProductsSnapshotsController } from "./controllers/shoppingMall/admin/sellers/products/snapshots/ShoppingmallAdminSellersProductsSnapshotsController";
import { ShoppingmallAdminSellersProfilesnapshotsController } from "./controllers/shoppingMall/admin/sellers/profileSnapshots/ShoppingmallAdminSellersProfilesnapshotsController";
import { ShoppingmallAdminSellersSessionsController } from "./controllers/shoppingMall/admin/sellers/sessions/ShoppingmallAdminSellersSessionsController";
import { ShoppingmallAdminSnapshotsImagesController } from "./controllers/shoppingMall/admin/snapshots/images/ShoppingmallAdminSnapshotsImagesController";
import { ShoppingmallAdminSnapshotsSkusesController } from "./controllers/shoppingMall/admin/snapshots/skuses/ShoppingmallAdminSnapshotsSkusesController";
import { ShoppingmallAdminSnapshotsSkusesOptionsController } from "./controllers/shoppingMall/admin/snapshots/skuses/options/ShoppingmallAdminSnapshotsSkusesOptionsController";
import { ShoppingmallAdminVariantsInventoryrecordsController } from "./controllers/shoppingMall/admin/variants/inventoryRecords/ShoppingmallAdminVariantsInventoryrecordsController";
import { ShoppingmallAuthAdminController } from "./controllers/shoppingMall/auth/admin/ShoppingmallAuthAdminController";
import { ShoppingmallAuthCustomerController } from "./controllers/shoppingMall/auth/customer/ShoppingmallAuthCustomerController";
import { ShoppingmallAuthGuestController } from "./controllers/shoppingMall/auth/guest/ShoppingmallAuthGuestController";
import { ShoppingmallAuthSellerController } from "./controllers/shoppingMall/auth/seller/ShoppingmallAuthSellerController";
import { ShoppingmallAuthSuperadminController } from "./controllers/shoppingMall/auth/superAdmin/ShoppingmallAuthSuperadminController";
import { ShoppingmallCategoriesController } from "./controllers/shoppingMall/categories/ShoppingmallCategoriesController";
import { ShoppingmallCustomerAddressesController } from "./controllers/shoppingMall/customer/addresses/ShoppingmallCustomerAddressesController";
import { ShoppingmallCustomerAdminrequestsController } from "./controllers/shoppingMall/customer/adminRequests/ShoppingmallCustomerAdminrequestsController";
import { ShoppingmallCustomerCancellationrequestsController } from "./controllers/shoppingMall/customer/cancellationRequests/ShoppingmallCustomerCancellationrequestsController";
import { ShoppingmallCustomerCancellationrequestsSnapshotsController } from "./controllers/shoppingMall/customer/cancellationRequests/snapshots/ShoppingmallCustomerCancellationrequestsSnapshotsController";
import { ShoppingmallCustomerCartitemsController } from "./controllers/shoppingMall/customer/cartItems/ShoppingmallCustomerCartitemsController";
import { ShoppingmallCustomerOrdersController } from "./controllers/shoppingMall/customer/orders/ShoppingmallCustomerOrdersController";
import { ShoppingmallCustomerOrdersItemsController } from "./controllers/shoppingMall/customer/orders/items/ShoppingmallCustomerOrdersItemsController";
import { ShoppingmallCustomerOrdersItemsCancellationrequestsController } from "./controllers/shoppingMall/customer/orders/items/cancellationRequests/ShoppingmallCustomerOrdersItemsCancellationrequestsController";
import { ShoppingmallCustomerOrdersItemsRefundrequestsController } from "./controllers/shoppingMall/customer/orders/items/refundRequests/ShoppingmallCustomerOrdersItemsRefundrequestsController";
import { ShoppingmallCustomerOrdersItemsSnapshotController } from "./controllers/shoppingMall/customer/orders/items/snapshot/ShoppingmallCustomerOrdersItemsSnapshotController";
import { ShoppingmallCustomerProductsReviewsController } from "./controllers/shoppingMall/customer/products/reviews/ShoppingmallCustomerProductsReviewsController";
import { ShoppingmallCustomerProductsReviewsSnapshotsController } from "./controllers/shoppingMall/customer/products/reviews/snapshots/ShoppingmallCustomerProductsReviewsSnapshotsController";
import { ShoppingmallCustomerProfileController } from "./controllers/shoppingMall/customer/profile/ShoppingmallCustomerProfileController";
import { ShoppingmallCustomerRefundrequestsController } from "./controllers/shoppingMall/customer/refundRequests/ShoppingmallCustomerRefundrequestsController";
import { ShoppingmallCustomerRefundrequestsSnapshotsController } from "./controllers/shoppingMall/customer/refundRequests/snapshots/ShoppingmallCustomerRefundrequestsSnapshotsController";
import { ShoppingmallCustomerReviewsController } from "./controllers/shoppingMall/customer/reviews/ShoppingmallCustomerReviewsController";
import { ShoppingmallCustomerSessionsController } from "./controllers/shoppingMall/customer/sessions/ShoppingmallCustomerSessionsController";
import { ShoppingmallCustomerWishlistitemsController } from "./controllers/shoppingMall/customer/wishlistItems/ShoppingmallCustomerWishlistitemsController";
import { ShoppingmallProductsController } from "./controllers/shoppingMall/products/ShoppingmallProductsController";
import { ShoppingmallProductsImagesController } from "./controllers/shoppingMall/products/images/ShoppingmallProductsImagesController";
import { ShoppingmallProductsReviewsController } from "./controllers/shoppingMall/products/reviews/ShoppingmallProductsReviewsController";
import { ShoppingmallProductsVariantsController } from "./controllers/shoppingMall/products/variants/ShoppingmallProductsVariantsController";
import { ShoppingmallProductsVariantsOptionsController } from "./controllers/shoppingMall/products/variants/options/ShoppingmallProductsVariantsOptionsController";
import { ShoppingmallProductsVariantsStockController } from "./controllers/shoppingMall/products/variants/stock/ShoppingmallProductsVariantsStockController";
import { ShoppingmallSellerAdminrequestsController } from "./controllers/shoppingMall/seller/adminRequests/ShoppingmallSellerAdminrequestsController";
import { ShoppingmallSellerApprovalsController } from "./controllers/shoppingMall/seller/approvals/ShoppingmallSellerApprovalsController";
import { ShoppingmallSellerCancellationrequestsController } from "./controllers/shoppingMall/seller/cancellationRequests/ShoppingmallSellerCancellationrequestsController";
import { ShoppingmallSellerOrdersShipmentsController } from "./controllers/shoppingMall/seller/orders/shipments/ShoppingmallSellerOrdersShipmentsController";
import { ShoppingmallSellerOrdersShipmentsItemsController } from "./controllers/shoppingMall/seller/orders/shipments/items/ShoppingmallSellerOrdersShipmentsItemsController";
import { ShoppingmallSellerProductsController } from "./controllers/shoppingMall/seller/products/ShoppingmallSellerProductsController";
import { ShoppingmallSellerProductsImagesController } from "./controllers/shoppingMall/seller/products/images/ShoppingmallSellerProductsImagesController";
import { ShoppingmallSellerProductsSnapshotsController } from "./controllers/shoppingMall/seller/products/snapshots/ShoppingmallSellerProductsSnapshotsController";
import { ShoppingmallSellerProductsSnapshotsImagesController } from "./controllers/shoppingMall/seller/products/snapshots/images/ShoppingmallSellerProductsSnapshotsImagesController";
import { ShoppingmallSellerProductsSnapshotsSkusesController } from "./controllers/shoppingMall/seller/products/snapshots/skuses/ShoppingmallSellerProductsSnapshotsSkusesController";
import { ShoppingmallSellerProductsSnapshotsSkusesOptionsController } from "./controllers/shoppingMall/seller/products/snapshots/skuses/options/ShoppingmallSellerProductsSnapshotsSkusesOptionsController";
import { ShoppingmallSellerProductsVariantsController } from "./controllers/shoppingMall/seller/products/variants/ShoppingmallSellerProductsVariantsController";
import { ShoppingmallSellerProductsVariantsInventoryrecordsController } from "./controllers/shoppingMall/seller/products/variants/inventoryRecords/ShoppingmallSellerProductsVariantsInventoryrecordsController";
import { ShoppingmallSellerProfileController } from "./controllers/shoppingMall/seller/profile/ShoppingmallSellerProfileController";
import { ShoppingmallSellerProfilesnapshotsController } from "./controllers/shoppingMall/seller/profileSnapshots/ShoppingmallSellerProfilesnapshotsController";
import { ShoppingmallSellerRefundrequestsController } from "./controllers/shoppingMall/seller/refundRequests/ShoppingmallSellerRefundrequestsController";
import { ShoppingmallSellersController } from "./controllers/shoppingMall/sellers/ShoppingmallSellersController";
import { ShoppingmallSuperadminAdminrequestsController } from "./controllers/shoppingMall/superAdmin/adminRequests/ShoppingmallSuperadminAdminrequestsController";
import { ShoppingmallSuperadminAdminsController } from "./controllers/shoppingMall/superAdmin/admins/ShoppingmallSuperadminAdminsController";
import { ShoppingmallSuperadminAdminsOfsellerController } from "./controllers/shoppingMall/superAdmin/admins/ofSeller/ShoppingmallSuperadminAdminsOfsellerController";
import { ShoppingmallSuperadminAdminsSessionsController } from "./controllers/shoppingMall/superAdmin/admins/sessions/ShoppingmallSuperadminAdminsSessionsController";
import { ShoppingmallSuperadminCustomersController } from "./controllers/shoppingMall/superAdmin/customers/ShoppingmallSuperadminCustomersController";
import { ShoppingmallSuperadminCustomersSessionsController } from "./controllers/shoppingMall/superAdmin/customers/sessions/ShoppingmallSuperadminCustomersSessionsController";
import { ShoppingmallSuperadminGuestsController } from "./controllers/shoppingMall/superAdmin/guests/ShoppingmallSuperadminGuestsController";
import { ShoppingmallSuperadminGuestsSessionsController } from "./controllers/shoppingMall/superAdmin/guests/sessions/ShoppingmallSuperadminGuestsSessionsController";
import { ShoppingmallSuperadminOrdersController } from "./controllers/shoppingMall/superAdmin/orders/ShoppingmallSuperadminOrdersController";
import { ShoppingmallSuperadminOrdersItemsController } from "./controllers/shoppingMall/superAdmin/orders/items/ShoppingmallSuperadminOrdersItemsController";
import { ShoppingmallSuperadminSellerapprovalsController } from "./controllers/shoppingMall/superAdmin/sellerApprovals/ShoppingmallSuperadminSellerapprovalsController";
import { ShoppingmallSuperadminSellersController } from "./controllers/shoppingMall/superAdmin/sellers/ShoppingmallSuperadminSellersController";
import { ShoppingmallSuperadminSellersSessionsController } from "./controllers/shoppingMall/superAdmin/sellers/sessions/ShoppingmallSuperadminSellersSessionsController";
import { ShoppingmallSuperadminSuperadminsController } from "./controllers/shoppingMall/superAdmin/superAdmins/ShoppingmallSuperadminSuperadminsController";
import { ShoppingmallSuperadminSuperadminsOfcustomerController } from "./controllers/shoppingMall/superAdmin/superAdmins/ofCustomer/ShoppingmallSuperadminSuperadminsOfcustomerController";
import { ShoppingmallSuperadminSuperadminsOfsellerController } from "./controllers/shoppingMall/superAdmin/superAdmins/ofSeller/ShoppingmallSuperadminSuperadminsOfsellerController";

@Module({
  controllers: [
    ShoppingmallAuthGuestController,
    ShoppingmallAuthCustomerController,
    ShoppingmallAuthSellerController,
    ShoppingmallAuthAdminController,
    ShoppingmallAuthSuperadminController,
    ShoppingmallAdminGuestsController,
    ShoppingmallSuperadminGuestsController,
    ShoppingmallAdminGuestsSessionsController,
    ShoppingmallSuperadminGuestsSessionsController,
    ShoppingmallAdminCustomersController,
    ShoppingmallSuperadminCustomersController,
    ShoppingmallCustomerProfileController,
    ShoppingmallCustomerSessionsController,
    ShoppingmallAdminCustomersSessionsController,
    ShoppingmallSuperadminCustomersSessionsController,
    ShoppingmallAdminSellersController,
    ShoppingmallSuperadminSellersController,
    ShoppingmallSellersController,
    ShoppingmallAdminSellersSessionsController,
    ShoppingmallSuperadminSellersSessionsController,
    ShoppingmallAdminAdminsController,
    ShoppingmallSuperadminAdminsController,
    ShoppingmallSuperadminAdminsSessionsController,
    ShoppingmallAdminAdminsOfsellerController,
    ShoppingmallSuperadminAdminsOfsellerController,
    ShoppingmallSuperadminSuperadminsController,
    ShoppingmallSuperadminSuperadminsOfcustomerController,
    ShoppingmallSuperadminSuperadminsOfsellerController,
    ShoppingmallCategoriesController,
    ShoppingmallAdminCategoriesController,
    ShoppingmallProductsController,
    ShoppingmallSellerProductsController,
    ShoppingmallAdminSellersProductsController,
    ShoppingmallProductsImagesController,
    ShoppingmallSellerProductsImagesController,
    ShoppingmallProductsVariantsController,
    ShoppingmallSellerProductsVariantsController,
    ShoppingmallProductsVariantsOptionsController,
    ShoppingmallSellerProductsSnapshotsController,
    ShoppingmallAdminSellersProductsSnapshotsController,
    ShoppingmallSellerProductsSnapshotsSkusesController,
    ShoppingmallAdminSnapshotsSkusesController,
    ShoppingmallSellerProductsSnapshotsSkusesOptionsController,
    ShoppingmallAdminSnapshotsSkusesOptionsController,
    ShoppingmallSellerProductsSnapshotsImagesController,
    ShoppingmallAdminSnapshotsImagesController,
    ShoppingmallSellerProfileController,
    ShoppingmallSellerProfilesnapshotsController,
    ShoppingmallAdminSellersProfilesnapshotsController,
    ShoppingmallSellerProductsVariantsInventoryrecordsController,
    ShoppingmallAdminVariantsInventoryrecordsController,
    ShoppingmallCustomerAddressesController,
    ShoppingmallAdminCustomersAddressesController,
    ShoppingmallCustomerWishlistitemsController,
    ShoppingmallCustomerCartitemsController,
    ShoppingmallCustomerOrdersController,
    ShoppingmallCustomerOrdersItemsController,
    ShoppingmallCustomerOrdersItemsSnapshotController,
    ShoppingmallSellerOrdersShipmentsController,
    ShoppingmallSellerOrdersShipmentsItemsController,
    ShoppingmallCustomerOrdersItemsCancellationrequestsController,
    ShoppingmallCustomerCancellationrequestsController,
    ShoppingmallSellerCancellationrequestsController,
    ShoppingmallCustomerCancellationrequestsSnapshotsController,
    ShoppingmallCustomerOrdersItemsRefundrequestsController,
    ShoppingmallCustomerRefundrequestsController,
    ShoppingmallSellerRefundrequestsController,
    ShoppingmallCustomerRefundrequestsSnapshotsController,
    ShoppingmallProductsReviewsController,
    ShoppingmallCustomerProductsReviewsController,
    ShoppingmallCustomerReviewsController,
    ShoppingmallCustomerProductsReviewsSnapshotsController,
    ShoppingmallAdminProductsReviewsSnapshotsController,
    ShoppingmallCustomerAdminrequestsController,
    ShoppingmallSellerAdminrequestsController,
    ShoppingmallSuperadminAdminrequestsController,
    ShoppingmallSellerApprovalsController,
    ShoppingmallAdminSellerapprovalsController,
    ShoppingmallSuperadminSellerapprovalsController,
    ShoppingmallProductsVariantsStockController,
    ShoppingmallAdminOrdersItemsController,
    ShoppingmallSuperadminOrdersItemsController,
    ShoppingmallAdminOrdersController,
    ShoppingmallSuperadminOrdersController,
  ],
})
export class MyModule {}
