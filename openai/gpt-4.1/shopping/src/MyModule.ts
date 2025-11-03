import { Module } from "@nestjs/common";

import { AuthCustomerController } from "./controllers/auth/customer/AuthCustomerController";
import { AuthCustomerPasswordReset_requestController } from "./controllers/auth/customer/password/reset-request/AuthCustomerPasswordReset_requestController";
import { AuthCustomerPasswordResetController } from "./controllers/auth/customer/password/reset/AuthCustomerPasswordResetController";
import { AuthSellerController } from "./controllers/auth/seller/AuthSellerController";
import { AuthSellerPasswordRequest_resetController } from "./controllers/auth/seller/password/request-reset/AuthSellerPasswordRequest_resetController";
import { AuthSellerPasswordComplete_resetController } from "./controllers/auth/seller/password/complete-reset/AuthSellerPasswordComplete_resetController";
import { AuthAdminController } from "./controllers/auth/admin/AuthAdminController";
import { ShoppingAdminSystemconfigurationsController } from "./controllers/shopping/admin/systemConfigurations/ShoppingAdminSystemconfigurationsController";
import { ShoppingAdminBusinesssettingsController } from "./controllers/shopping/admin/businessSettings/ShoppingAdminBusinesssettingsController";
import { ShoppingAdminStatusenumsController } from "./controllers/shopping/admin/statusEnums/ShoppingAdminStatusenumsController";
import { ShoppingCategorytreesController } from "./controllers/shopping/categoryTrees/ShoppingCategorytreesController";
import { ShoppingAdminCategorytreesController } from "./controllers/shopping/admin/categoryTrees/ShoppingAdminCategorytreesController";
import { ShoppingAdminCategoriesController } from "./controllers/shopping/admin/categories/ShoppingAdminCategoriesController";
import { ShoppingSellerCategoriesController } from "./controllers/shopping/seller/categories/ShoppingSellerCategoriesController";
import { ShoppingCategorytreesCategoriesController } from "./controllers/shopping/categoryTrees/categories/ShoppingCategorytreesCategoriesController";
import { ShoppingAdminCategorytreesCategoriesController } from "./controllers/shopping/admin/categoryTrees/categories/ShoppingAdminCategorytreesCategoriesController";
import { ShoppingAdminSystemlogsController } from "./controllers/shopping/admin/systemLogs/ShoppingAdminSystemlogsController";
import { ShoppingAdminCustomersController } from "./controllers/shopping/admin/customers/ShoppingAdminCustomersController";
import { ShoppingCustomerCustomersController } from "./controllers/shopping/customer/customers/ShoppingCustomerCustomersController";
import { ShoppingCustomerCustomersAddressesController } from "./controllers/shopping/customer/customers/addresses/ShoppingCustomerCustomersAddressesController";
import { ShoppingAdminCustomersAddressesController } from "./controllers/shopping/admin/customers/addresses/ShoppingAdminCustomersAddressesController";
import { ShoppingCustomerCustomersSessionsController } from "./controllers/shopping/customer/customers/sessions/ShoppingCustomerCustomersSessionsController";
import { ShoppingAdminCustomersSessionsController } from "./controllers/shopping/admin/customers/sessions/ShoppingAdminCustomersSessionsController";
import { ShoppingAdminSellersController } from "./controllers/shopping/admin/sellers/ShoppingAdminSellersController";
import { ShoppingSellerSellersController } from "./controllers/shopping/seller/sellers/ShoppingSellerSellersController";
import { ShoppingAdminSellersBusinessinfoController } from "./controllers/shopping/admin/sellers/businessInfo/ShoppingAdminSellersBusinessinfoController";
import { ShoppingSellerSellersBusinessinfoController } from "./controllers/shopping/seller/sellers/businessInfo/ShoppingSellerSellersBusinessinfoController";
import { ShoppingSellerSellersAddressesController } from "./controllers/shopping/seller/sellers/addresses/ShoppingSellerSellersAddressesController";
import { ShoppingAdminSellersAddressesController } from "./controllers/shopping/admin/sellers/addresses/ShoppingAdminSellersAddressesController";
import { ShoppingSellerSellersSessionsController } from "./controllers/shopping/seller/sellers/sessions/ShoppingSellerSellersSessionsController";
import { ShoppingAdminSellersSessionsController } from "./controllers/shopping/admin/sellers/sessions/ShoppingAdminSellersSessionsController";
import { ShoppingAdminAdminsController } from "./controllers/shopping/admin/admins/ShoppingAdminAdminsController";
import { ShoppingAdminAdminsSessionsController } from "./controllers/shopping/admin/admins/sessions/ShoppingAdminAdminsSessionsController";
import { ShoppingAdminUseremailsController } from "./controllers/shopping/admin/userEmails/ShoppingAdminUseremailsController";
import { ShoppingCustomerUseremailsController } from "./controllers/shopping/customer/userEmails/ShoppingCustomerUseremailsController";
import { ShoppingSellerUseremailsController } from "./controllers/shopping/seller/userEmails/ShoppingSellerUseremailsController";
import { ShoppingAdminPasswordresetsController } from "./controllers/shopping/admin/passwordResets/ShoppingAdminPasswordresetsController";
import { ShoppingCustomerPasswordresetsController } from "./controllers/shopping/customer/passwordResets/ShoppingCustomerPasswordresetsController";
import { ShoppingSellerPasswordresetsController } from "./controllers/shopping/seller/passwordResets/ShoppingSellerPasswordresetsController";
import { ShoppingProductsController } from "./controllers/shopping/products/ShoppingProductsController";
import { ShoppingSellerProductsController } from "./controllers/shopping/seller/products/ShoppingSellerProductsController";
import { ShoppingAdminProductsController } from "./controllers/shopping/admin/products/ShoppingAdminProductsController";
import { ShoppingSellerProductsSkusController } from "./controllers/shopping/seller/products/skus/ShoppingSellerProductsSkusController";
import { ShoppingAdminProductsSkusController } from "./controllers/shopping/admin/products/skus/ShoppingAdminProductsSkusController";
import { ShoppingProductsSkusController } from "./controllers/shopping/products/skus/ShoppingProductsSkusController";
import { ShoppingAdminAttributedimensionsController } from "./controllers/shopping/admin/attributeDimensions/ShoppingAdminAttributedimensionsController";
import { ShoppingSellerAttributedimensionsController } from "./controllers/shopping/seller/attributeDimensions/ShoppingSellerAttributedimensionsController";
import { ShoppingAdminAttributedimensionsValuesController } from "./controllers/shopping/admin/attributeDimensions/values/ShoppingAdminAttributedimensionsValuesController";
import { ShoppingSellerAttributedimensionsValuesController } from "./controllers/shopping/seller/attributeDimensions/values/ShoppingSellerAttributedimensionsValuesController";
import { ShoppingAttributedimensionsValuesController } from "./controllers/shopping/attributeDimensions/values/ShoppingAttributedimensionsValuesController";
import { ShoppingProductsImagesController } from "./controllers/shopping/products/images/ShoppingProductsImagesController";
import { ShoppingSellerProductsImagesController } from "./controllers/shopping/seller/products/images/ShoppingSellerProductsImagesController";
import { ShoppingAdminProductsImagesController } from "./controllers/shopping/admin/products/images/ShoppingAdminProductsImagesController";
import { ShoppingCategoriesController } from "./controllers/shopping/categories/ShoppingCategoriesController";
import { ShoppingAdminProducttagsController } from "./controllers/shopping/admin/productTags/ShoppingAdminProducttagsController";
import { ShoppingProducttagsController } from "./controllers/shopping/productTags/ShoppingProducttagsController";
import { ShoppingAdminInventoryController } from "./controllers/shopping/admin/inventory/ShoppingAdminInventoryController";
import { ShoppingSellerInventoryController } from "./controllers/shopping/seller/inventory/ShoppingSellerInventoryController";
import { ShoppingAdminInventoryAdjustmentsController } from "./controllers/shopping/admin/inventory/adjustments/ShoppingAdminInventoryAdjustmentsController";
import { ShoppingSellerInventoryAdjustmentsController } from "./controllers/shopping/seller/inventory/adjustments/ShoppingSellerInventoryAdjustmentsController";
import { ShoppingSellerInventoryAlertsController } from "./controllers/shopping/seller/inventory/alerts/ShoppingSellerInventoryAlertsController";
import { ShoppingAdminInventoryAlertsController } from "./controllers/shopping/admin/inventory/alerts/ShoppingAdminInventoryAlertsController";
import { ShoppingAdminCartsController } from "./controllers/shopping/admin/carts/ShoppingAdminCartsController";
import { ShoppingCustomerCartsController } from "./controllers/shopping/customer/carts/ShoppingCustomerCartsController";
import { ShoppingCustomerCartsItemsController } from "./controllers/shopping/customer/carts/items/ShoppingCustomerCartsItemsController";
import { ShoppingAdminGuestcartsController } from "./controllers/shopping/admin/guestCarts/ShoppingAdminGuestcartsController";
import { ShoppingGuestcartsController } from "./controllers/shopping/guestCarts/ShoppingGuestcartsController";
import { ShoppingGuestcartsItemsController } from "./controllers/shopping/guestCarts/items/ShoppingGuestcartsItemsController";
import { ShoppingCustomerWishlistsController } from "./controllers/shopping/customer/wishlists/ShoppingCustomerWishlistsController";
import { ShoppingCustomerWishlistsItemsController } from "./controllers/shopping/customer/wishlists/items/ShoppingCustomerWishlistsItemsController";
import { ShoppingCustomerOrdersController } from "./controllers/shopping/customer/orders/ShoppingCustomerOrdersController";
import { ShoppingSellerOrdersController } from "./controllers/shopping/seller/orders/ShoppingSellerOrdersController";
import { ShoppingAdminOrdersController } from "./controllers/shopping/admin/orders/ShoppingAdminOrdersController";
import { ShoppingCustomerOrdersLinesController } from "./controllers/shopping/customer/orders/lines/ShoppingCustomerOrdersLinesController";
import { ShoppingAdminOrdersLinesController } from "./controllers/shopping/admin/orders/lines/ShoppingAdminOrdersLinesController";
import { ShoppingAdminOrdersSplitsController } from "./controllers/shopping/admin/orders/splits/ShoppingAdminOrdersSplitsController";
import { ShoppingCustomerOrdersSplitsController } from "./controllers/shopping/customer/orders/splits/ShoppingCustomerOrdersSplitsController";
import { ShoppingSellerOrdersSplitsController } from "./controllers/shopping/seller/orders/splits/ShoppingSellerOrdersSplitsController";
import { ShoppingAdminOrdersStatus_historyController } from "./controllers/shopping/admin/orders/status-history/ShoppingAdminOrdersStatus_historyController";
import { ShoppingSellerOrdersStatus_historyController } from "./controllers/shopping/seller/orders/status-history/ShoppingSellerOrdersStatus_historyController";
import { ShoppingCustomerOrdersStatus_historyController } from "./controllers/shopping/customer/orders/status-history/ShoppingCustomerOrdersStatus_historyController";
import { ShoppingCustomerOrdersPayment_attemptsController } from "./controllers/shopping/customer/orders/payment-attempts/ShoppingCustomerOrdersPayment_attemptsController";
import { ShoppingSellerOrdersPayment_attemptsController } from "./controllers/shopping/seller/orders/payment-attempts/ShoppingSellerOrdersPayment_attemptsController";
import { ShoppingAdminOrdersPayment_attemptsController } from "./controllers/shopping/admin/orders/payment-attempts/ShoppingAdminOrdersPayment_attemptsController";
import { ShoppingCustomerOrdersFulfillmentsController } from "./controllers/shopping/customer/orders/fulfillments/ShoppingCustomerOrdersFulfillmentsController";
import { ShoppingSellerOrdersFulfillmentsController } from "./controllers/shopping/seller/orders/fulfillments/ShoppingSellerOrdersFulfillmentsController";
import { ShoppingAdminOrdersFulfillmentsController } from "./controllers/shopping/admin/orders/fulfillments/ShoppingAdminOrdersFulfillmentsController";
import { ShoppingCustomerOrdersAddressesController } from "./controllers/shopping/customer/orders/addresses/ShoppingCustomerOrdersAddressesController";
import { ShoppingSellerOrdersAddressesController } from "./controllers/shopping/seller/orders/addresses/ShoppingSellerOrdersAddressesController";
import { ShoppingAdminOrdersAddressesController } from "./controllers/shopping/admin/orders/addresses/ShoppingAdminOrdersAddressesController";
import { ShoppingCustomerRefundsController } from "./controllers/shopping/customer/refunds/ShoppingCustomerRefundsController";
import { ShoppingSellerRefundsController } from "./controllers/shopping/seller/refunds/ShoppingSellerRefundsController";
import { ShoppingAdminRefundsController } from "./controllers/shopping/admin/refunds/ShoppingAdminRefundsController";
import { ShoppingCustomerRefundsItemsController } from "./controllers/shopping/customer/refunds/items/ShoppingCustomerRefundsItemsController";
import { ShoppingSellerRefundsItemsController } from "./controllers/shopping/seller/refunds/items/ShoppingSellerRefundsItemsController";
import { ShoppingAdminRefundsItemsController } from "./controllers/shopping/admin/refunds/items/ShoppingAdminRefundsItemsController";
import { ShoppingCustomerRefundsAttachmentsController } from "./controllers/shopping/customer/refunds/attachments/ShoppingCustomerRefundsAttachmentsController";
import { ShoppingAdminRefundsAttachmentsController } from "./controllers/shopping/admin/refunds/attachments/ShoppingAdminRefundsAttachmentsController";
import { ShoppingSellerRefundsAttachmentsController } from "./controllers/shopping/seller/refunds/attachments/ShoppingSellerRefundsAttachmentsController";
import { ShoppingCustomerRefundsStatusesController } from "./controllers/shopping/customer/refunds/statuses/ShoppingCustomerRefundsStatusesController";
import { ShoppingAdminRefundsStatusesController } from "./controllers/shopping/admin/refunds/statuses/ShoppingAdminRefundsStatusesController";
import { ShoppingSellerRefundsStatusesController } from "./controllers/shopping/seller/refunds/statuses/ShoppingSellerRefundsStatusesController";
import { ShoppingCustomerRefundsApprovalsController } from "./controllers/shopping/customer/refunds/approvals/ShoppingCustomerRefundsApprovalsController";
import { ShoppingSellerRefundsApprovalsController } from "./controllers/shopping/seller/refunds/approvals/ShoppingSellerRefundsApprovalsController";
import { ShoppingAdminRefundsApprovalsController } from "./controllers/shopping/admin/refunds/approvals/ShoppingAdminRefundsApprovalsController";
import { ShoppingAdminRefundsOverridesController } from "./controllers/shopping/admin/refunds/overrides/ShoppingAdminRefundsOverridesController";
import { ShoppingAdminShipmentsController } from "./controllers/shopping/admin/shipments/ShoppingAdminShipmentsController";
import { ShoppingSellerShipmentsController } from "./controllers/shopping/seller/shipments/ShoppingSellerShipmentsController";
import { ShoppingShipmentsController } from "./controllers/shopping/shipments/ShoppingShipmentsController";
import { ShoppingAdminShipmentsPackagesController } from "./controllers/shopping/admin/shipments/packages/ShoppingAdminShipmentsPackagesController";
import { ShoppingSellerShipmentsPackagesController } from "./controllers/shopping/seller/shipments/packages/ShoppingSellerShipmentsPackagesController";
import { ShoppingCustomerShipmentsPackagesController } from "./controllers/shopping/customer/shipments/packages/ShoppingCustomerShipmentsPackagesController";
import { ShoppingAdminShipmentsPackagesTrackingsController } from "./controllers/shopping/admin/shipments/packages/trackings/ShoppingAdminShipmentsPackagesTrackingsController";
import { ShoppingSellerShipmentsPackagesTrackingsController } from "./controllers/shopping/seller/shipments/packages/trackings/ShoppingSellerShipmentsPackagesTrackingsController";
import { ShoppingCustomerShipmentsPackagesTrackingsController } from "./controllers/shopping/customer/shipments/packages/trackings/ShoppingCustomerShipmentsPackagesTrackingsController";
import { ShoppingCustomerShipmentsPackagesTrackingsEventsController } from "./controllers/shopping/customer/shipments/packages/trackings/events/ShoppingCustomerShipmentsPackagesTrackingsEventsController";
import { ShoppingSellerShipmentsPackagesTrackingsEventsController } from "./controllers/shopping/seller/shipments/packages/trackings/events/ShoppingSellerShipmentsPackagesTrackingsEventsController";
import { ShoppingAdminShipmentsPackagesTrackingsEventsController } from "./controllers/shopping/admin/shipments/packages/trackings/events/ShoppingAdminShipmentsPackagesTrackingsEventsController";
import { ShoppingAdminReviewsController } from "./controllers/shopping/admin/reviews/ShoppingAdminReviewsController";
import { ShoppingSellerReviewsController } from "./controllers/shopping/seller/reviews/ShoppingSellerReviewsController";
import { ShoppingCustomerReviewsController } from "./controllers/shopping/customer/reviews/ShoppingCustomerReviewsController";
import { ShoppingCustomerReviewsAttachmentsController } from "./controllers/shopping/customer/reviews/attachments/ShoppingCustomerReviewsAttachmentsController";
import { ShoppingAdminReviewsAttachmentsController } from "./controllers/shopping/admin/reviews/attachments/ShoppingAdminReviewsAttachmentsController";
import { ShoppingSellerReviewsAttachmentsController } from "./controllers/shopping/seller/reviews/attachments/ShoppingSellerReviewsAttachmentsController";
import { ShoppingAdminReviewsModerationsController } from "./controllers/shopping/admin/reviews/moderations/ShoppingAdminReviewsModerationsController";
import { ShoppingAdminReviewsAbusereportsController } from "./controllers/shopping/admin/reviews/abuseReports/ShoppingAdminReviewsAbusereportsController";
import { ShoppingCustomerReviewsAbusereportsController } from "./controllers/shopping/customer/reviews/abuseReports/ShoppingCustomerReviewsAbusereportsController";
import { ShoppingSkusReviewaggregatesController } from "./controllers/shopping/skus/reviewAggregates/ShoppingSkusReviewaggregatesController";
import { ShoppingProductsReviewaggregatesController } from "./controllers/shopping/products/reviewAggregates/ShoppingProductsReviewaggregatesController";
import { ShoppingAdminAuditlogsController } from "./controllers/shopping/admin/auditLogs/ShoppingAdminAuditlogsController";
import { ShoppingAdminPlatformannouncementsController } from "./controllers/shopping/admin/platformAnnouncements/ShoppingAdminPlatformannouncementsController";
import { ShoppingPlatformannouncementsController } from "./controllers/shopping/platformAnnouncements/ShoppingPlatformannouncementsController";
import { ShoppingAdminAdminactionlogsController } from "./controllers/shopping/admin/adminActionLogs/ShoppingAdminAdminactionlogsController";
import { ShoppingAdminAdminsuspensionsController } from "./controllers/shopping/admin/adminSuspensions/ShoppingAdminAdminsuspensionsController";
import { ShoppingAdminPolicyviolationsController } from "./controllers/shopping/admin/policyViolations/ShoppingAdminPolicyviolationsController";
import { ShoppingAdminAppealsController } from "./controllers/shopping/admin/appeals/ShoppingAdminAppealsController";
import { ShoppingSellerAppealsController } from "./controllers/shopping/seller/appeals/ShoppingSellerAppealsController";
import { ShoppingCustomerAppealsController } from "./controllers/shopping/customer/appeals/ShoppingCustomerAppealsController";
import { ShoppingAdminBusinesspoliciesController } from "./controllers/shopping/admin/businessPolicies/ShoppingAdminBusinesspoliciesController";
import { ShoppingBusinesspoliciesController } from "./controllers/shopping/businessPolicies/ShoppingBusinesspoliciesController";
import { ShoppingAdminBusinessconstraintsController } from "./controllers/shopping/admin/businessConstraints/ShoppingAdminBusinessconstraintsController";
import { ShoppingAdminFeatureflagsController } from "./controllers/shopping/admin/featureFlags/ShoppingAdminFeatureflagsController";

@Module({
  controllers: [
    AuthCustomerController,
    AuthCustomerPasswordReset_requestController,
    AuthCustomerPasswordResetController,
    AuthSellerController,
    AuthSellerPasswordRequest_resetController,
    AuthSellerPasswordComplete_resetController,
    AuthAdminController,
    ShoppingAdminSystemconfigurationsController,
    ShoppingAdminBusinesssettingsController,
    ShoppingAdminStatusenumsController,
    ShoppingCategorytreesController,
    ShoppingAdminCategorytreesController,
    ShoppingAdminCategoriesController,
    ShoppingSellerCategoriesController,
    ShoppingCategorytreesCategoriesController,
    ShoppingAdminCategorytreesCategoriesController,
    ShoppingAdminSystemlogsController,
    ShoppingAdminCustomersController,
    ShoppingCustomerCustomersController,
    ShoppingCustomerCustomersAddressesController,
    ShoppingAdminCustomersAddressesController,
    ShoppingCustomerCustomersSessionsController,
    ShoppingAdminCustomersSessionsController,
    ShoppingAdminSellersController,
    ShoppingSellerSellersController,
    ShoppingAdminSellersBusinessinfoController,
    ShoppingSellerSellersBusinessinfoController,
    ShoppingSellerSellersAddressesController,
    ShoppingAdminSellersAddressesController,
    ShoppingSellerSellersSessionsController,
    ShoppingAdminSellersSessionsController,
    ShoppingAdminAdminsController,
    ShoppingAdminAdminsSessionsController,
    ShoppingAdminUseremailsController,
    ShoppingCustomerUseremailsController,
    ShoppingSellerUseremailsController,
    ShoppingAdminPasswordresetsController,
    ShoppingCustomerPasswordresetsController,
    ShoppingSellerPasswordresetsController,
    ShoppingProductsController,
    ShoppingSellerProductsController,
    ShoppingAdminProductsController,
    ShoppingSellerProductsSkusController,
    ShoppingAdminProductsSkusController,
    ShoppingProductsSkusController,
    ShoppingAdminAttributedimensionsController,
    ShoppingSellerAttributedimensionsController,
    ShoppingAdminAttributedimensionsValuesController,
    ShoppingSellerAttributedimensionsValuesController,
    ShoppingAttributedimensionsValuesController,
    ShoppingProductsImagesController,
    ShoppingSellerProductsImagesController,
    ShoppingAdminProductsImagesController,
    ShoppingCategoriesController,
    ShoppingAdminProducttagsController,
    ShoppingProducttagsController,
    ShoppingAdminInventoryController,
    ShoppingSellerInventoryController,
    ShoppingAdminInventoryAdjustmentsController,
    ShoppingSellerInventoryAdjustmentsController,
    ShoppingSellerInventoryAlertsController,
    ShoppingAdminInventoryAlertsController,
    ShoppingAdminCartsController,
    ShoppingCustomerCartsController,
    ShoppingCustomerCartsItemsController,
    ShoppingAdminGuestcartsController,
    ShoppingGuestcartsController,
    ShoppingGuestcartsItemsController,
    ShoppingCustomerWishlistsController,
    ShoppingCustomerWishlistsItemsController,
    ShoppingCustomerOrdersController,
    ShoppingSellerOrdersController,
    ShoppingAdminOrdersController,
    ShoppingCustomerOrdersLinesController,
    ShoppingAdminOrdersLinesController,
    ShoppingAdminOrdersSplitsController,
    ShoppingCustomerOrdersSplitsController,
    ShoppingSellerOrdersSplitsController,
    ShoppingAdminOrdersStatus_historyController,
    ShoppingSellerOrdersStatus_historyController,
    ShoppingCustomerOrdersStatus_historyController,
    ShoppingCustomerOrdersPayment_attemptsController,
    ShoppingSellerOrdersPayment_attemptsController,
    ShoppingAdminOrdersPayment_attemptsController,
    ShoppingCustomerOrdersFulfillmentsController,
    ShoppingSellerOrdersFulfillmentsController,
    ShoppingAdminOrdersFulfillmentsController,
    ShoppingCustomerOrdersAddressesController,
    ShoppingSellerOrdersAddressesController,
    ShoppingAdminOrdersAddressesController,
    ShoppingCustomerRefundsController,
    ShoppingSellerRefundsController,
    ShoppingAdminRefundsController,
    ShoppingCustomerRefundsItemsController,
    ShoppingSellerRefundsItemsController,
    ShoppingAdminRefundsItemsController,
    ShoppingCustomerRefundsAttachmentsController,
    ShoppingAdminRefundsAttachmentsController,
    ShoppingSellerRefundsAttachmentsController,
    ShoppingCustomerRefundsStatusesController,
    ShoppingAdminRefundsStatusesController,
    ShoppingSellerRefundsStatusesController,
    ShoppingCustomerRefundsApprovalsController,
    ShoppingSellerRefundsApprovalsController,
    ShoppingAdminRefundsApprovalsController,
    ShoppingAdminRefundsOverridesController,
    ShoppingAdminShipmentsController,
    ShoppingSellerShipmentsController,
    ShoppingShipmentsController,
    ShoppingAdminShipmentsPackagesController,
    ShoppingSellerShipmentsPackagesController,
    ShoppingCustomerShipmentsPackagesController,
    ShoppingAdminShipmentsPackagesTrackingsController,
    ShoppingSellerShipmentsPackagesTrackingsController,
    ShoppingCustomerShipmentsPackagesTrackingsController,
    ShoppingCustomerShipmentsPackagesTrackingsEventsController,
    ShoppingSellerShipmentsPackagesTrackingsEventsController,
    ShoppingAdminShipmentsPackagesTrackingsEventsController,
    ShoppingAdminReviewsController,
    ShoppingSellerReviewsController,
    ShoppingCustomerReviewsController,
    ShoppingCustomerReviewsAttachmentsController,
    ShoppingAdminReviewsAttachmentsController,
    ShoppingSellerReviewsAttachmentsController,
    ShoppingAdminReviewsModerationsController,
    ShoppingAdminReviewsAbusereportsController,
    ShoppingCustomerReviewsAbusereportsController,
    ShoppingSkusReviewaggregatesController,
    ShoppingProductsReviewaggregatesController,
    ShoppingAdminAuditlogsController,
    ShoppingAdminPlatformannouncementsController,
    ShoppingPlatformannouncementsController,
    ShoppingAdminAdminactionlogsController,
    ShoppingAdminAdminsuspensionsController,
    ShoppingAdminPolicyviolationsController,
    ShoppingAdminAppealsController,
    ShoppingSellerAppealsController,
    ShoppingCustomerAppealsController,
    ShoppingAdminBusinesspoliciesController,
    ShoppingBusinesspoliciesController,
    ShoppingAdminBusinessconstraintsController,
    ShoppingAdminFeatureflagsController,
  ],
})
export class MyModule {}
