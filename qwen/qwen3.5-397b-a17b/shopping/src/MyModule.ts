import { Module } from "@nestjs/common";

import { ShoppingmallAdminAdminApproval_requestsController } from "./controllers/shoppingMall/admin/admin/approval-requests/ShoppingmallAdminAdminApproval_requestsController";
import { ShoppingmallAdminAdminAudit_logsController } from "./controllers/shoppingMall/admin/admin/audit-logs/ShoppingmallAdminAdminAudit_logsController";
import { ShoppingmallAdminAdminOrder_item_snapshotsController } from "./controllers/shoppingMall/admin/admin/order-item-snapshots/ShoppingmallAdminAdminOrder_item_snapshotsController";
import { ShoppingmallAdminAdminOrder_item_snapshotsOptionsController } from "./controllers/shoppingMall/admin/admin/order-item-snapshots/options/ShoppingmallAdminAdminOrder_item_snapshotsOptionsController";
import { ShoppingmallAdminAdminOrdersController } from "./controllers/shoppingMall/admin/admin/orders/ShoppingmallAdminAdminOrdersController";
import { ShoppingmallAdminAdminSeller_profile_snapshotsController } from "./controllers/shoppingMall/admin/admin/seller-profile-snapshots/ShoppingmallAdminAdminSeller_profile_snapshotsController";
import { ShoppingmallAdminAdminSellersController } from "./controllers/shoppingMall/admin/admin/sellers/ShoppingmallAdminAdminSellersController";
import { ShoppingmallAdminAdminShipmentsController } from "./controllers/shoppingMall/admin/admin/shipments/ShoppingmallAdminAdminShipmentsController";
import { ShoppingmallAdminAdministratorsController } from "./controllers/shoppingMall/admin/administrators/ShoppingmallAdminAdministratorsController";
import { ShoppingmallAdminApproval_requestsController } from "./controllers/shoppingMall/admin/approval-requests/ShoppingmallAdminApproval_requestsController";
import { ShoppingmallAdminCancellation_requestsController } from "./controllers/shoppingMall/admin/cancellation-requests/ShoppingmallAdminCancellation_requestsController";
import { ShoppingmallAdminCancellation_requestsSnapshotsController } from "./controllers/shoppingMall/admin/cancellation-requests/snapshots/ShoppingmallAdminCancellation_requestsSnapshotsController";
import { ShoppingmallAdminCategoriesController } from "./controllers/shoppingMall/admin/categories/ShoppingmallAdminCategoriesController";
import { ShoppingmallAdminCustomersController } from "./controllers/shoppingMall/admin/customers/ShoppingmallAdminCustomersController";
import { ShoppingmallAdminCustomersAddressesController } from "./controllers/shoppingMall/admin/customers/addresses/ShoppingmallAdminCustomersAddressesController";
import { ShoppingmallAdminCustomersProfileController } from "./controllers/shoppingMall/admin/customers/profile/ShoppingmallAdminCustomersProfileController";
import { ShoppingmallAdminGuestsController } from "./controllers/shoppingMall/admin/guests/ShoppingmallAdminGuestsController";
import { ShoppingmallAdminMembersController } from "./controllers/shoppingMall/admin/members/ShoppingmallAdminMembersController";
import { ShoppingmallAdminPost_purchaseCancellation_requestsController } from "./controllers/shoppingMall/admin/post-purchase/cancellation-requests/ShoppingmallAdminPost_purchaseCancellation_requestsController";
import { ShoppingmallAdminPost_purchaseCancellation_requestsSnapshotsController } from "./controllers/shoppingMall/admin/post-purchase/cancellation-requests/snapshots/ShoppingmallAdminPost_purchaseCancellation_requestsSnapshotsController";
import { ShoppingmallAdminPost_purchaseRefund_requestsController } from "./controllers/shoppingMall/admin/post-purchase/refund-requests/ShoppingmallAdminPost_purchaseRefund_requestsController";
import { ShoppingmallAdminPost_purchaseRefund_requestsSnapshotsController } from "./controllers/shoppingMall/admin/post-purchase/refund-requests/snapshots/ShoppingmallAdminPost_purchaseRefund_requestsSnapshotsController";
import { ShoppingmallAdminProductsController } from "./controllers/shoppingMall/admin/products/ShoppingmallAdminProductsController";
import { ShoppingmallAdminProductsVariantsController } from "./controllers/shoppingMall/admin/products/variants/ShoppingmallAdminProductsVariantsController";
import { ShoppingmallAdminRefund_requestsController } from "./controllers/shoppingMall/admin/refund-requests/ShoppingmallAdminRefund_requestsController";
import { ShoppingmallAdminRefund_requestsSnapshotsController } from "./controllers/shoppingMall/admin/refund-requests/snapshots/ShoppingmallAdminRefund_requestsSnapshotsController";
import { ShoppingmallAdminReviewsSnapshotsController } from "./controllers/shoppingMall/admin/reviews/snapshots/ShoppingmallAdminReviewsSnapshotsController";
import { ShoppingmallAdminSellersController } from "./controllers/shoppingMall/admin/sellers/ShoppingmallAdminSellersController";
import { ShoppingmallAdminSellersProductsController } from "./controllers/shoppingMall/admin/sellers/products/ShoppingmallAdminSellersProductsController";
import { ShoppingmallAdminVariantsInventory_recordsController } from "./controllers/shoppingMall/admin/variants/inventory-records/ShoppingmallAdminVariantsInventory_recordsController";
import { ShoppingmallAuthAdminController } from "./controllers/shoppingMall/auth/admin/ShoppingmallAuthAdminController";
import { ShoppingmallAuthGuestController } from "./controllers/shoppingMall/auth/guest/ShoppingmallAuthGuestController";
import { ShoppingmallAuthMemberController } from "./controllers/shoppingMall/auth/member/ShoppingmallAuthMemberController";
import { ShoppingmallAuthSellerController } from "./controllers/shoppingMall/auth/seller/ShoppingmallAuthSellerController";
import { ShoppingmallAuthSuper_adminController } from "./controllers/shoppingMall/auth/super-admin/ShoppingmallAuthSuper_adminController";
import { ShoppingmallCategoriesController } from "./controllers/shoppingMall/categories/ShoppingmallCategoriesController";
import { ShoppingmallCategoriesChildrenController } from "./controllers/shoppingMall/categories/children/ShoppingmallCategoriesChildrenController";
import { ShoppingmallGuestCategoriesController } from "./controllers/shoppingMall/guest/categories/tree/ShoppingmallGuestCategoriesController";
import { ShoppingmallGuestProductsController } from "./controllers/shoppingMall/guest/products/ShoppingmallGuestProductsController";
import { ShoppingmallGuestSessionsController } from "./controllers/shoppingMall/guest/sessions/ShoppingmallGuestSessionsController";
import { ShoppingmallMemberAddressesController } from "./controllers/shoppingMall/member/addresses/ShoppingmallMemberAddressesController";
import { ShoppingmallMemberAdmin_promotion_requestsController } from "./controllers/shoppingMall/member/admin-promotion-requests/ShoppingmallMemberAdmin_promotion_requestsController";
import { ShoppingmallMemberAdmin_promotion_requestsMineController } from "./controllers/shoppingMall/member/admin-promotion-requests/mine/ShoppingmallMemberAdmin_promotion_requestsMineController";
import { ShoppingmallMemberCancellation_requestsController } from "./controllers/shoppingMall/member/cancellation-requests/ShoppingmallMemberCancellation_requestsController";
import { ShoppingmallMemberCancellation_requestsSnapshotsController } from "./controllers/shoppingMall/member/cancellation-requests/snapshots/ShoppingmallMemberCancellation_requestsSnapshotsController";
import { ShoppingmallMemberCartController } from "./controllers/shoppingMall/member/cart/ShoppingmallMemberCartController";
import { ShoppingmallMemberCartItemsController } from "./controllers/shoppingMall/member/cart/items/ShoppingmallMemberCartItemsController";
import { ShoppingmallMemberDashboardController } from "./controllers/shoppingMall/member/dashboard/ShoppingmallMemberDashboardController";
import { ShoppingmallMemberOrdersController } from "./controllers/shoppingMall/member/orders/ShoppingmallMemberOrdersController";
import { ShoppingmallMemberOrdersItemsController } from "./controllers/shoppingMall/member/orders/items/ShoppingmallMemberOrdersItemsController";
import { ShoppingmallMemberOrdersItemsSnapshotController } from "./controllers/shoppingMall/member/orders/items/snapshot/ShoppingmallMemberOrdersItemsSnapshotController";
import { ShoppingmallMemberOrdersItemsSnapshotOptionsController } from "./controllers/shoppingMall/member/orders/items/snapshot/options/ShoppingmallMemberOrdersItemsSnapshotOptionsController";
import { ShoppingmallMemberOrdersShipmentsController } from "./controllers/shoppingMall/member/orders/shipments/ShoppingmallMemberOrdersShipmentsController";
import { ShoppingmallMemberPost_purchaseCancellation_requestsController } from "./controllers/shoppingMall/member/post-purchase/cancellation-requests/ShoppingmallMemberPost_purchaseCancellation_requestsController";
import { ShoppingmallMemberPost_purchaseCancellation_requestsSnapshotsController } from "./controllers/shoppingMall/member/post-purchase/cancellation-requests/snapshots/ShoppingmallMemberPost_purchaseCancellation_requestsSnapshotsController";
import { ShoppingmallMemberPost_purchaseRefund_requestsController } from "./controllers/shoppingMall/member/post-purchase/refund-requests/ShoppingmallMemberPost_purchaseRefund_requestsController";
import { ShoppingmallMemberPost_purchaseRefund_requestsSnapshotsController } from "./controllers/shoppingMall/member/post-purchase/refund-requests/snapshots/ShoppingmallMemberPost_purchaseRefund_requestsSnapshotsController";
import { ShoppingmallMemberProductsController } from "./controllers/shoppingMall/member/products/ShoppingmallMemberProductsController";
import { ShoppingmallMemberProfileController } from "./controllers/shoppingMall/member/profile/ShoppingmallMemberProfileController";
import { ShoppingmallMemberRefund_requestsController } from "./controllers/shoppingMall/member/refund-requests/ShoppingmallMemberRefund_requestsController";
import { ShoppingmallMemberRefund_requestsSnapshotsController } from "./controllers/shoppingMall/member/refund-requests/snapshots/ShoppingmallMemberRefund_requestsSnapshotsController";
import { ShoppingmallMemberReviewsController } from "./controllers/shoppingMall/member/reviews/ShoppingmallMemberReviewsController";
import { ShoppingmallMemberReviewsSnapshotsController } from "./controllers/shoppingMall/member/reviews/snapshots/ShoppingmallMemberReviewsSnapshotsController";
import { ShoppingmallMemberWishlist_itemsController } from "./controllers/shoppingMall/member/wishlist-items/ShoppingmallMemberWishlist_itemsController";
import { ShoppingmallProductsReviewsController } from "./controllers/shoppingMall/products/reviews/ShoppingmallProductsReviewsController";
import { ShoppingmallReviewsController } from "./controllers/shoppingMall/reviews/ShoppingmallReviewsController";
import { ShoppingmallSeller_profilesController } from "./controllers/shoppingMall/seller-profiles/ShoppingmallSeller_profilesController";
import { ShoppingmallSellerAdmin_promotion_requestsController } from "./controllers/shoppingMall/seller/admin-promotion-requests/ShoppingmallSellerAdmin_promotion_requestsController";
import { ShoppingmallSellerAdmin_promotion_requestsMineController } from "./controllers/shoppingMall/seller/admin-promotion-requests/mine/ShoppingmallSellerAdmin_promotion_requestsMineController";
import { ShoppingmallSellerApproval_requestsController } from "./controllers/shoppingMall/seller/approval-requests/ShoppingmallSellerApproval_requestsController";
import { ShoppingmallSellerCancellation_requestsController } from "./controllers/shoppingMall/seller/cancellation-requests/ShoppingmallSellerCancellation_requestsController";
import { ShoppingmallSellerCancellation_requestsSnapshotsController } from "./controllers/shoppingMall/seller/cancellation-requests/snapshots/ShoppingmallSellerCancellation_requestsSnapshotsController";
import { ShoppingmallSellerDashboardCancellation_refundController } from "./controllers/shoppingMall/seller/dashboard/cancellation-refund/ShoppingmallSellerDashboardCancellation_refundController";
import { ShoppingmallSellerOrdersShipmentsController } from "./controllers/shoppingMall/seller/orders/shipments/ShoppingmallSellerOrdersShipmentsController";
import { ShoppingmallSellerPost_purchaseCancellation_requestsController } from "./controllers/shoppingMall/seller/post-purchase/cancellation-requests/ShoppingmallSellerPost_purchaseCancellation_requestsController";
import { ShoppingmallSellerPost_purchaseCancellation_requestsSnapshotsController } from "./controllers/shoppingMall/seller/post-purchase/cancellation-requests/snapshots/ShoppingmallSellerPost_purchaseCancellation_requestsSnapshotsController";
import { ShoppingmallSellerPost_purchaseRefund_requestsController } from "./controllers/shoppingMall/seller/post-purchase/refund-requests/ShoppingmallSellerPost_purchaseRefund_requestsController";
import { ShoppingmallSellerPost_purchaseRefund_requestsSnapshotsController } from "./controllers/shoppingMall/seller/post-purchase/refund-requests/snapshots/ShoppingmallSellerPost_purchaseRefund_requestsSnapshotsController";
import { ShoppingmallSellerProductsnapshotsVariantsnapshotsController } from "./controllers/shoppingMall/seller/productSnapshots/variantSnapshots/ShoppingmallSellerProductsnapshotsVariantsnapshotsController";
import { ShoppingmallSellerProductsController } from "./controllers/shoppingMall/seller/products/ShoppingmallSellerProductsController";
import { ShoppingmallSellerProductsImagesController } from "./controllers/shoppingMall/seller/products/images/ShoppingmallSellerProductsImagesController";
import { ShoppingmallSellerProductsSnapshotsController } from "./controllers/shoppingMall/seller/products/snapshots/ShoppingmallSellerProductsSnapshotsController";
import { ShoppingmallSellerProductsSnapshotsImagesController } from "./controllers/shoppingMall/seller/products/snapshots/images/ShoppingmallSellerProductsSnapshotsImagesController";
import { ShoppingmallSellerProductsSnapshotsVariant_snapshotsController } from "./controllers/shoppingMall/seller/products/snapshots/variant-snapshots/ShoppingmallSellerProductsSnapshotsVariant_snapshotsController";
import { ShoppingmallSellerProductsVariantsController } from "./controllers/shoppingMall/seller/products/variants/ShoppingmallSellerProductsVariantsController";
import { ShoppingmallSellerProfile_snapshotsController } from "./controllers/shoppingMall/seller/profile-snapshots/ShoppingmallSellerProfile_snapshotsController";
import { ShoppingmallSellerRefund_requestsController } from "./controllers/shoppingMall/seller/refund-requests/ShoppingmallSellerRefund_requestsController";
import { ShoppingmallSellerRefund_requestsSnapshotsController } from "./controllers/shoppingMall/seller/refund-requests/snapshots/ShoppingmallSellerRefund_requestsSnapshotsController";
import { ShoppingmallSellerReviewsSnapshotsController } from "./controllers/shoppingMall/seller/reviews/snapshots/ShoppingmallSellerReviewsSnapshotsController";
import { ShoppingmallSellerSellerOrder_itemsController } from "./controllers/shoppingMall/seller/seller/order-items/ShoppingmallSellerSellerOrder_itemsController";
import { ShoppingmallSellerSellerOrder_itemsSnapshotController } from "./controllers/shoppingMall/seller/seller/order-items/snapshot/ShoppingmallSellerSellerOrder_itemsSnapshotController";
import { ShoppingmallSellerSellerOrder_itemsSnapshotOptionsController } from "./controllers/shoppingMall/seller/seller/order-items/snapshot/options/ShoppingmallSellerSellerOrder_itemsSnapshotOptionsController";
import { ShoppingmallSellerSellerShipmentsController } from "./controllers/shoppingMall/seller/seller/shipments/ShoppingmallSellerSellerShipmentsController";
import { ShoppingmallSellerVariantsController } from "./controllers/shoppingMall/seller/variants/ShoppingmallSellerVariantsController";
import { ShoppingmallSellerVariantsInventory_recordsController } from "./controllers/shoppingMall/seller/variants/inventory-records/ShoppingmallSellerVariantsInventory_recordsController";
import { ShoppingmallSuperadminAdmin_promotion_requestsController } from "./controllers/shoppingMall/superAdmin/admin-promotion-requests/ShoppingmallSuperadminAdmin_promotion_requestsController";
import { ShoppingmallSuperadminAdminAudit_logsController } from "./controllers/shoppingMall/superAdmin/admin/audit-logs/ShoppingmallSuperadminAdminAudit_logsController";
import { ShoppingmallSuperadminAdministratorsController } from "./controllers/shoppingMall/superAdmin/administrators/ShoppingmallSuperadminAdministratorsController";
import { ShoppingmallSuperadminAdminsController } from "./controllers/shoppingMall/superAdmin/admins/ShoppingmallSuperadminAdminsController";
import { ShoppingmallSuperadminSuper_adminAudit_logsController } from "./controllers/shoppingMall/superAdmin/super-admin/audit-logs/ShoppingmallSuperadminSuper_adminAudit_logsController";
import { ShoppingmallSuperadminSuper_adminsController } from "./controllers/shoppingMall/superAdmin/super-admins/ShoppingmallSuperadminSuper_adminsController";

@Module({
  controllers: [
    ShoppingmallAuthGuestController,
    ShoppingmallAuthMemberController,
    ShoppingmallAuthSellerController,
    ShoppingmallAuthAdminController,
    ShoppingmallAuthSuper_adminController,
    ShoppingmallAdminGuestsController,
    ShoppingmallGuestSessionsController,
    ShoppingmallAdminMembersController,
    ShoppingmallAdminSellersController,
    ShoppingmallSuperadminAdminsController,
    ShoppingmallSuperadminSuper_adminsController,
    ShoppingmallAdminAdminAudit_logsController,
    ShoppingmallSuperadminAdminAudit_logsController,
    ShoppingmallSuperadminSuper_adminAudit_logsController,
    ShoppingmallAdminCustomersController,
    ShoppingmallMemberProfileController,
    ShoppingmallAdminCustomersProfileController,
    ShoppingmallMemberAddressesController,
    ShoppingmallAdminCustomersAddressesController,
    ShoppingmallAdminAdminSellersController,
    ShoppingmallSeller_profilesController,
    ShoppingmallSellerApproval_requestsController,
    ShoppingmallAdminAdminApproval_requestsController,
    ShoppingmallAdminApproval_requestsController,
    ShoppingmallSellerProfile_snapshotsController,
    ShoppingmallAdminAdminSeller_profile_snapshotsController,
    ShoppingmallAdminAdministratorsController,
    ShoppingmallSuperadminAdministratorsController,
    ShoppingmallMemberAdmin_promotion_requestsController,
    ShoppingmallSellerAdmin_promotion_requestsController,
    ShoppingmallSuperadminAdmin_promotion_requestsController,
    ShoppingmallCategoriesController,
    ShoppingmallCategoriesChildrenController,
    ShoppingmallAdminCategoriesController,
    ShoppingmallGuestProductsController,
    ShoppingmallMemberProductsController,
    ShoppingmallSellerProductsController,
    ShoppingmallAdminProductsController,
    ShoppingmallAdminSellersProductsController,
    ShoppingmallSellerProductsImagesController,
    ShoppingmallSellerProductsVariantsController,
    ShoppingmallAdminProductsVariantsController,
    ShoppingmallSellerProductsSnapshotsController,
    ShoppingmallSellerProductsnapshotsVariantsnapshotsController,
    ShoppingmallSellerProductsSnapshotsVariant_snapshotsController,
    ShoppingmallSellerProductsSnapshotsImagesController,
    ShoppingmallSellerVariantsController,
    ShoppingmallSellerVariantsInventory_recordsController,
    ShoppingmallAdminVariantsInventory_recordsController,
    ShoppingmallMemberWishlist_itemsController,
    ShoppingmallMemberCartController,
    ShoppingmallMemberCartItemsController,
    ShoppingmallMemberOrdersController,
    ShoppingmallAdminAdminOrdersController,
    ShoppingmallMemberOrdersItemsController,
    ShoppingmallSellerSellerOrder_itemsController,
    ShoppingmallMemberOrdersItemsSnapshotController,
    ShoppingmallMemberOrdersItemsSnapshotOptionsController,
    ShoppingmallSellerSellerOrder_itemsSnapshotController,
    ShoppingmallSellerSellerOrder_itemsSnapshotOptionsController,
    ShoppingmallAdminAdminOrder_item_snapshotsController,
    ShoppingmallAdminAdminOrder_item_snapshotsOptionsController,
    ShoppingmallMemberOrdersShipmentsController,
    ShoppingmallSellerOrdersShipmentsController,
    ShoppingmallSellerSellerShipmentsController,
    ShoppingmallAdminAdminShipmentsController,
    ShoppingmallMemberCancellation_requestsController,
    ShoppingmallSellerCancellation_requestsController,
    ShoppingmallAdminCancellation_requestsController,
    ShoppingmallMemberCancellation_requestsSnapshotsController,
    ShoppingmallSellerCancellation_requestsSnapshotsController,
    ShoppingmallAdminCancellation_requestsSnapshotsController,
    ShoppingmallMemberRefund_requestsController,
    ShoppingmallSellerRefund_requestsController,
    ShoppingmallAdminRefund_requestsController,
    ShoppingmallMemberRefund_requestsSnapshotsController,
    ShoppingmallSellerRefund_requestsSnapshotsController,
    ShoppingmallAdminRefund_requestsSnapshotsController,
    ShoppingmallMemberPost_purchaseCancellation_requestsController,
    ShoppingmallSellerPost_purchaseCancellation_requestsController,
    ShoppingmallAdminPost_purchaseCancellation_requestsController,
    ShoppingmallMemberPost_purchaseCancellation_requestsSnapshotsController,
    ShoppingmallSellerPost_purchaseCancellation_requestsSnapshotsController,
    ShoppingmallAdminPost_purchaseCancellation_requestsSnapshotsController,
    ShoppingmallMemberPost_purchaseRefund_requestsController,
    ShoppingmallSellerPost_purchaseRefund_requestsController,
    ShoppingmallAdminPost_purchaseRefund_requestsController,
    ShoppingmallMemberPost_purchaseRefund_requestsSnapshotsController,
    ShoppingmallSellerPost_purchaseRefund_requestsSnapshotsController,
    ShoppingmallAdminPost_purchaseRefund_requestsSnapshotsController,
    ShoppingmallReviewsController,
    ShoppingmallMemberReviewsController,
    ShoppingmallMemberReviewsSnapshotsController,
    ShoppingmallSellerReviewsSnapshotsController,
    ShoppingmallAdminReviewsSnapshotsController,
    ShoppingmallMemberDashboardController,
    ShoppingmallMemberAdmin_promotion_requestsMineController,
    ShoppingmallSellerAdmin_promotion_requestsMineController,
    ShoppingmallGuestCategoriesController,
    ShoppingmallSellerDashboardCancellation_refundController,
    ShoppingmallProductsReviewsController,
  ],
})
export class MyModule {}
