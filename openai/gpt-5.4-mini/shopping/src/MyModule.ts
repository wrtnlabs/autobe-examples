import { Module } from "@nestjs/common";

import { MallplatformAdministratorAdministrator_approval_requestsSnapshotsController } from "./controllers/mallPlatform/administrator/administrator-approval-requests/snapshots/MallplatformAdministratorAdministrator_approval_requestsSnapshotsController";
import { MallplatformAdministratorAdministratorapprovalrequestsController } from "./controllers/mallPlatform/administrator/administratorApprovalRequests/MallplatformAdministratorAdministratorapprovalrequestsController";
import { MallplatformAdministratorAdministratorsController } from "./controllers/mallPlatform/administrator/administrators/MallplatformAdministratorAdministratorsController";
import { MallplatformAdministratorCategoriesController } from "./controllers/mallPlatform/administrator/categories/MallplatformAdministratorCategoriesController";
import { MallplatformAdministratorCategoriesSubcategoriesController } from "./controllers/mallPlatform/administrator/categories/subcategories/MallplatformAdministratorCategoriesSubcategoriesController";
import { MallplatformAdministratorCustomersController } from "./controllers/mallPlatform/administrator/customers/MallplatformAdministratorCustomersController";
import { MallplatformAdministratorOrder_itemsSnapshotsController } from "./controllers/mallPlatform/administrator/order-items/snapshots/MallplatformAdministratorOrder_itemsSnapshotsController";
import { MallplatformAdministratorOrder_itemsSnapshotsVariant_optionsController } from "./controllers/mallPlatform/administrator/order-items/snapshots/variant-options/MallplatformAdministratorOrder_itemsSnapshotsVariant_optionsController";
import { MallplatformAdministratorOrderitemsCancellationrequestsController } from "./controllers/mallPlatform/administrator/orderItems/cancellationRequests/MallplatformAdministratorOrderitemsCancellationrequestsController";
import { MallplatformAdministratorOrderitemsCancellationrequestsSnapshotsController } from "./controllers/mallPlatform/administrator/orderItems/cancellationRequests/snapshots/MallplatformAdministratorOrderitemsCancellationrequestsSnapshotsController";
import { MallplatformAdministratorPassword_resetsController } from "./controllers/mallPlatform/administrator/password-resets/MallplatformAdministratorPassword_resetsController";
import { MallplatformAdministratorProduct_variantsAvailabilityController } from "./controllers/mallPlatform/administrator/product-variants/availability/MallplatformAdministratorProduct_variantsAvailabilityController";
import { MallplatformAdministratorProductvariantsInventoryrecordsController } from "./controllers/mallPlatform/administrator/productVariants/inventoryRecords/MallplatformAdministratorProductvariantsInventoryrecordsController";
import { MallplatformAdministratorProductvariantsSnapshotsController } from "./controllers/mallPlatform/administrator/productVariants/snapshots/MallplatformAdministratorProductvariantsSnapshotsController";
import { MallplatformAdministratorProductsController } from "./controllers/mallPlatform/administrator/products/MallplatformAdministratorProductsController";
import { MallplatformAdministratorProducts_imagesnapshotsController } from "./controllers/mallPlatform/administrator/products/imageSnapshots/MallplatformAdministratorProducts_imagesnapshotsController";
import { MallplatformAdministratorProductsImagesController } from "./controllers/mallPlatform/administrator/products/images/MallplatformAdministratorProductsImagesController";
import { MallplatformAdministratorProductsImagesReorderController } from "./controllers/mallPlatform/administrator/products/images/reorder/MallplatformAdministratorProductsImagesReorderController";
import { MallplatformAdministratorProductsSnapshotsController } from "./controllers/mallPlatform/administrator/products/snapshots/MallplatformAdministratorProductsSnapshotsController";
import { MallplatformAdministratorProductsSnapshotsImagesController } from "./controllers/mallPlatform/administrator/products/snapshots/images/MallplatformAdministratorProductsSnapshotsImagesController";
import { MallplatformAdministratorProductsSnapshotsVariantsController } from "./controllers/mallPlatform/administrator/products/snapshots/variants/MallplatformAdministratorProductsSnapshotsVariantsController";
import { MallplatformAdministratorProductsVariantsnapshotsController } from "./controllers/mallPlatform/administrator/products/variantSnapshots/MallplatformAdministratorProductsVariantsnapshotsController";
import { MallplatformAdministratorProductsVariantsnapshotsOptionsController } from "./controllers/mallPlatform/administrator/products/variantSnapshots/options/MallplatformAdministratorProductsVariantsnapshotsOptionsController";
import { MallplatformAdministratorProductsVariantsController } from "./controllers/mallPlatform/administrator/products/variants/MallplatformAdministratorProductsVariantsController";
import { MallplatformAdministratorRefundrequestsSnapshotsController } from "./controllers/mallPlatform/administrator/refundRequests/snapshots/MallplatformAdministratorRefundrequestsSnapshotsController";
import { MallplatformAdministratorReviewsnapshotsController } from "./controllers/mallPlatform/administrator/reviewSnapshots/MallplatformAdministratorReviewsnapshotsController";
import { MallplatformAdministratorReviewsSnapshotsController } from "./controllers/mallPlatform/administrator/reviews/snapshots/MallplatformAdministratorReviewsSnapshotsController";
import { MallplatformAdministratorSeller_approval_requestsController } from "./controllers/mallPlatform/administrator/seller-approval-requests/MallplatformAdministratorSeller_approval_requestsController";
import { MallplatformAdministratorSeller_profilesSnapshotsController } from "./controllers/mallPlatform/administrator/seller-profiles/snapshots/MallplatformAdministratorSeller_profilesSnapshotsController";
import { MallplatformAdministratorSelleraccountsController } from "./controllers/mallPlatform/administrator/sellerAccounts/MallplatformAdministratorSelleraccountsController";
import { MallplatformAdministratorSellerprofilesController } from "./controllers/mallPlatform/administrator/sellerProfiles/MallplatformAdministratorSellerprofilesController";
import { MallplatformAdministratorSellersController } from "./controllers/mallPlatform/administrator/sellers/MallplatformAdministratorSellersController";
import { MallplatformAuthAdministratorController } from "./controllers/mallPlatform/auth/administrator/MallplatformAuthAdministratorController";
import { MallplatformAuthCustomerController } from "./controllers/mallPlatform/auth/customer/MallplatformAuthCustomerController";
import { MallplatformAuthSellerController } from "./controllers/mallPlatform/auth/seller/MallplatformAuthSellerController";
import { MallplatformCustomerAccountsController } from "./controllers/mallPlatform/customer/accounts/MallplatformCustomerAccountsController";
import { MallplatformCustomerCartsController } from "./controllers/mallPlatform/customer/carts/MallplatformCustomerCartsController";
import { MallplatformCustomerCartsCheckout_previewController } from "./controllers/mallPlatform/customer/carts/checkout-preview/MallplatformCustomerCartsCheckout_previewController";
import { MallplatformCustomerCartsItemsController } from "./controllers/mallPlatform/customer/carts/items/MallplatformCustomerCartsItemsController";
import { MallplatformCustomerCartsSummaryController } from "./controllers/mallPlatform/customer/carts/summary/MallplatformCustomerCartsSummaryController";
import { MallplatformCustomerCategoriesController } from "./controllers/mallPlatform/customer/categories/MallplatformCustomerCategoriesController";
import { MallplatformCustomerCategoriesProductsController } from "./controllers/mallPlatform/customer/categories/products/MallplatformCustomerCategoriesProductsController";
import { MallplatformCustomerOrder_itemsSnapshotsController } from "./controllers/mallPlatform/customer/order-items/snapshots/MallplatformCustomerOrder_itemsSnapshotsController";
import { MallplatformCustomerOrder_itemsSnapshotsVariant_optionsController } from "./controllers/mallPlatform/customer/order-items/snapshots/variant-options/MallplatformCustomerOrder_itemsSnapshotsVariant_optionsController";
import { MallplatformCustomerOrderitemsCancellationrequestsController } from "./controllers/mallPlatform/customer/orderItems/cancellationRequests/MallplatformCustomerOrderitemsCancellationrequestsController";
import { MallplatformCustomerOrderitemsCancellationrequestsSnapshotsController } from "./controllers/mallPlatform/customer/orderItems/cancellationRequests/snapshots/MallplatformCustomerOrderitemsCancellationrequestsSnapshotsController";
import { MallplatformCustomerOrderitemsRefundrequestsController } from "./controllers/mallPlatform/customer/orderItems/refundRequests/MallplatformCustomerOrderitemsRefundrequestsController";
import { MallplatformCustomerOrderitemsReviewController } from "./controllers/mallPlatform/customer/orderItems/review/MallplatformCustomerOrderitemsReviewController";
import { MallplatformCustomerOrdersController } from "./controllers/mallPlatform/customer/orders/MallplatformCustomerOrdersController";
import { MallplatformCustomerOrdersHistoryController } from "./controllers/mallPlatform/customer/orders/history/MallplatformCustomerOrdersHistoryController";
import { MallplatformCustomerOrdersHistoryItemsController } from "./controllers/mallPlatform/customer/orders/history/items/MallplatformCustomerOrdersHistoryItemsController";
import { MallplatformCustomerOrdersItemsController } from "./controllers/mallPlatform/customer/orders/items/MallplatformCustomerOrdersItemsController";
import { MallplatformCustomerOrdersShipmentsController } from "./controllers/mallPlatform/customer/orders/shipments/MallplatformCustomerOrdersShipmentsController";
import { MallplatformCustomerPassword_resetsController } from "./controllers/mallPlatform/customer/password-resets/MallplatformCustomerPassword_resetsController";
import { MallplatformCustomerProductsController } from "./controllers/mallPlatform/customer/products/MallplatformCustomerProductsController";
import { MallplatformCustomerProfileController } from "./controllers/mallPlatform/customer/profile/MallplatformCustomerProfileController";
import { MallplatformCustomerRefundrequestsController } from "./controllers/mallPlatform/customer/refundRequests/MallplatformCustomerRefundrequestsController";
import { MallplatformCustomerRefundrequestsSnapshotsController } from "./controllers/mallPlatform/customer/refundRequests/snapshots/MallplatformCustomerRefundrequestsSnapshotsController";
import { MallplatformCustomerReviewsController } from "./controllers/mallPlatform/customer/reviews/MallplatformCustomerReviewsController";
import { MallplatformCustomerReviewsSnapshotsController } from "./controllers/mallPlatform/customer/reviews/snapshots/MallplatformCustomerReviewsSnapshotsController";
import { MallplatformCustomerSellerprofilesController } from "./controllers/mallPlatform/customer/sellerProfiles/MallplatformCustomerSellerprofilesController";
import { MallplatformCustomerSessionsController } from "./controllers/mallPlatform/customer/sessions/MallplatformCustomerSessionsController";
import { MallplatformCustomerShipmentsController } from "./controllers/mallPlatform/customer/shipments/MallplatformCustomerShipmentsController";
import { MallplatformCustomerShipmentsItemsController } from "./controllers/mallPlatform/customer/shipments/items/MallplatformCustomerShipmentsItemsController";
import { MallplatformCustomerShipping_addressesController } from "./controllers/mallPlatform/customer/shipping-addresses/MallplatformCustomerShipping_addressesController";
import { MallplatformCustomerShipping_addresses_defaultController } from "./controllers/mallPlatform/customer/shipping-addresses/default/MallplatformCustomerShipping_addresses_defaultController";
import { MallplatformCustomerWishlistsController } from "./controllers/mallPlatform/customer/wishlists/MallplatformCustomerWishlistsController";
import { MallplatformCustomerWishlistsItemsController } from "./controllers/mallPlatform/customer/wishlists/items/MallplatformCustomerWishlistsItemsController";
import { MallplatformProductsReviewsController } from "./controllers/mallPlatform/products/reviews/MallplatformProductsReviewsController";
import { MallplatformSellerAccountController } from "./controllers/mallPlatform/seller/account/MallplatformSellerAccountController";
import { MallplatformSellerOrder_itemsSnapshotsController } from "./controllers/mallPlatform/seller/order-items/snapshots/MallplatformSellerOrder_itemsSnapshotsController";
import { MallplatformSellerOrder_itemsSnapshotsVariant_optionsController } from "./controllers/mallPlatform/seller/order-items/snapshots/variant-options/MallplatformSellerOrder_itemsSnapshotsVariant_optionsController";
import { MallplatformSellerOrderitemsCancellationrequestsController } from "./controllers/mallPlatform/seller/orderItems/cancellationRequests/MallplatformSellerOrderitemsCancellationrequestsController";
import { MallplatformSellerOrderitemsCancellationrequestsSnapshotsController } from "./controllers/mallPlatform/seller/orderItems/cancellationRequests/snapshots/MallplatformSellerOrderitemsCancellationrequestsSnapshotsController";
import { MallplatformSellerProduct_variantsAvailabilityController } from "./controllers/mallPlatform/seller/product-variants/availability/MallplatformSellerProduct_variantsAvailabilityController";
import { MallplatformSellerProductvariantsInventoryrecordsController } from "./controllers/mallPlatform/seller/productVariants/inventoryRecords/MallplatformSellerProductvariantsInventoryrecordsController";
import { MallplatformSellerProductvariantsInventoryrecordsAdjustmentController } from "./controllers/mallPlatform/seller/productVariants/inventoryRecords/adjustment/MallplatformSellerProductvariantsInventoryrecordsAdjustmentController";
import { MallplatformSellerProductvariantsInventoryrecordsRestockController } from "./controllers/mallPlatform/seller/productVariants/inventoryRecords/restock/MallplatformSellerProductvariantsInventoryrecordsRestockController";
import { MallplatformSellerProductvariantsSnapshotsController } from "./controllers/mallPlatform/seller/productVariants/snapshots/MallplatformSellerProductvariantsSnapshotsController";
import { MallplatformSellerProductsController } from "./controllers/mallPlatform/seller/products/MallplatformSellerProductsController";
import { MallplatformSellerProducts_imagesnapshotsController } from "./controllers/mallPlatform/seller/products/imageSnapshots/MallplatformSellerProducts_imagesnapshotsController";
import { MallplatformSellerProductsImagesController } from "./controllers/mallPlatform/seller/products/images/MallplatformSellerProductsImagesController";
import { MallplatformSellerProductsImagesReorderController } from "./controllers/mallPlatform/seller/products/images/reorder/MallplatformSellerProductsImagesReorderController";
import { MallplatformSellerProductsSnapshotsController } from "./controllers/mallPlatform/seller/products/snapshots/MallplatformSellerProductsSnapshotsController";
import { MallplatformSellerProductsSnapshotsImagesController } from "./controllers/mallPlatform/seller/products/snapshots/images/MallplatformSellerProductsSnapshotsImagesController";
import { MallplatformSellerProductsSnapshotsVariantsController } from "./controllers/mallPlatform/seller/products/snapshots/variants/MallplatformSellerProductsSnapshotsVariantsController";
import { MallplatformSellerProductsVariantsnapshotsController } from "./controllers/mallPlatform/seller/products/variantSnapshots/MallplatformSellerProductsVariantsnapshotsController";
import { MallplatformSellerProductsVariantsnapshotsOptionsController } from "./controllers/mallPlatform/seller/products/variantSnapshots/options/MallplatformSellerProductsVariantsnapshotsOptionsController";
import { MallplatformSellerProductsVariantsController } from "./controllers/mallPlatform/seller/products/variants/MallplatformSellerProductsVariantsController";
import { MallplatformSellerProductsVariantsInventoryhistoryController } from "./controllers/mallPlatform/seller/products/variants/inventoryHistory/MallplatformSellerProductsVariantsInventoryhistoryController";
import { MallplatformSellerProfileController } from "./controllers/mallPlatform/seller/profile/MallplatformSellerProfileController";
import { MallplatformSellerRefundrequestsController } from "./controllers/mallPlatform/seller/refundRequests/MallplatformSellerRefundrequestsController";
import { MallplatformSellerRefundrequestsApproveController } from "./controllers/mallPlatform/seller/refundRequests/approve/MallplatformSellerRefundrequestsApproveController";
import { MallplatformSellerRefundrequestsSnapshotsController } from "./controllers/mallPlatform/seller/refundRequests/snapshots/MallplatformSellerRefundrequestsSnapshotsController";
import { MallplatformSellerSeller_approval_requestsController } from "./controllers/mallPlatform/seller/seller-approval-requests/MallplatformSellerSeller_approval_requestsController";
import { MallplatformSellerSeller_profilesSnapshotsController } from "./controllers/mallPlatform/seller/seller-profiles/snapshots/MallplatformSellerSeller_profilesSnapshotsController";
import { MallplatformSellerShipmentsController } from "./controllers/mallPlatform/seller/shipments/MallplatformSellerShipmentsController";
import { MallplatformSellerShipmentsItemsController } from "./controllers/mallPlatform/seller/shipments/items/MallplatformSellerShipmentsItemsController";
import { MallplatformSellerStatusController } from "./controllers/mallPlatform/seller/status/MallplatformSellerStatusController";

@Module({
  controllers: [
    MallplatformAuthCustomerController,
    MallplatformAuthSellerController,
    MallplatformAuthAdministratorController,
    MallplatformAdministratorCustomersController,
    MallplatformCustomerAccountsController,
    MallplatformAdministratorSellersController,
    MallplatformAdministratorAdministratorsController,
    MallplatformCustomerSessionsController,
    MallplatformCustomerPassword_resetsController,
    MallplatformAdministratorPassword_resetsController,
    MallplatformCustomerProfileController,
    MallplatformCustomerShipping_addressesController,
    MallplatformCustomerShipping_addresses_defaultController,
    MallplatformAdministratorSelleraccountsController,
    MallplatformSellerAccountController,
    MallplatformCustomerSellerprofilesController,
    MallplatformAdministratorSellerprofilesController,
    MallplatformSellerProfileController,
    MallplatformCustomerCategoriesController,
    MallplatformCustomerCategoriesProductsController,
    MallplatformAdministratorCategoriesController,
    MallplatformAdministratorCategoriesSubcategoriesController,
    MallplatformCustomerProductsController,
    MallplatformSellerProductsController,
    MallplatformAdministratorProductsController,
    MallplatformSellerProductsVariantsController,
    MallplatformAdministratorProductsVariantsController,
    MallplatformSellerProductsImagesController,
    MallplatformAdministratorProductsImagesController,
    MallplatformSellerProducts_imagesnapshotsController,
    MallplatformAdministratorProducts_imagesnapshotsController,
    MallplatformSellerProductsVariantsnapshotsController,
    MallplatformAdministratorProductsVariantsnapshotsController,
    MallplatformSellerProductsVariantsnapshotsOptionsController,
    MallplatformAdministratorProductsVariantsnapshotsOptionsController,
    MallplatformSellerProductvariantsInventoryrecordsController,
    MallplatformAdministratorProductvariantsInventoryrecordsController,
    MallplatformCustomerCartsController,
    MallplatformCustomerCartsItemsController,
    MallplatformCustomerWishlistsController,
    MallplatformCustomerWishlistsItemsController,
    MallplatformCustomerOrdersController,
    MallplatformCustomerOrdersItemsController,
    MallplatformSellerShipmentsController,
    MallplatformCustomerShipmentsController,
    MallplatformSellerShipmentsItemsController,
    MallplatformCustomerShipmentsItemsController,
    MallplatformCustomerOrderitemsCancellationrequestsController,
    MallplatformSellerOrderitemsCancellationrequestsController,
    MallplatformAdministratorOrderitemsCancellationrequestsController,
    MallplatformCustomerOrderitemsCancellationrequestsSnapshotsController,
    MallplatformSellerOrderitemsCancellationrequestsSnapshotsController,
    MallplatformAdministratorOrderitemsCancellationrequestsSnapshotsController,
    MallplatformCustomerOrderitemsRefundrequestsController,
    MallplatformCustomerRefundrequestsController,
    MallplatformSellerRefundrequestsController,
    MallplatformCustomerRefundrequestsSnapshotsController,
    MallplatformSellerRefundrequestsSnapshotsController,
    MallplatformAdministratorRefundrequestsSnapshotsController,
    MallplatformProductsReviewsController,
    MallplatformCustomerOrderitemsReviewController,
    MallplatformCustomerReviewsController,
    MallplatformCustomerReviewsSnapshotsController,
    MallplatformAdministratorReviewsSnapshotsController,
    MallplatformAdministratorReviewsnapshotsController,
    MallplatformSellerProductsSnapshotsController,
    MallplatformAdministratorProductsSnapshotsController,
    MallplatformSellerProductsSnapshotsImagesController,
    MallplatformAdministratorProductsSnapshotsImagesController,
    MallplatformSellerProductsSnapshotsVariantsController,
    MallplatformAdministratorProductsSnapshotsVariantsController,
    MallplatformSellerSeller_profilesSnapshotsController,
    MallplatformAdministratorSeller_profilesSnapshotsController,
    MallplatformCustomerOrder_itemsSnapshotsController,
    MallplatformSellerOrder_itemsSnapshotsController,
    MallplatformAdministratorOrder_itemsSnapshotsController,
    MallplatformCustomerOrder_itemsSnapshotsVariant_optionsController,
    MallplatformSellerOrder_itemsSnapshotsVariant_optionsController,
    MallplatformAdministratorOrder_itemsSnapshotsVariant_optionsController,
    MallplatformAdministratorAdministrator_approval_requestsSnapshotsController,
    MallplatformAdministratorAdministratorapprovalrequestsController,
    MallplatformAdministratorSeller_approval_requestsController,
    MallplatformSellerSeller_approval_requestsController,
    MallplatformSellerProductsImagesReorderController,
    MallplatformAdministratorProductsImagesReorderController,
    MallplatformSellerProduct_variantsAvailabilityController,
    MallplatformAdministratorProduct_variantsAvailabilityController,
    MallplatformSellerProductvariantsSnapshotsController,
    MallplatformAdministratorProductvariantsSnapshotsController,
    MallplatformSellerProductsVariantsInventoryhistoryController,
    MallplatformSellerProductvariantsInventoryrecordsRestockController,
    MallplatformSellerProductvariantsInventoryrecordsAdjustmentController,
    MallplatformCustomerCartsSummaryController,
    MallplatformCustomerCartsCheckout_previewController,
    MallplatformCustomerOrdersHistoryController,
    MallplatformCustomerOrdersHistoryItemsController,
    MallplatformCustomerOrdersShipmentsController,
    MallplatformSellerRefundrequestsApproveController,
    MallplatformSellerStatusController,
  ],
})
export class MyModule {}
