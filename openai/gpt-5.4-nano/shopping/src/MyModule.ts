import { Module } from "@nestjs/common";

import { ShoppingmallAdminAdmin_password_resetsRedeemController } from "./controllers/shoppingMall/admin/admin-password-resets/redeem/ShoppingmallAdminAdmin_password_resetsRedeemController";
import { ShoppingmallAdminAdminCancellation_requestsController } from "./controllers/shoppingMall/admin/admin/cancellation-requests/ShoppingmallAdminAdminCancellation_requestsController";
import { ShoppingmallAdminAdminOrder_itemsController } from "./controllers/shoppingMall/admin/admin/order-items/ShoppingmallAdminAdminOrder_itemsController";
import { ShoppingmallAdminAdminOrdersController } from "./controllers/shoppingMall/admin/admin/orders/ShoppingmallAdminAdminOrdersController";
import { ShoppingmallAdminAdminRefund_requestsController } from "./controllers/shoppingMall/admin/admin/refund-requests/ShoppingmallAdminAdminRefund_requestsController";
import { ShoppingmallAdminAdminShipmentsController } from "./controllers/shoppingMall/admin/admin/shipments/ShoppingmallAdminAdminShipmentsController";
import { ShoppingmallAdminCategoriesController } from "./controllers/shoppingMall/admin/categories/ShoppingmallAdminCategoriesController";
import { ShoppingmallAdminOrdersOrder_itemsController } from "./controllers/shoppingMall/admin/orders/order-items/ShoppingmallAdminOrdersOrder_itemsController";
import { ShoppingmallAdminOrdersOversightController } from "./controllers/shoppingMall/admin/orders/oversight/ShoppingmallAdminOrdersOversightController";
import { ShoppingmallAdminProductsnapshotsController } from "./controllers/shoppingMall/admin/productSnapshots/ShoppingmallAdminProductsnapshotsController";
import { ShoppingmallAdminProductvariantsnapshotsController } from "./controllers/shoppingMall/admin/productVariantSnapshots/ShoppingmallAdminProductvariantsnapshotsController";
import { ShoppingmallAdminReviewsController } from "./controllers/shoppingMall/admin/reviews/ShoppingmallAdminReviewsController";
import { ShoppingmallAdminReviewsSnapshot_indicesController } from "./controllers/shoppingMall/admin/reviews/snapshot-indices/ShoppingmallAdminReviewsSnapshot_indicesController";
import { ShoppingmallAdminSnapshotsController } from "./controllers/shoppingMall/admin/snapshots/ShoppingmallAdminSnapshotsController";
import { ShoppingmallAdminSnapshotsLookup_by_codeController } from "./controllers/shoppingMall/admin/snapshots/lookup-by-code/ShoppingmallAdminSnapshotsLookup_by_codeController";
import { ShoppingmallAdminSnapshotsPartiesController } from "./controllers/shoppingMall/admin/snapshots/parties/ShoppingmallAdminSnapshotsPartiesController";
import { ShoppingmallAdminSnapshotsPayloadsController } from "./controllers/shoppingMall/admin/snapshots/payloads/ShoppingmallAdminSnapshotsPayloadsController";
import { ShoppingmallAuthAdminController } from "./controllers/shoppingMall/auth/admin/ShoppingmallAuthAdminController";
import { ShoppingmallAuthGuestController } from "./controllers/shoppingMall/auth/guest/ShoppingmallAuthGuestController";
import { ShoppingmallAuthMemberController } from "./controllers/shoppingMall/auth/member/ShoppingmallAuthMemberController";
import { ShoppingmallGuestSessionsController } from "./controllers/shoppingMall/guest/sessions/ShoppingmallGuestSessionsController";
import { ShoppingmallMemberAddressesController } from "./controllers/shoppingMall/member/addresses/ShoppingmallMemberAddressesController";
import { ShoppingmallMemberAddresses_defaultController } from "./controllers/shoppingMall/member/addresses/default/ShoppingmallMemberAddresses_defaultController";
import { ShoppingmallMemberAddressesLock_for_checkoutController } from "./controllers/shoppingMall/member/addresses/lock-for-checkout/ShoppingmallMemberAddressesLock_for_checkoutController";
import { ShoppingmallMemberAddressesSnapshotsController } from "./controllers/shoppingMall/member/addresses/snapshots/ShoppingmallMemberAddressesSnapshotsController";
import { ShoppingmallMemberCancellation_requestsController } from "./controllers/shoppingMall/member/cancellation-requests/ShoppingmallMemberCancellation_requestsController";
import { ShoppingmallMemberCartFrom_wishlistsController } from "./controllers/shoppingMall/member/cart/from-wishlists/ShoppingmallMemberCartFrom_wishlistsController";
import { ShoppingmallMemberCartItemsAvailabilityCleanupsController } from "./controllers/shoppingMall/member/cart/items/availability/cleanups/ShoppingmallMemberCartItemsAvailabilityCleanupsController";
import { ShoppingmallMemberCartWarningsController } from "./controllers/shoppingMall/member/cart/warnings/ShoppingmallMemberCartWarningsController";
import { ShoppingmallMemberCartWarningsRefreshController } from "./controllers/shoppingMall/member/cart/warnings/refresh/ShoppingmallMemberCartWarningsRefreshController";
import { ShoppingmallMemberCartsController } from "./controllers/shoppingMall/member/carts/ShoppingmallMemberCartsController";
import { ShoppingmallMemberCartsItemsController } from "./controllers/shoppingMall/member/carts/items/ShoppingmallMemberCartsItemsController";
import { ShoppingmallMemberInventoryrecordsController } from "./controllers/shoppingMall/member/inventoryRecords/ShoppingmallMemberInventoryrecordsController";
import { ShoppingmallMemberMember_email_verificationsRedeemController } from "./controllers/shoppingMall/member/member-email-verifications/redeem/ShoppingmallMemberMember_email_verificationsRedeemController";
import { ShoppingmallMemberMember_password_resetsRedeemController } from "./controllers/shoppingMall/member/member-password-resets/redeem/ShoppingmallMemberMember_password_resetsRedeemController";
import { ShoppingmallMemberOrder_itemsController } from "./controllers/shoppingMall/member/order-items/ShoppingmallMemberOrder_itemsController";
import { ShoppingmallMemberOrder_itemsOversightController } from "./controllers/shoppingMall/member/order-items/oversight/ShoppingmallMemberOrder_itemsOversightController";
import { ShoppingmallMemberOrdersController } from "./controllers/shoppingMall/member/orders/ShoppingmallMemberOrdersController";
import { ShoppingmallMemberOrdersHistoryController } from "./controllers/shoppingMall/member/orders/history/ShoppingmallMemberOrdersHistoryController";
import { ShoppingmallMemberOrdersOrder_itemsStatusController } from "./controllers/shoppingMall/member/orders/order-items/status/ShoppingmallMemberOrdersOrder_itemsStatusController";
import { ShoppingmallMemberPaymentsController } from "./controllers/shoppingMall/member/payments/ShoppingmallMemberPaymentsController";
import { ShoppingmallMemberProductimagesController } from "./controllers/shoppingMall/member/productImages/ShoppingmallMemberProductimagesController";
import { ShoppingmallMemberProductsnapshotsController } from "./controllers/shoppingMall/member/productSnapshots/ShoppingmallMemberProductsnapshotsController";
import { ShoppingmallMemberProductvariantsnapshotsController } from "./controllers/shoppingMall/member/productVariantSnapshots/ShoppingmallMemberProductvariantsnapshotsController";
import { ShoppingmallMemberProductvariantsController } from "./controllers/shoppingMall/member/productVariants/ShoppingmallMemberProductvariantsController";
import { ShoppingmallMemberProductsController } from "./controllers/shoppingMall/member/products/ShoppingmallMemberProductsController";
import { ShoppingmallMemberProductsReviewsController } from "./controllers/shoppingMall/member/products/reviews/ShoppingmallMemberProductsReviewsController";
import { ShoppingmallMemberProfileController } from "./controllers/shoppingMall/member/profile/ShoppingmallMemberProfileController";
import { ShoppingmallMemberRefund_requestsController } from "./controllers/shoppingMall/member/refund-requests/ShoppingmallMemberRefund_requestsController";
import { ShoppingmallMemberReviewsController } from "./controllers/shoppingMall/member/reviews/ShoppingmallMemberReviewsController";
import { ShoppingmallMemberReviewsSnapshot_indicesController } from "./controllers/shoppingMall/member/reviews/snapshot-indices/ShoppingmallMemberReviewsSnapshot_indicesController";
import { ShoppingmallMemberSessionsCurrentController } from "./controllers/shoppingMall/member/sessions/current/logout/ShoppingmallMemberSessionsCurrentController";
import { ShoppingmallMemberSessionsCurrentSwitch_to_memberController } from "./controllers/shoppingMall/member/sessions/current/switch-to-member/ShoppingmallMemberSessionsCurrentSwitch_to_memberController";
import { ShoppingmallMemberShipment_confirmationsController } from "./controllers/shoppingMall/member/shipment-confirmations/ShoppingmallMemberShipment_confirmationsController";
import { ShoppingmallMemberShipmentsController } from "./controllers/shoppingMall/member/shipments/ShoppingmallMemberShipmentsController";
import { ShoppingmallMemberShipmentsConfirmationsController } from "./controllers/shoppingMall/member/shipments/confirmations/ShoppingmallMemberShipmentsConfirmationsController";
import { ShoppingmallMemberShipmentsTrackingController } from "./controllers/shoppingMall/member/shipments/tracking/ShoppingmallMemberShipmentsTrackingController";
import { ShoppingmallMemberSnapshotsController } from "./controllers/shoppingMall/member/snapshots/ShoppingmallMemberSnapshotsController";
import { ShoppingmallMemberSnapshotsLookup_by_codeController } from "./controllers/shoppingMall/member/snapshots/lookup-by-code/ShoppingmallMemberSnapshotsLookup_by_codeController";
import { ShoppingmallMemberSnapshotsPartiesController } from "./controllers/shoppingMall/member/snapshots/parties/ShoppingmallMemberSnapshotsPartiesController";
import { ShoppingmallMemberSnapshotsPayloadsController } from "./controllers/shoppingMall/member/snapshots/payloads/ShoppingmallMemberSnapshotsPayloadsController";
import { ShoppingmallMemberWishlistsController } from "./controllers/shoppingMall/member/wishlists/ShoppingmallMemberWishlistsController";
import { ShoppingmallMemberWishlistsItemsController } from "./controllers/shoppingMall/member/wishlists/items/ShoppingmallMemberWishlistsItemsController";

@Module({
  controllers: [
    ShoppingmallAuthGuestController,
    ShoppingmallAuthMemberController,
    ShoppingmallAuthAdminController,
    ShoppingmallGuestSessionsController,
    ShoppingmallMemberProfileController,
    ShoppingmallMemberSnapshotsController,
    ShoppingmallAdminSnapshotsController,
    ShoppingmallMemberSnapshotsPartiesController,
    ShoppingmallAdminSnapshotsPartiesController,
    ShoppingmallMemberSnapshotsPayloadsController,
    ShoppingmallAdminSnapshotsPayloadsController,
    ShoppingmallAdminCategoriesController,
    ShoppingmallMemberProductsController,
    ShoppingmallMemberProductimagesController,
    ShoppingmallMemberProductvariantsController,
    ShoppingmallMemberInventoryrecordsController,
    ShoppingmallAdminProductsnapshotsController,
    ShoppingmallMemberProductsnapshotsController,
    ShoppingmallAdminProductvariantsnapshotsController,
    ShoppingmallMemberProductvariantsnapshotsController,
    ShoppingmallMemberWishlistsController,
    ShoppingmallMemberWishlistsItemsController,
    ShoppingmallMemberCartsController,
    ShoppingmallMemberCartsItemsController,
    ShoppingmallMemberOrdersController,
    ShoppingmallMemberOrder_itemsController,
    ShoppingmallMemberPaymentsController,
    ShoppingmallMemberShipmentsController,
    ShoppingmallMemberShipment_confirmationsController,
    ShoppingmallMemberCancellation_requestsController,
    ShoppingmallMemberRefund_requestsController,
    ShoppingmallAdminAdminOrdersController,
    ShoppingmallAdminAdminOrder_itemsController,
    ShoppingmallAdminAdminShipmentsController,
    ShoppingmallAdminAdminCancellation_requestsController,
    ShoppingmallAdminAdminRefund_requestsController,
    ShoppingmallMemberReviewsController,
    ShoppingmallAdminReviewsController,
    ShoppingmallMemberReviewsSnapshot_indicesController,
    ShoppingmallAdminReviewsSnapshot_indicesController,
    ShoppingmallMemberAddressesController,
    ShoppingmallMemberAddressesSnapshotsController,
    ShoppingmallMemberSessionsCurrentController,
    ShoppingmallMemberSessionsCurrentSwitch_to_memberController,
    ShoppingmallMemberMember_email_verificationsRedeemController,
    ShoppingmallMemberMember_password_resetsRedeemController,
    ShoppingmallAdminAdmin_password_resetsRedeemController,
    ShoppingmallMemberSnapshotsLookup_by_codeController,
    ShoppingmallAdminSnapshotsLookup_by_codeController,
    ShoppingmallMemberCartWarningsController,
    ShoppingmallMemberCartWarningsRefreshController,
    ShoppingmallMemberCartFrom_wishlistsController,
    ShoppingmallMemberCartItemsAvailabilityCleanupsController,
    ShoppingmallMemberOrdersHistoryController,
    ShoppingmallMemberShipmentsTrackingController,
    ShoppingmallMemberOrder_itemsOversightController,
    ShoppingmallMemberOrdersOrder_itemsStatusController,
    ShoppingmallAdminOrdersOversightController,
    ShoppingmallAdminOrdersOrder_itemsController,
    ShoppingmallMemberShipmentsConfirmationsController,
    ShoppingmallMemberProductsReviewsController,
    ShoppingmallMemberAddresses_defaultController,
    ShoppingmallMemberAddressesLock_for_checkoutController,
  ],
})
export class MyModule {}
