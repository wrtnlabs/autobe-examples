import { Module } from "@nestjs/common";

import { ShoppingmallAdministratorAdministrative_audit_logsController } from "./controllers/shoppingMall/administrator/administrative-audit-logs/ShoppingmallAdministratorAdministrative_audit_logsController";
import { ShoppingmallAdministratorAdministratorGradesController } from "./controllers/shoppingMall/administrator/administrator/grades/ShoppingmallAdministratorAdministratorGradesController";
import { ShoppingmallAdministratorAdministratorRequestsController } from "./controllers/shoppingMall/administrator/administrator/requests/ShoppingmallAdministratorAdministratorRequestsController";
import { ShoppingmallAdministratorAdministratorsController } from "./controllers/shoppingMall/administrator/administrators/ShoppingmallAdministratorAdministratorsController";
import { ShoppingmallAdministratorAnalyticsSalesController } from "./controllers/shoppingMall/administrator/analytics/sales/ShoppingmallAdministratorAnalyticsSalesController";
import { ShoppingmallAdministratorAudit_logsController } from "./controllers/shoppingMall/administrator/audit-logs/ShoppingmallAdministratorAudit_logsController";
import { ShoppingmallAdministratorAudit_logsSearchController } from "./controllers/shoppingMall/administrator/audit-logs/search/ShoppingmallAdministratorAudit_logsSearchController";
import { ShoppingmallAdministratorBanned_usersController } from "./controllers/shoppingMall/administrator/banned-users/ShoppingmallAdministratorBanned_usersController";
import { ShoppingmallAdministratorBanned_usersCustomersBanController } from "./controllers/shoppingMall/administrator/banned-users/customers/ban/ShoppingmallAdministratorBanned_usersCustomersBanController";
import { ShoppingmallAdministratorBanned_usersCustomersUnbanController } from "./controllers/shoppingMall/administrator/banned-users/customers/unban/ShoppingmallAdministratorBanned_usersCustomersUnbanController";
import { ShoppingmallAdministratorBanned_usersSellersController } from "./controllers/shoppingMall/administrator/banned-users/sellers/ShoppingmallAdministratorBanned_usersSellersController";
import { ShoppingmallAdministratorCustomersController } from "./controllers/shoppingMall/administrator/customers/ShoppingmallAdministratorCustomersController";
import { ShoppingmallAdministratorDashboardController } from "./controllers/shoppingMall/administrator/dashboard/summary/ShoppingmallAdministratorDashboardController";
import { ShoppingmallAdministratorInventoryAudit_logsController } from "./controllers/shoppingMall/administrator/inventory/audit-logs/ShoppingmallAdministratorInventoryAudit_logsController";
import { ShoppingmallAdministratorNotificationdeliveriesController } from "./controllers/shoppingMall/administrator/notificationDeliveries/ShoppingmallAdministratorNotificationdeliveriesController";
import { ShoppingmallAdministratorNotificationlogsController } from "./controllers/shoppingMall/administrator/notificationLogs/ShoppingmallAdministratorNotificationlogsController";
import { ShoppingmallAdministratorNotificationtemplatesController } from "./controllers/shoppingMall/administrator/notificationTemplates/ShoppingmallAdministratorNotificationtemplatesController";
import { ShoppingmallAdministratorNotificationsLogsController } from "./controllers/shoppingMall/administrator/notifications/logs/ShoppingmallAdministratorNotificationsLogsController";
import { ShoppingmallAdministratorNotificationsPreferencesController } from "./controllers/shoppingMall/administrator/notifications/preferences/ShoppingmallAdministratorNotificationsPreferencesController";
import { ShoppingmallAdministratorNotificationsResend_failedController } from "./controllers/shoppingMall/administrator/notifications/resend-failed/ShoppingmallAdministratorNotificationsResend_failedController";
import { ShoppingmallAdministratorNotificationsSendController } from "./controllers/shoppingMall/administrator/notifications/send/ShoppingmallAdministratorNotificationsSendController";
import { ShoppingmallAdministratorNotificationsSummaryController } from "./controllers/shoppingMall/administrator/notifications/summary/ShoppingmallAdministratorNotificationsSummaryController";
import { ShoppingmallAdministratorProductCategoriesController } from "./controllers/shoppingMall/administrator/product/categories/ShoppingmallAdministratorProductCategoriesController";
import { ShoppingmallAdministratorProductCategoriesSubcategoriesController } from "./controllers/shoppingMall/administrator/product/categories/subcategories/ShoppingmallAdministratorProductCategoriesSubcategoriesController";
import { ShoppingmallAdministratorProductcategoriesController } from "./controllers/shoppingMall/administrator/productCategories/ShoppingmallAdministratorProductcategoriesController";
import { ShoppingmallAdministratorProductcategoriesSubcategoriesController } from "./controllers/shoppingMall/administrator/productCategories/subcategories/ShoppingmallAdministratorProductcategoriesSubcategoriesController";
import { ShoppingmallAdministratorProductsnapshotsController } from "./controllers/shoppingMall/administrator/productSnapshots/ShoppingmallAdministratorProductsnapshotsController";
import { ShoppingmallAdministratorProductsubcategoriesController } from "./controllers/shoppingMall/administrator/productSubcategories/ShoppingmallAdministratorProductsubcategoriesController";
import { ShoppingmallAdministratorProductvariantsnapshotsController } from "./controllers/shoppingMall/administrator/productVariantSnapshots/ShoppingmallAdministratorProductvariantsnapshotsController";
import { ShoppingmallAdministratorReviewsModerationController } from "./controllers/shoppingMall/administrator/reviews/moderation/ShoppingmallAdministratorReviewsModerationController";
import { ShoppingmallAdministratorSale_imagesController } from "./controllers/shoppingMall/administrator/sale-images/ShoppingmallAdministratorSale_imagesController";
import { ShoppingmallAdministratorSale_promotionsController } from "./controllers/shoppingMall/administrator/sale-promotions/ShoppingmallAdministratorSale_promotionsController";
import { ShoppingmallAdministratorSale_question_answersController } from "./controllers/shoppingMall/administrator/sale-question-answers/ShoppingmallAdministratorSale_question_answersController";
import { ShoppingmallAdministratorSale_questionsController } from "./controllers/shoppingMall/administrator/sale-questions/ShoppingmallAdministratorSale_questionsController";
import { ShoppingmallAdministratorSale_review_votesController } from "./controllers/shoppingMall/administrator/sale-review-votes/ShoppingmallAdministratorSale_review_votesController";
import { ShoppingmallAdministratorSale_reviewsController } from "./controllers/shoppingMall/administrator/sale-reviews/ShoppingmallAdministratorSale_reviewsController";
import { ShoppingmallAdministratorSale_snapshotsController } from "./controllers/shoppingMall/administrator/sale-snapshots/ShoppingmallAdministratorSale_snapshotsController";
import { ShoppingmallAdministratorSale_specificationsController } from "./controllers/shoppingMall/administrator/sale-specifications/ShoppingmallAdministratorSale_specificationsController";
import { ShoppingmallAdministratorSale_unit_snapshotsController } from "./controllers/shoppingMall/administrator/sale-unit-snapshots/ShoppingmallAdministratorSale_unit_snapshotsController";
import { ShoppingmallAdministratorSale_unitsController } from "./controllers/shoppingMall/administrator/sale-units/ShoppingmallAdministratorSale_unitsController";
import { ShoppingmallAdministratorSale_view_statsController } from "./controllers/shoppingMall/administrator/sale-view-stats/ShoppingmallAdministratorSale_view_statsController";
import { ShoppingmallAdministratorSalesController } from "./controllers/shoppingMall/administrator/sales/ShoppingmallAdministratorSalesController";
import { ShoppingmallAdministratorSalesView_statsController } from "./controllers/shoppingMall/administrator/sales/view-stats/ShoppingmallAdministratorSalesView_statsController";
import { ShoppingmallAdministratorSeller_suspensionsController } from "./controllers/shoppingMall/administrator/seller-suspensions/ShoppingmallAdministratorSeller_suspensionsController";
import { ShoppingmallAdministratorSeller_suspensionsSuspendController } from "./controllers/shoppingMall/administrator/seller-suspensions/suspend/ShoppingmallAdministratorSeller_suspensionsSuspendController";
import { ShoppingmallAdministratorSellerApprovalsController } from "./controllers/shoppingMall/administrator/seller/approvals/ShoppingmallAdministratorSellerApprovalsController";
import { ShoppingmallAdministratorSellerApprovalsApproveController } from "./controllers/shoppingMall/administrator/seller/approvals/approve/ShoppingmallAdministratorSellerApprovalsApproveController";
import { ShoppingmallAdministratorSellersController } from "./controllers/shoppingMall/administrator/sellers/ShoppingmallAdministratorSellersController";
import { ShoppingmallAdministratorShipmentsController } from "./controllers/shoppingMall/administrator/shipments/ShoppingmallAdministratorShipmentsController";
import { ShoppingmallAdministratorShipmentsOrder_itemsController } from "./controllers/shoppingMall/administrator/shipments/order-items/ShoppingmallAdministratorShipmentsOrder_itemsController";
import { ShoppingmallAdministratorShipmentsTrackingsController } from "./controllers/shoppingMall/administrator/shipments/trackings/ShoppingmallAdministratorShipmentsTrackingsController";
import { ShoppingmallAdministratorSnapshotsReportController } from "./controllers/shoppingMall/administrator/snapshots/report/ShoppingmallAdministratorSnapshotsReportController";
import { ShoppingmallAdministratorSystem_settingsController } from "./controllers/shoppingMall/administrator/system-settings/refresh/ShoppingmallAdministratorSystem_settingsController";
import { ShoppingmallAdministratorSystem_versionsChangelogController } from "./controllers/shoppingMall/administrator/system-versions/changelog/ShoppingmallAdministratorSystem_versionsChangelogController";
import { ShoppingmallAdministratorUsernotificationpreferencesController } from "./controllers/shoppingMall/administrator/userNotificationPreferences/ShoppingmallAdministratorUsernotificationpreferencesController";
import { ShoppingmallAdministratorUsernotificationsController } from "./controllers/shoppingMall/administrator/userNotifications/ShoppingmallAdministratorUsernotificationsController";
import { ShoppingmallAuditlogsController } from "./controllers/shoppingMall/auditLogs/ShoppingmallAuditlogsController";
import { ShoppingmallAuthAdministratorController } from "./controllers/shoppingMall/auth/administrator/ShoppingmallAuthAdministratorController";
import { ShoppingmallAuthCustomerController } from "./controllers/shoppingMall/auth/customer/ShoppingmallAuthCustomerController";
import { ShoppingmallAuthSellerController } from "./controllers/shoppingMall/auth/seller/ShoppingmallAuthSellerController";
import { ShoppingmallCancellationrequestsnapshotsController } from "./controllers/shoppingMall/cancellationRequestSnapshots/ShoppingmallCancellationrequestsnapshotsController";
import { ShoppingmallCustomerCancellation_requestsController } from "./controllers/shoppingMall/customer/cancellation-requests/ShoppingmallCustomerCancellation_requestsController";
import { ShoppingmallCustomerEmail_verificationsController } from "./controllers/shoppingMall/customer/email-verifications/ShoppingmallCustomerEmail_verificationsController";
import { ShoppingmallCustomerNotificationsLogsController } from "./controllers/shoppingMall/customer/notifications/logs/ShoppingmallCustomerNotificationsLogsController";
import { ShoppingmallCustomerNotificationsPreferencesController } from "./controllers/shoppingMall/customer/notifications/preferences/ShoppingmallCustomerNotificationsPreferencesController";
import { ShoppingmallCustomerNotificationsResend_failedController } from "./controllers/shoppingMall/customer/notifications/resend-failed/ShoppingmallCustomerNotificationsResend_failedController";
import { ShoppingmallCustomerNotificationsSendController } from "./controllers/shoppingMall/customer/notifications/send/ShoppingmallCustomerNotificationsSendController";
import { ShoppingmallCustomerNotificationsSummaryController } from "./controllers/shoppingMall/customer/notifications/summary/ShoppingmallCustomerNotificationsSummaryController";
import { ShoppingmallCustomerOrder_snapshotsController } from "./controllers/shoppingMall/customer/order-snapshots/ShoppingmallCustomerOrder_snapshotsController";
import { ShoppingmallCustomerOrdersController } from "./controllers/shoppingMall/customer/orders/ShoppingmallCustomerOrdersController";
import { ShoppingmallCustomerOrdersItemsController } from "./controllers/shoppingMall/customer/orders/items/ShoppingmallCustomerOrdersItemsController";
import { ShoppingmallCustomerOrdersItemsCancellation_requestController } from "./controllers/shoppingMall/customer/orders/items/cancellation-request/ShoppingmallCustomerOrdersItemsCancellation_requestController";
import { ShoppingmallCustomerOrdersItemsRefund_requestController } from "./controllers/shoppingMall/customer/orders/items/refund-request/ShoppingmallCustomerOrdersItemsRefund_requestController";
import { ShoppingmallCustomerPassword_resetsController } from "./controllers/shoppingMall/customer/password-resets/ShoppingmallCustomerPassword_resetsController";
import { ShoppingmallCustomerProfileController } from "./controllers/shoppingMall/customer/profile/ShoppingmallCustomerProfileController";
import { ShoppingmallCustomerRefund_requestsController } from "./controllers/shoppingMall/customer/refund-requests/ShoppingmallCustomerRefund_requestsController";
import { ShoppingmallCustomerReviewsController } from "./controllers/shoppingMall/customer/reviews/ShoppingmallCustomerReviewsController";
import { ShoppingmallCustomerSale_favoritesController } from "./controllers/shoppingMall/customer/sale-favorites/ShoppingmallCustomerSale_favoritesController";
import { ShoppingmallCustomerSale_question_answersController } from "./controllers/shoppingMall/customer/sale-question-answers/ShoppingmallCustomerSale_question_answersController";
import { ShoppingmallCustomerSale_questionsController } from "./controllers/shoppingMall/customer/sale-questions/ShoppingmallCustomerSale_questionsController";
import { ShoppingmallCustomerSale_review_votesController } from "./controllers/shoppingMall/customer/sale-review-votes/ShoppingmallCustomerSale_review_votesController";
import { ShoppingmallCustomerSale_reviewsController } from "./controllers/shoppingMall/customer/sale-reviews/ShoppingmallCustomerSale_reviewsController";
import { ShoppingmallCustomerSale_snapshotsController } from "./controllers/shoppingMall/customer/sale-snapshots/ShoppingmallCustomerSale_snapshotsController";
import { ShoppingmallCustomerSale_unit_snapshotsController } from "./controllers/shoppingMall/customer/sale-unit-snapshots/ShoppingmallCustomerSale_unit_snapshotsController";
import { ShoppingmallCustomerSale_unitsController } from "./controllers/shoppingMall/customer/sale-units/ShoppingmallCustomerSale_unitsController";
import { ShoppingmallCustomerSalesController } from "./controllers/shoppingMall/customer/sales/ShoppingmallCustomerSalesController";
import { ShoppingmallCustomerSessionsController } from "./controllers/shoppingMall/customer/sessions/ShoppingmallCustomerSessionsController";
import { ShoppingmallCustomerShipment_confirmationsController } from "./controllers/shoppingMall/customer/shipment-confirmations/ShoppingmallCustomerShipment_confirmationsController";
import { ShoppingmallCustomerShipmentsConfirm_deliveryController } from "./controllers/shoppingMall/customer/shipments/confirm-delivery/ShoppingmallCustomerShipmentsConfirm_deliveryController";
import { ShoppingmallCustomerUsernotificationpreferencesController } from "./controllers/shoppingMall/customer/userNotificationPreferences/ShoppingmallCustomerUsernotificationpreferencesController";
import { ShoppingmallCustomerUsernotificationsController } from "./controllers/shoppingMall/customer/userNotifications/ShoppingmallCustomerUsernotificationsController";
import { ShoppingmallOrderitemsnapshotsController } from "./controllers/shoppingMall/orderItemSnapshots/ShoppingmallOrderitemsnapshotsController";
import { ShoppingmallProductreviewsnapshotsController } from "./controllers/shoppingMall/productReviewSnapshots/ShoppingmallProductreviewsnapshotsController";
import { ShoppingmallProductreviewsController } from "./controllers/shoppingMall/productReviews/ShoppingmallProductreviewsController";
import { ShoppingmallProductsReviewsQueryController } from "./controllers/shoppingMall/products/reviews/query/ShoppingmallProductsReviewsQueryController";
import { ShoppingmallProductsReviewsStatisticsController } from "./controllers/shoppingMall/products/reviews/statistics/ShoppingmallProductsReviewsStatisticsController";
import { ShoppingmallRefundrequestsnapshotsController } from "./controllers/shoppingMall/refundRequestSnapshots/ShoppingmallRefundrequestsnapshotsController";
import { ShoppingmallReviewsnapshotsController } from "./controllers/shoppingMall/reviewSnapshots/ShoppingmallReviewsnapshotsController";
import { ShoppingmallSellerAnalyticsSalesController } from "./controllers/shoppingMall/seller/analytics/sales/ShoppingmallSellerAnalyticsSalesController";
import { ShoppingmallSellerCancellation_requestsController } from "./controllers/shoppingMall/seller/cancellation-requests/ShoppingmallSellerCancellation_requestsController";
import { ShoppingmallSellerCancellation_requestsApprove_rejectController } from "./controllers/shoppingMall/seller/cancellation-requests/approve-reject/ShoppingmallSellerCancellation_requestsApprove_rejectController";
import { ShoppingmallSellerDashboardController } from "./controllers/shoppingMall/seller/dashboard/ShoppingmallSellerDashboardController";
import { ShoppingmallSellerDashboardOrdersItemsController } from "./controllers/shoppingMall/seller/dashboard/orders/items/ShoppingmallSellerDashboardOrdersItemsController";
import { ShoppingmallSellerDashboardOrdersController } from "./controllers/shoppingMall/seller/dashboard/orders/summary/ShoppingmallSellerDashboardOrdersController";
import { ShoppingmallSellerInventorySummaryController } from "./controllers/shoppingMall/seller/inventory/summary/ShoppingmallSellerInventorySummaryController";
import { ShoppingmallSellerNotificationsLogsController } from "./controllers/shoppingMall/seller/notifications/logs/ShoppingmallSellerNotificationsLogsController";
import { ShoppingmallSellerNotificationsPreferencesController } from "./controllers/shoppingMall/seller/notifications/preferences/ShoppingmallSellerNotificationsPreferencesController";
import { ShoppingmallSellerNotificationsResend_failedController } from "./controllers/shoppingMall/seller/notifications/resend-failed/ShoppingmallSellerNotificationsResend_failedController";
import { ShoppingmallSellerNotificationsSendController } from "./controllers/shoppingMall/seller/notifications/send/ShoppingmallSellerNotificationsSendController";
import { ShoppingmallSellerNotificationsSummaryController } from "./controllers/shoppingMall/seller/notifications/summary/ShoppingmallSellerNotificationsSummaryController";
import { ShoppingmallSellerProductvariantsInventoryAdjustController } from "./controllers/shoppingMall/seller/productVariants/inventory/adjust/ShoppingmallSellerProductvariantsInventoryAdjustController";
import { ShoppingmallSellerProductvariantsInventoryhistoriesController } from "./controllers/shoppingMall/seller/productVariants/inventoryHistories/ShoppingmallSellerProductvariantsInventoryhistoriesController";
import { ShoppingmallSellerProductsController } from "./controllers/shoppingMall/seller/products/ShoppingmallSellerProductsController";
import { ShoppingmallSellerProductsImagesController } from "./controllers/shoppingMall/seller/products/images/ShoppingmallSellerProductsImagesController";
import { ShoppingmallSellerProductsVariantsController } from "./controllers/shoppingMall/seller/products/variants/ShoppingmallSellerProductsVariantsController";
import { ShoppingmallSellerRefund_requestsController } from "./controllers/shoppingMall/seller/refund-requests/ShoppingmallSellerRefund_requestsController";
import { ShoppingmallSellerRefund_requestsApprove_rejectController } from "./controllers/shoppingMall/seller/refund-requests/approve-reject/ShoppingmallSellerRefund_requestsApprove_rejectController";
import { ShoppingmallSellerReviewsController } from "./controllers/shoppingMall/seller/reviews/summary/ShoppingmallSellerReviewsController";
import { ShoppingmallSellerSale_imagesController } from "./controllers/shoppingMall/seller/sale-images/ShoppingmallSellerSale_imagesController";
import { ShoppingmallSellerSale_promotionsController } from "./controllers/shoppingMall/seller/sale-promotions/ShoppingmallSellerSale_promotionsController";
import { ShoppingmallSellerSale_question_answersController } from "./controllers/shoppingMall/seller/sale-question-answers/ShoppingmallSellerSale_question_answersController";
import { ShoppingmallSellerSale_review_votesController } from "./controllers/shoppingMall/seller/sale-review-votes/ShoppingmallSellerSale_review_votesController";
import { ShoppingmallSellerSale_snapshotsController } from "./controllers/shoppingMall/seller/sale-snapshots/ShoppingmallSellerSale_snapshotsController";
import { ShoppingmallSellerSale_specificationsController } from "./controllers/shoppingMall/seller/sale-specifications/ShoppingmallSellerSale_specificationsController";
import { ShoppingmallSellerSale_unit_snapshotsController } from "./controllers/shoppingMall/seller/sale-unit-snapshots/ShoppingmallSellerSale_unit_snapshotsController";
import { ShoppingmallSellerSale_unitsController } from "./controllers/shoppingMall/seller/sale-units/ShoppingmallSellerSale_unitsController";
import { ShoppingmallSellerSalesController } from "./controllers/shoppingMall/seller/sales/ShoppingmallSellerSalesController";
import { ShoppingmallSellerSellersController } from "./controllers/shoppingMall/seller/sellers/ShoppingmallSellerSellersController";
import { ShoppingmallSellerShipment_itemsController } from "./controllers/shoppingMall/seller/shipment-items/ShoppingmallSellerShipment_itemsController";
import { ShoppingmallSellerShipmentsController } from "./controllers/shoppingMall/seller/shipments/ShoppingmallSellerShipmentsController";
import { ShoppingmallSellerShipmentsOrder_itemsController } from "./controllers/shoppingMall/seller/shipments/order-items/ShoppingmallSellerShipmentsOrder_itemsController";
import { ShoppingmallSellerShipmentsTrackingController } from "./controllers/shoppingMall/seller/shipments/tracking/ShoppingmallSellerShipmentsTrackingController";
import { ShoppingmallSellerShipmentsTrackingsController } from "./controllers/shoppingMall/seller/shipments/trackings/ShoppingmallSellerShipmentsTrackingsController";
import { ShoppingmallSellerUsernotificationpreferencesController } from "./controllers/shoppingMall/seller/userNotificationPreferences/ShoppingmallSellerUsernotificationpreferencesController";
import { ShoppingmallSellerUsernotificationsController } from "./controllers/shoppingMall/seller/userNotifications/ShoppingmallSellerUsernotificationsController";
import { ShoppingmallSellerprofilesnapshotsController } from "./controllers/shoppingMall/sellerProfileSnapshots/ShoppingmallSellerprofilesnapshotsController";
import { ShoppingmallSystemsettingsController } from "./controllers/shoppingMall/systemSettings/ShoppingmallSystemsettingsController";
import { ShoppingmallSystemversionsController } from "./controllers/shoppingMall/systemVersions/ShoppingmallSystemversionsController";

@Module({
  controllers: [
    ShoppingmallAuthCustomerController,
    ShoppingmallAuthSellerController,
    ShoppingmallAuthAdministratorController,
    ShoppingmallAdministratorCustomersController,
    ShoppingmallCustomerProfileController,
    ShoppingmallCustomerSessionsController,
    ShoppingmallCustomerPassword_resetsController,
    ShoppingmallCustomerEmail_verificationsController,
    ShoppingmallSellerSellersController,
    ShoppingmallAdministratorSellersController,
    ShoppingmallAdministratorAdministratorsController,
    ShoppingmallAdministratorAudit_logsController,
    ShoppingmallSellerprofilesnapshotsController,
    ShoppingmallOrderitemsnapshotsController,
    ShoppingmallReviewsnapshotsController,
    ShoppingmallCancellationrequestsnapshotsController,
    ShoppingmallRefundrequestsnapshotsController,
    ShoppingmallAuditlogsController,
    ShoppingmallSystemsettingsController,
    ShoppingmallSystemversionsController,
    ShoppingmallAdministratorProductcategoriesController,
    ShoppingmallAdministratorProductcategoriesSubcategoriesController,
    ShoppingmallAdministratorProductsubcategoriesController,
    ShoppingmallSellerProductsController,
    ShoppingmallSellerProductsImagesController,
    ShoppingmallSellerProductsVariantsController,
    ShoppingmallAdministratorProductsnapshotsController,
    ShoppingmallAdministratorProductvariantsnapshotsController,
    ShoppingmallCustomerSalesController,
    ShoppingmallSellerSalesController,
    ShoppingmallAdministratorSalesController,
    ShoppingmallCustomerSale_snapshotsController,
    ShoppingmallSellerSale_snapshotsController,
    ShoppingmallAdministratorSale_snapshotsController,
    ShoppingmallCustomerSale_unitsController,
    ShoppingmallSellerSale_unitsController,
    ShoppingmallAdministratorSale_unitsController,
    ShoppingmallCustomerSale_unit_snapshotsController,
    ShoppingmallSellerSale_unit_snapshotsController,
    ShoppingmallAdministratorSale_unit_snapshotsController,
    ShoppingmallSellerSale_imagesController,
    ShoppingmallAdministratorSale_imagesController,
    ShoppingmallSellerSale_specificationsController,
    ShoppingmallAdministratorSale_specificationsController,
    ShoppingmallCustomerSale_reviewsController,
    ShoppingmallAdministratorSale_reviewsController,
    ShoppingmallCustomerSale_review_votesController,
    ShoppingmallSellerSale_review_votesController,
    ShoppingmallAdministratorSale_review_votesController,
    ShoppingmallCustomerSale_questionsController,
    ShoppingmallAdministratorSale_questionsController,
    ShoppingmallCustomerSale_question_answersController,
    ShoppingmallAdministratorSale_question_answersController,
    ShoppingmallSellerSale_question_answersController,
    ShoppingmallCustomerSale_favoritesController,
    ShoppingmallSellerSale_promotionsController,
    ShoppingmallAdministratorSale_promotionsController,
    ShoppingmallAdministratorSale_view_statsController,
    ShoppingmallCustomerOrdersController,
    ShoppingmallCustomerOrdersItemsController,
    ShoppingmallCustomerCancellation_requestsController,
    ShoppingmallSellerCancellation_requestsController,
    ShoppingmallCustomerRefund_requestsController,
    ShoppingmallSellerRefund_requestsController,
    ShoppingmallCustomerOrder_snapshotsController,
    ShoppingmallCustomerReviewsController,
    ShoppingmallSellerShipment_itemsController,
    ShoppingmallSellerShipmentsController,
    ShoppingmallAdministratorShipmentsController,
    ShoppingmallSellerShipmentsOrder_itemsController,
    ShoppingmallAdministratorShipmentsOrder_itemsController,
    ShoppingmallSellerShipmentsTrackingsController,
    ShoppingmallAdministratorShipmentsTrackingsController,
    ShoppingmallCustomerShipment_confirmationsController,
    ShoppingmallProductreviewsController,
    ShoppingmallProductreviewsnapshotsController,
    ShoppingmallSellerProductvariantsInventoryhistoriesController,
    ShoppingmallAdministratorNotificationtemplatesController,
    ShoppingmallCustomerUsernotificationsController,
    ShoppingmallSellerUsernotificationsController,
    ShoppingmallAdministratorUsernotificationsController,
    ShoppingmallAdministratorNotificationdeliveriesController,
    ShoppingmallAdministratorNotificationlogsController,
    ShoppingmallCustomerUsernotificationpreferencesController,
    ShoppingmallSellerUsernotificationpreferencesController,
    ShoppingmallAdministratorUsernotificationpreferencesController,
    ShoppingmallAdministratorAdministratorRequestsController,
    ShoppingmallAdministratorAdministratorGradesController,
    ShoppingmallAdministratorSellerApprovalsController,
    ShoppingmallAdministratorProductCategoriesController,
    ShoppingmallAdministratorProductCategoriesSubcategoriesController,
    ShoppingmallAdministratorBanned_usersController,
    ShoppingmallAdministratorAdministrative_audit_logsController,
    ShoppingmallAdministratorSeller_suspensionsController,
    ShoppingmallAdministratorAudit_logsSearchController,
    ShoppingmallAdministratorSystem_versionsChangelogController,
    ShoppingmallAdministratorSystem_settingsController,
    ShoppingmallAdministratorDashboardController,
    ShoppingmallAdministratorSnapshotsReportController,
    ShoppingmallAdministratorAnalyticsSalesController,
    ShoppingmallSellerAnalyticsSalesController,
    ShoppingmallSellerDashboardController,
    ShoppingmallAdministratorSalesView_statsController,
    ShoppingmallCustomerOrdersItemsCancellation_requestController,
    ShoppingmallSellerCancellation_requestsApprove_rejectController,
    ShoppingmallCustomerOrdersItemsRefund_requestController,
    ShoppingmallSellerRefund_requestsApprove_rejectController,
    ShoppingmallCustomerShipmentsConfirm_deliveryController,
    ShoppingmallSellerDashboardOrdersController,
    ShoppingmallSellerDashboardOrdersItemsController,
    ShoppingmallSellerShipmentsTrackingController,
    ShoppingmallProductsReviewsStatisticsController,
    ShoppingmallProductsReviewsQueryController,
    ShoppingmallAdministratorReviewsModerationController,
    ShoppingmallSellerReviewsController,
    ShoppingmallSellerProductvariantsInventoryAdjustController,
    ShoppingmallSellerInventorySummaryController,
    ShoppingmallAdministratorInventoryAudit_logsController,
    ShoppingmallCustomerNotificationsSendController,
    ShoppingmallSellerNotificationsSendController,
    ShoppingmallAdministratorNotificationsSendController,
    ShoppingmallCustomerNotificationsResend_failedController,
    ShoppingmallSellerNotificationsResend_failedController,
    ShoppingmallAdministratorNotificationsResend_failedController,
    ShoppingmallCustomerNotificationsSummaryController,
    ShoppingmallSellerNotificationsSummaryController,
    ShoppingmallAdministratorNotificationsSummaryController,
    ShoppingmallCustomerNotificationsLogsController,
    ShoppingmallSellerNotificationsLogsController,
    ShoppingmallAdministratorNotificationsLogsController,
    ShoppingmallCustomerNotificationsPreferencesController,
    ShoppingmallSellerNotificationsPreferencesController,
    ShoppingmallAdministratorNotificationsPreferencesController,
    ShoppingmallAdministratorSellerApprovalsApproveController,
    ShoppingmallAdministratorBanned_usersCustomersBanController,
    ShoppingmallAdministratorBanned_usersCustomersUnbanController,
    ShoppingmallAdministratorBanned_usersSellersController,
    ShoppingmallAdministratorSeller_suspensionsSuspendController,
  ],
})
export class MyModule {}
