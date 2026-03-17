import { Module } from "@nestjs/common";

import { ShoppingmallAdministratorAdministrator_requestsController } from "./controllers/shoppingMall/administrator/administrator-requests/ShoppingmallAdministratorAdministrator_requestsController";
import { ShoppingmallAdministratorCategoriesController } from "./controllers/shoppingMall/administrator/categories/ShoppingmallAdministratorCategoriesController";
import { ShoppingmallAdministratorCategoriesSnapshotsController } from "./controllers/shoppingMall/administrator/categories/snapshots/ShoppingmallAdministratorCategoriesSnapshotsController";
import { ShoppingmallAdministratorProductsSnapshotsController } from "./controllers/shoppingMall/administrator/products/snapshots/ShoppingmallAdministratorProductsSnapshotsController";
import { ShoppingmallAdministratorProductsSnapshotsImage_copiesController } from "./controllers/shoppingMall/administrator/products/snapshots/image-copies/ShoppingmallAdministratorProductsSnapshotsImage_copiesController";
import { ShoppingmallAdministratorProductsSnapshotsVariant_snapshotsController } from "./controllers/shoppingMall/administrator/products/snapshots/variant-snapshots/ShoppingmallAdministratorProductsSnapshotsVariant_snapshotsController";
import { ShoppingmallAdministratorProductsVariantsInventory_recordsController } from "./controllers/shoppingMall/administrator/products/variants/inventory-records/ShoppingmallAdministratorProductsVariantsInventory_recordsController";
import { ShoppingmallAdministratorProductsVariantsSnapshotsController } from "./controllers/shoppingMall/administrator/products/variants/snapshots/ShoppingmallAdministratorProductsVariantsSnapshotsController";
import { ShoppingmallAdministratorProductsVariantsSnapshotsOption_valuesController } from "./controllers/shoppingMall/administrator/products/variants/snapshots/option-values/ShoppingmallAdministratorProductsVariantsSnapshotsOption_valuesController";
import { ShoppingmallAdministratorReviewsSnapshotsController } from "./controllers/shoppingMall/administrator/reviews/snapshots/ShoppingmallAdministratorReviewsSnapshotsController";
import { ShoppingmallAdministratorSeller_approval_requestsController } from "./controllers/shoppingMall/administrator/seller-approval-requests/ShoppingmallAdministratorSeller_approval_requestsController";
import { ShoppingmallAdministratorSeller_profilesSnapshotsController } from "./controllers/shoppingMall/administrator/seller-profiles/snapshots/ShoppingmallAdministratorSeller_profilesSnapshotsController";
import { ShoppingmallAdministratorsController } from "./controllers/shoppingMall/administrators/ShoppingmallAdministratorsController";
import { ShoppingmallAuthAdministratorController } from "./controllers/shoppingMall/auth/administrator/ShoppingmallAuthAdministratorController";
import { ShoppingmallAuthCustomerController } from "./controllers/shoppingMall/auth/customer/ShoppingmallAuthCustomerController";
import { ShoppingmallAuthSellerController } from "./controllers/shoppingMall/auth/seller/ShoppingmallAuthSellerController";
import { ShoppingmallAuthSuperadministratorController } from "./controllers/shoppingMall/auth/superAdministrator/ShoppingmallAuthSuperadministratorController";
import { ShoppingmallCustomerAdministrator_requestsController } from "./controllers/shoppingMall/customer/administrator-requests/ShoppingmallCustomerAdministrator_requestsController";
import { ShoppingmallCustomerCancellation_requestsController } from "./controllers/shoppingMall/customer/cancellation-requests/ShoppingmallCustomerCancellation_requestsController";
import { ShoppingmallCustomerCancellation_requestsSnapshotsController } from "./controllers/shoppingMall/customer/cancellation-requests/snapshots/ShoppingmallCustomerCancellation_requestsSnapshotsController";
import { ShoppingmallCustomerCartitemsController } from "./controllers/shoppingMall/customer/cartItems/ShoppingmallCustomerCartitemsController";
import { ShoppingmallCustomerOrdersController } from "./controllers/shoppingMall/customer/orders/ShoppingmallCustomerOrdersController";
import { ShoppingmallCustomerOrdersAddresssnapshotsController } from "./controllers/shoppingMall/customer/orders/addressSnapshots/ShoppingmallCustomerOrdersAddresssnapshotsController";
import { ShoppingmallCustomerOrdersItemsController } from "./controllers/shoppingMall/customer/orders/items/ShoppingmallCustomerOrdersItemsController";
import { ShoppingmallCustomerOrdersItemsProductpurchasesnapshotsController } from "./controllers/shoppingMall/customer/orders/items/productPurchaseSnapshots/ShoppingmallCustomerOrdersItemsProductpurchasesnapshotsController";
import { ShoppingmallCustomerOrdersItemsProductpurchasesnapshotsOptionvaluesController } from "./controllers/shoppingMall/customer/orders/items/productPurchaseSnapshots/optionValues/ShoppingmallCustomerOrdersItemsProductpurchasesnapshotsOptionvaluesController";
import { ShoppingmallCustomerOrdersItemsSellerprofilepurchasesnapshotsController } from "./controllers/shoppingMall/customer/orders/items/sellerProfilePurchaseSnapshots/ShoppingmallCustomerOrdersItemsSellerprofilepurchasesnapshotsController";
import { ShoppingmallCustomerPasswordresetsController } from "./controllers/shoppingMall/customer/passwordResets/ShoppingmallCustomerPasswordresetsController";
import { ShoppingmallCustomerPaymentattemptsController } from "./controllers/shoppingMall/customer/paymentAttempts/ShoppingmallCustomerPaymentattemptsController";
import { ShoppingmallCustomerProfileController } from "./controllers/shoppingMall/customer/profile/ShoppingmallCustomerProfileController";
import { ShoppingmallCustomerRefund_requestsController } from "./controllers/shoppingMall/customer/refund-requests/ShoppingmallCustomerRefund_requestsController";
import { ShoppingmallCustomerRefund_requestsSnapshotsController } from "./controllers/shoppingMall/customer/refund-requests/snapshots/ShoppingmallCustomerRefund_requestsSnapshotsController";
import { ShoppingmallCustomerReviewsController } from "./controllers/shoppingMall/customer/reviews/ShoppingmallCustomerReviewsController";
import { ShoppingmallCustomerReviewsSnapshotsController } from "./controllers/shoppingMall/customer/reviews/snapshots/ShoppingmallCustomerReviewsSnapshotsController";
import { ShoppingmallCustomerSessionsController } from "./controllers/shoppingMall/customer/sessions/ShoppingmallCustomerSessionsController";
import { ShoppingmallCustomerShippingaddressesController } from "./controllers/shoppingMall/customer/shippingAddresses/ShoppingmallCustomerShippingaddressesController";
import { ShoppingmallCustomerWishlistentriesController } from "./controllers/shoppingMall/customer/wishlistEntries/ShoppingmallCustomerWishlistentriesController";
import { ShoppingmallCustomersController } from "./controllers/shoppingMall/customers/ShoppingmallCustomersController";
import { ShoppingmallProductsController } from "./controllers/shoppingMall/products/ShoppingmallProductsController";
import { ShoppingmallProductsImagesController } from "./controllers/shoppingMall/products/images/ShoppingmallProductsImagesController";
import { ShoppingmallProductsReviewsController } from "./controllers/shoppingMall/products/reviews/ShoppingmallProductsReviewsController";
import { ShoppingmallProductsVariantsController } from "./controllers/shoppingMall/products/variants/ShoppingmallProductsVariantsController";
import { ShoppingmallSeller_profilesController } from "./controllers/shoppingMall/seller-profiles/ShoppingmallSeller_profilesController";
import { ShoppingmallSellerCancellation_requestsController } from "./controllers/shoppingMall/seller/cancellation-requests/ShoppingmallSellerCancellation_requestsController";
import { ShoppingmallSellerCancellationrequestsResponsesController } from "./controllers/shoppingMall/seller/cancellationRequests/responses/ShoppingmallSellerCancellationrequestsResponsesController";
import { ShoppingmallSellerProductsSnapshotsController } from "./controllers/shoppingMall/seller/products/snapshots/ShoppingmallSellerProductsSnapshotsController";
import { ShoppingmallSellerProductsSnapshotsImage_copiesController } from "./controllers/shoppingMall/seller/products/snapshots/image-copies/ShoppingmallSellerProductsSnapshotsImage_copiesController";
import { ShoppingmallSellerProductsSnapshotsVariant_snapshotsController } from "./controllers/shoppingMall/seller/products/snapshots/variant-snapshots/ShoppingmallSellerProductsSnapshotsVariant_snapshotsController";
import { ShoppingmallSellerProfileController } from "./controllers/shoppingMall/seller/profile/ShoppingmallSellerProfileController";
import { ShoppingmallSellerProfileSnapshotsController } from "./controllers/shoppingMall/seller/profile/snapshots/ShoppingmallSellerProfileSnapshotsController";
import { ShoppingmallSellerRefund_requestsController } from "./controllers/shoppingMall/seller/refund-requests/ShoppingmallSellerRefund_requestsController";
import { ShoppingmallSellerRefund_requestsResponsesController } from "./controllers/shoppingMall/seller/refund-requests/responses/ShoppingmallSellerRefund_requestsResponsesController";
import { ShoppingmallSellerSeller_approval_requestsController } from "./controllers/shoppingMall/seller/seller-approval-requests/ShoppingmallSellerSeller_approval_requestsController";
import { ShoppingmallSellerSeller_productsController } from "./controllers/shoppingMall/seller/seller-products/ShoppingmallSellerSeller_productsController";
import { ShoppingmallSellerSeller_productsImagesController } from "./controllers/shoppingMall/seller/seller-products/images/ShoppingmallSellerSeller_productsImagesController";
import { ShoppingmallSellerSeller_productsVariantsController } from "./controllers/shoppingMall/seller/seller-products/variants/ShoppingmallSellerSeller_productsVariantsController";
import { ShoppingmallSellerSeller_productsVariantsInventory_recordsController } from "./controllers/shoppingMall/seller/seller-products/variants/inventory-records/ShoppingmallSellerSeller_productsVariantsInventory_recordsController";
import { ShoppingmallSellerSeller_productsVariantsSnapshotsController } from "./controllers/shoppingMall/seller/seller-products/variants/snapshots/ShoppingmallSellerSeller_productsVariantsSnapshotsController";
import { ShoppingmallSellerSeller_productsVariantsSnapshotsOption_valuesController } from "./controllers/shoppingMall/seller/seller-products/variants/snapshots/option-values/ShoppingmallSellerSeller_productsVariantsSnapshotsOption_valuesController";
import { ShoppingmallSellerShipmentsController } from "./controllers/shoppingMall/seller/shipments/ShoppingmallSellerShipmentsController";
import { ShoppingmallSellerShipmentsTrackinginfosController } from "./controllers/shoppingMall/seller/shipments/trackingInfos/ShoppingmallSellerShipmentsTrackinginfosController";
import { ShoppingmallSellersController } from "./controllers/shoppingMall/sellers/ShoppingmallSellersController";
import { ShoppingmallSuperadministratorAdministrator_requestsController } from "./controllers/shoppingMall/superAdministrator/administrator-requests/ShoppingmallSuperadministratorAdministrator_requestsController";
import { ShoppingmallSuperadministratorAdministratorsGrade_changesController } from "./controllers/shoppingMall/superAdministrator/administrators/grade-changes/ShoppingmallSuperadministratorAdministratorsGrade_changesController";
import { ShoppingmallSuperadministratorSeller_profilesSnapshotsController } from "./controllers/shoppingMall/superAdministrator/seller-profiles/snapshots/ShoppingmallSuperadministratorSeller_profilesSnapshotsController";
import { ShoppingmallSuperadministratorsController } from "./controllers/shoppingMall/superAdministrators/ShoppingmallSuperadministratorsController";

@Module({
  controllers: [
    ShoppingmallAuthCustomerController,
    ShoppingmallAuthSellerController,
    ShoppingmallAuthAdministratorController,
    ShoppingmallAuthSuperadministratorController,
    ShoppingmallCustomersController,
    ShoppingmallCustomerProfileController,
    ShoppingmallCustomerSessionsController,
    ShoppingmallCustomerPasswordresetsController,
    ShoppingmallSellersController,
    ShoppingmallAdministratorsController,
    ShoppingmallSuperadministratorsController,
    ShoppingmallCustomerShippingaddressesController,
    ShoppingmallAdministratorCategoriesController,
    ShoppingmallAdministratorCategoriesSnapshotsController,
    ShoppingmallSeller_profilesController,
    ShoppingmallSellerProfileController,
    ShoppingmallAdministratorSeller_profilesSnapshotsController,
    ShoppingmallSuperadministratorSeller_profilesSnapshotsController,
    ShoppingmallSellerProfileSnapshotsController,
    ShoppingmallSellerSeller_approval_requestsController,
    ShoppingmallAdministratorSeller_approval_requestsController,
    ShoppingmallCustomerAdministrator_requestsController,
    ShoppingmallAdministratorAdministrator_requestsController,
    ShoppingmallSuperadministratorAdministrator_requestsController,
    ShoppingmallSuperadministratorAdministratorsGrade_changesController,
    ShoppingmallProductsImagesController,
    ShoppingmallProductsVariantsController,
    ShoppingmallProductsController,
    ShoppingmallSellerSeller_productsController,
    ShoppingmallSellerSeller_productsImagesController,
    ShoppingmallSellerSeller_productsVariantsController,
    ShoppingmallSellerSeller_productsVariantsInventory_recordsController,
    ShoppingmallAdministratorProductsVariantsInventory_recordsController,
    ShoppingmallSellerProductsSnapshotsController,
    ShoppingmallAdministratorProductsSnapshotsController,
    ShoppingmallSellerProductsSnapshotsVariant_snapshotsController,
    ShoppingmallAdministratorProductsSnapshotsVariant_snapshotsController,
    ShoppingmallSellerProductsSnapshotsImage_copiesController,
    ShoppingmallAdministratorProductsSnapshotsImage_copiesController,
    ShoppingmallSellerSeller_productsVariantsSnapshotsController,
    ShoppingmallAdministratorProductsVariantsSnapshotsController,
    ShoppingmallSellerSeller_productsVariantsSnapshotsOption_valuesController,
    ShoppingmallAdministratorProductsVariantsSnapshotsOption_valuesController,
    ShoppingmallCustomerWishlistentriesController,
    ShoppingmallCustomerCartitemsController,
    ShoppingmallCustomerPaymentattemptsController,
    ShoppingmallCustomerOrdersController,
    ShoppingmallCustomerOrdersAddresssnapshotsController,
    ShoppingmallCustomerOrdersItemsController,
    ShoppingmallCustomerOrdersItemsProductpurchasesnapshotsController,
    ShoppingmallCustomerOrdersItemsSellerprofilepurchasesnapshotsController,
    ShoppingmallCustomerOrdersItemsProductpurchasesnapshotsOptionvaluesController,
    ShoppingmallSellerShipmentsController,
    ShoppingmallSellerShipmentsTrackinginfosController,
    ShoppingmallCustomerCancellation_requestsController,
    ShoppingmallSellerCancellation_requestsController,
    ShoppingmallCustomerCancellation_requestsSnapshotsController,
    ShoppingmallCustomerRefund_requestsController,
    ShoppingmallSellerRefund_requestsController,
    ShoppingmallCustomerRefund_requestsSnapshotsController,
    ShoppingmallProductsReviewsController,
    ShoppingmallCustomerReviewsController,
    ShoppingmallCustomerReviewsSnapshotsController,
    ShoppingmallAdministratorReviewsSnapshotsController,
    ShoppingmallSellerCancellationrequestsResponsesController,
    ShoppingmallSellerRefund_requestsResponsesController,
  ],
})
export class MyModule {}
