import { Module } from "@nestjs/common";

import { ShoppingmallAdministratorAdministrative_audit_logsSearchController } from "./controllers/shoppingMall/administrator/administrative-audit-logs/search/ShoppingmallAdministratorAdministrative_audit_logsSearchController";
import { ShoppingmallAdministratorAdministrativeauditlogsController } from "./controllers/shoppingMall/administrator/administrativeAuditLogs/ShoppingmallAdministratorAdministrativeauditlogsController";
import { ShoppingmallAdministratorAdministratorgradesController } from "./controllers/shoppingMall/administrator/administratorGrades/ShoppingmallAdministratorAdministratorgradesController";
import { ShoppingmallAdministratorAdministratorrequestsController } from "./controllers/shoppingMall/administrator/administratorRequests/ShoppingmallAdministratorAdministratorrequestsController";
import { ShoppingmallAdministratorAdministratorsController } from "./controllers/shoppingMall/administrator/administrators/ShoppingmallAdministratorAdministratorsController";
import { ShoppingmallAdministratorAnalyticsSale_promotionsController } from "./controllers/shoppingMall/administrator/analytics/sale-promotions/ShoppingmallAdministratorAnalyticsSale_promotionsController";
import { ShoppingmallAdministratorAnalyticsSale_reviewsController } from "./controllers/shoppingMall/administrator/analytics/sale-reviews/ShoppingmallAdministratorAnalyticsSale_reviewsController";
import { ShoppingmallAdministratorAnalyticsSale_specificationsController } from "./controllers/shoppingMall/administrator/analytics/sale-specifications/ShoppingmallAdministratorAnalyticsSale_specificationsController";
import { ShoppingmallAdministratorAnalyticsSale_view_statsController } from "./controllers/shoppingMall/administrator/analytics/sale-view-stats/ShoppingmallAdministratorAnalyticsSale_view_statsController";
import { ShoppingmallAdministratorAnalyticsSalesController } from "./controllers/shoppingMall/administrator/analytics/sales/ShoppingmallAdministratorAnalyticsSalesController";
import { ShoppingmallAdministratorAuditlogsController } from "./controllers/shoppingMall/administrator/auditLogs/ShoppingmallAdministratorAuditlogsController";
import { ShoppingmallAdministratorAuditlogsStatisticsController } from "./controllers/shoppingMall/administrator/auditLogs/statistics/ShoppingmallAdministratorAuditlogsStatisticsController";
import { ShoppingmallAdministratorBanned_usersCustomersBanController } from "./controllers/shoppingMall/administrator/banned-users/customers/ban/ShoppingmallAdministratorBanned_usersCustomersBanController";
import { ShoppingmallAdministratorBanned_usersCustomersUnbanController } from "./controllers/shoppingMall/administrator/banned-users/customers/unban/ShoppingmallAdministratorBanned_usersCustomersUnbanController";
import { ShoppingmallAdministratorBanned_usersSellersBanController } from "./controllers/shoppingMall/administrator/banned-users/sellers/ban/ShoppingmallAdministratorBanned_usersSellersBanController";
import { ShoppingmallAdministratorBanned_usersSellersUnbanController } from "./controllers/shoppingMall/administrator/banned-users/sellers/unban/ShoppingmallAdministratorBanned_usersSellersUnbanController";
import { ShoppingmallAdministratorBannedusersController } from "./controllers/shoppingMall/administrator/bannedUsers/ShoppingmallAdministratorBannedusersController";
import { ShoppingmallAdministratorCancellation_requestsController } from "./controllers/shoppingMall/administrator/cancellation-requests/ShoppingmallAdministratorCancellation_requestsController";
import { ShoppingmallAdministratorCancellationrequestsnapshotsController } from "./controllers/shoppingMall/administrator/cancellationRequestSnapshots/ShoppingmallAdministratorCancellationrequestsnapshotsController";
import { ShoppingmallAdministratorCancellationrequestsnapshotsHistoryController } from "./controllers/shoppingMall/administrator/cancellationRequestSnapshots/history/ShoppingmallAdministratorCancellationrequestsnapshotsHistoryController";
import { ShoppingmallAdministratorCategoriesController } from "./controllers/shoppingMall/administrator/categories/ShoppingmallAdministratorCategoriesController";
import { ShoppingmallAdministratorCategoriesSubcategoriesController } from "./controllers/shoppingMall/administrator/categories/subcategories/ShoppingmallAdministratorCategoriesSubcategoriesController";
import { ShoppingmallAdministratorCustomersController } from "./controllers/shoppingMall/administrator/customers/ShoppingmallAdministratorCustomersController";
import { ShoppingmallAdministratorEmail_verificationsController } from "./controllers/shoppingMall/administrator/email-verifications/ShoppingmallAdministratorEmail_verificationsController";
import { ShoppingmallAdministratorNotificationdeliveriesController } from "./controllers/shoppingMall/administrator/notificationDeliveries/ShoppingmallAdministratorNotificationdeliveriesController";
import { ShoppingmallAdministratorNotificationlogsController } from "./controllers/shoppingMall/administrator/notificationLogs/ShoppingmallAdministratorNotificationlogsController";
import { ShoppingmallAdministratorNotificationtemplatesController } from "./controllers/shoppingMall/administrator/notificationTemplates/ShoppingmallAdministratorNotificationtemplatesController";
import { ShoppingmallAdministratorNotificationsController } from "./controllers/shoppingMall/administrator/notifications/ShoppingmallAdministratorNotificationsController";
import { ShoppingmallAdministratorNotificationsPreferencesController } from "./controllers/shoppingMall/administrator/notifications/preferences/ShoppingmallAdministratorNotificationsPreferencesController";
import { ShoppingmallAdministratorNotificationsReadController } from "./controllers/shoppingMall/administrator/notifications/read/ShoppingmallAdministratorNotificationsReadController";
import { ShoppingmallAdministratorNotificationsSendController } from "./controllers/shoppingMall/administrator/notifications/send/ShoppingmallAdministratorNotificationsSendController";
import { ShoppingmallAdministratorNotificationsUnread_countController } from "./controllers/shoppingMall/administrator/notifications/unread-count/ShoppingmallAdministratorNotificationsUnread_countController";
import { ShoppingmallAdministratorOrderitemsnapshotsController } from "./controllers/shoppingMall/administrator/orderItemSnapshots/ShoppingmallAdministratorOrderitemsnapshotsController";
import { ShoppingmallAdministratorOrderitemsnapshotsReportsController } from "./controllers/shoppingMall/administrator/orderItemSnapshots/reports/ShoppingmallAdministratorOrderitemsnapshotsReportsController";
import { ShoppingmallAdministratorPassword_resetsController } from "./controllers/shoppingMall/administrator/password-resets/ShoppingmallAdministratorPassword_resetsController";
import { ShoppingmallAdministratorProduct_categoriesController } from "./controllers/shoppingMall/administrator/product-categories/ShoppingmallAdministratorProduct_categoriesController";
import { ShoppingmallAdministratorProduct_categoriesSubcategoriesController } from "./controllers/shoppingMall/administrator/product-categories/subcategories/ShoppingmallAdministratorProduct_categoriesSubcategoriesController";
import { ShoppingmallAdministratorProductcategoriesController } from "./controllers/shoppingMall/administrator/productCategories/ShoppingmallAdministratorProductcategoriesController";
import { ShoppingmallAdministratorProductcategoriesProductsubcategoriesController } from "./controllers/shoppingMall/administrator/productCategories/productSubcategories/ShoppingmallAdministratorProductcategoriesProductsubcategoriesController";
import { ShoppingmallAdministratorRefund_requestsController } from "./controllers/shoppingMall/administrator/refund-requests/ShoppingmallAdministratorRefund_requestsController";
import { ShoppingmallAdministratorRefundrequestsnapshotsController } from "./controllers/shoppingMall/administrator/refundRequestSnapshots/ShoppingmallAdministratorRefundrequestsnapshotsController";
import { ShoppingmallAdministratorRefundrequestsnapshotsHistoryController } from "./controllers/shoppingMall/administrator/refundRequestSnapshots/history/ShoppingmallAdministratorRefundrequestsnapshotsHistoryController";
import { ShoppingmallAdministratorReportsSale_favoritesController } from "./controllers/shoppingMall/administrator/reports/sale-favorites/ShoppingmallAdministratorReportsSale_favoritesController";
import { ShoppingmallAdministratorReportsSale_questionsController } from "./controllers/shoppingMall/administrator/reports/sale-questions/ShoppingmallAdministratorReportsSale_questionsController";
import { ShoppingmallAdministratorRequestsApproveController } from "./controllers/shoppingMall/administrator/requests/approve/ShoppingmallAdministratorRequestsApproveController";
import { ShoppingmallAdministratorReviewsnapshotsController } from "./controllers/shoppingMall/administrator/reviewSnapshots/ShoppingmallAdministratorReviewsnapshotsController";
import { ShoppingmallAdministratorReviewsnapshotsHistoryController } from "./controllers/shoppingMall/administrator/reviewSnapshots/history/ShoppingmallAdministratorReviewsnapshotsHistoryController";
import { ShoppingmallAdministratorSalesSnapshotsController } from "./controllers/shoppingMall/administrator/sales/snapshots/ShoppingmallAdministratorSalesSnapshotsController";
import { ShoppingmallAdministratorSalesUnitsSnapshotsController } from "./controllers/shoppingMall/administrator/sales/units/snapshots/ShoppingmallAdministratorSalesUnitsSnapshotsController";
import { ShoppingmallAdministratorSalesView_statsController } from "./controllers/shoppingMall/administrator/sales/view-stats/ShoppingmallAdministratorSalesView_statsController";
import { ShoppingmallAdministratorSeller_approvalsApproveController } from "./controllers/shoppingMall/administrator/seller-approvals/approve/ShoppingmallAdministratorSeller_approvalsApproveController";
import { ShoppingmallAdministratorSeller_suspensionsController } from "./controllers/shoppingMall/administrator/seller-suspensions/ShoppingmallAdministratorSeller_suspensionsController";
import { ShoppingmallAdministratorSellerapprovalsController } from "./controllers/shoppingMall/administrator/sellerApprovals/ShoppingmallAdministratorSellerapprovalsController";
import { ShoppingmallAdministratorSellerprofilesnapshotsController } from "./controllers/shoppingMall/administrator/sellerProfileSnapshots/ShoppingmallAdministratorSellerprofilesnapshotsController";
import { ShoppingmallAdministratorSellerprofilesnapshotsHistoryController } from "./controllers/shoppingMall/administrator/sellerProfileSnapshots/history/ShoppingmallAdministratorSellerprofilesnapshotsHistoryController";
import { ShoppingmallAdministratorSellersuspensionsController } from "./controllers/shoppingMall/administrator/sellerSuspensions/ShoppingmallAdministratorSellersuspensionsController";
import { ShoppingmallAdministratorSellersController } from "./controllers/shoppingMall/administrator/sellers/ShoppingmallAdministratorSellersController";
import { ShoppingmallAdministratorSessionsController } from "./controllers/shoppingMall/administrator/sessions/ShoppingmallAdministratorSessionsController";
import { ShoppingmallAdministratorSystemsettingsController } from "./controllers/shoppingMall/administrator/systemSettings/ShoppingmallAdministratorSystemsettingsController";
import { ShoppingmallAdministratorSystemsettingsSummaryController } from "./controllers/shoppingMall/administrator/systemSettings/summary/ShoppingmallAdministratorSystemsettingsSummaryController";
import { ShoppingmallAdministratorSystemversionsController } from "./controllers/shoppingMall/administrator/systemVersions/ShoppingmallAdministratorSystemversionsController";
import { ShoppingmallAdministratorSystemversionsHistoryController } from "./controllers/shoppingMall/administrator/systemVersions/history/ShoppingmallAdministratorSystemversionsHistoryController";
import { ShoppingmallAdministratorUsernotificationpreferencesController } from "./controllers/shoppingMall/administrator/userNotificationPreferences/ShoppingmallAdministratorUsernotificationpreferencesController";
import { ShoppingmallAdministratorUsernotificationsController } from "./controllers/shoppingMall/administrator/userNotifications/ShoppingmallAdministratorUsernotificationsController";
import { ShoppingmallAuthAdministratorController } from "./controllers/shoppingMall/auth/administrator/ShoppingmallAuthAdministratorController";
import { ShoppingmallAuthCustomerController } from "./controllers/shoppingMall/auth/customer/ShoppingmallAuthCustomerController";
import { ShoppingmallAuthSellerController } from "./controllers/shoppingMall/auth/seller/ShoppingmallAuthSellerController";
import { ShoppingmallCustomerCancellation_requestsController } from "./controllers/shoppingMall/customer/cancellation-requests/ShoppingmallCustomerCancellation_requestsController";
import { ShoppingmallCustomerCustomerSale_questionsController } from "./controllers/shoppingMall/customer/customer/sale-questions/ShoppingmallCustomerCustomerSale_questionsController";
import { ShoppingmallCustomerCustomersController } from "./controllers/shoppingMall/customer/customers/ShoppingmallCustomerCustomersController";
import { ShoppingmallCustomerEmail_verificationsController } from "./controllers/shoppingMall/customer/email-verifications/ShoppingmallCustomerEmail_verificationsController";
import { ShoppingmallCustomerFavoritesSummaryController } from "./controllers/shoppingMall/customer/favorites/summary/ShoppingmallCustomerFavoritesSummaryController";
import { ShoppingmallCustomerNotificationsController } from "./controllers/shoppingMall/customer/notifications/ShoppingmallCustomerNotificationsController";
import { ShoppingmallCustomerNotificationsPreferencesController } from "./controllers/shoppingMall/customer/notifications/preferences/ShoppingmallCustomerNotificationsPreferencesController";
import { ShoppingmallCustomerNotificationsReadController } from "./controllers/shoppingMall/customer/notifications/read/ShoppingmallCustomerNotificationsReadController";
import { ShoppingmallCustomerNotificationsUnread_countController } from "./controllers/shoppingMall/customer/notifications/unread-count/ShoppingmallCustomerNotificationsUnread_countController";
import { ShoppingmallCustomerOrder_itemsController } from "./controllers/shoppingMall/customer/order-items/ShoppingmallCustomerOrder_itemsController";
import { ShoppingmallCustomerOrder_snapshotsController } from "./controllers/shoppingMall/customer/order-snapshots/ShoppingmallCustomerOrder_snapshotsController";
import { ShoppingmallCustomerOrdersController } from "./controllers/shoppingMall/customer/orders/ShoppingmallCustomerOrdersController";
import { ShoppingmallCustomerOrdersConfirm_deliveryController } from "./controllers/shoppingMall/customer/orders/confirm-delivery/ShoppingmallCustomerOrdersConfirm_deliveryController";
import { ShoppingmallCustomerPassword_resetsController } from "./controllers/shoppingMall/customer/password-resets/ShoppingmallCustomerPassword_resetsController";
import { ShoppingmallCustomerProductreviewsController } from "./controllers/shoppingMall/customer/productReviews/ShoppingmallCustomerProductreviewsController";
import { ShoppingmallCustomerProfileController } from "./controllers/shoppingMall/customer/profile/ShoppingmallCustomerProfileController";
import { ShoppingmallCustomerRefund_requestsController } from "./controllers/shoppingMall/customer/refund-requests/ShoppingmallCustomerRefund_requestsController";
import { ShoppingmallCustomerReviewsController } from "./controllers/shoppingMall/customer/reviews/ShoppingmallCustomerReviewsController";
import { ShoppingmallCustomerSalesFavoritesController } from "./controllers/shoppingMall/customer/sales/favorites/ShoppingmallCustomerSalesFavoritesController";
import { ShoppingmallCustomerSalesQuestionsController } from "./controllers/shoppingMall/customer/sales/questions/ShoppingmallCustomerSalesQuestionsController";
import { ShoppingmallCustomerSalesReview_votesController } from "./controllers/shoppingMall/customer/sales/review-votes/ShoppingmallCustomerSalesReview_votesController";
import { ShoppingmallCustomerSalesReviewsController } from "./controllers/shoppingMall/customer/sales/reviews/ShoppingmallCustomerSalesReviewsController";
import { ShoppingmallCustomerSessionsController } from "./controllers/shoppingMall/customer/sessions/ShoppingmallCustomerSessionsController";
import { ShoppingmallCustomerShipmentconfirmationsController } from "./controllers/shoppingMall/customer/shipmentConfirmations/ShoppingmallCustomerShipmentconfirmationsController";
import { ShoppingmallCustomerShipmentsConfirm_deliveryController } from "./controllers/shoppingMall/customer/shipments/confirm-delivery/ShoppingmallCustomerShipmentsConfirm_deliveryController";
import { ShoppingmallCustomerUsernotificationpreferencesController } from "./controllers/shoppingMall/customer/userNotificationPreferences/ShoppingmallCustomerUsernotificationpreferencesController";
import { ShoppingmallCustomerUsernotificationsController } from "./controllers/shoppingMall/customer/userNotifications/ShoppingmallCustomerUsernotificationsController";
import { ShoppingmallProductreviewsnapshotsController } from "./controllers/shoppingMall/productReviewSnapshots/ShoppingmallProductreviewsnapshotsController";
import { ShoppingmallSalesController } from "./controllers/shoppingMall/sales/ShoppingmallSalesController";
import { ShoppingmallSalesReviewsController } from "./controllers/shoppingMall/sales/reviews/ShoppingmallSalesReviewsController";
import { ShoppingmallSellerAnalyticsSale_questionsController } from "./controllers/shoppingMall/seller/analytics/sale-questions/ShoppingmallSellerAnalyticsSale_questionsController";
import { ShoppingmallSellerCancellation_requestsController } from "./controllers/shoppingMall/seller/cancellation-requests/ShoppingmallSellerCancellation_requestsController";
import { ShoppingmallSellerDashboardController } from "./controllers/shoppingMall/seller/dashboard/ShoppingmallSellerDashboardController";
import { ShoppingmallSellerInventoryAdjustmentsController } from "./controllers/shoppingMall/seller/inventory/adjustments/ShoppingmallSellerInventoryAdjustmentsController";
import { ShoppingmallSellerInventoryHistoriesController } from "./controllers/shoppingMall/seller/inventory/histories/ShoppingmallSellerInventoryHistoriesController";
import { ShoppingmallSellerInventoryhistoriesController } from "./controllers/shoppingMall/seller/inventoryHistories/ShoppingmallSellerInventoryhistoriesController";
import { ShoppingmallSellerNotificationsController } from "./controllers/shoppingMall/seller/notifications/ShoppingmallSellerNotificationsController";
import { ShoppingmallSellerNotificationsPreferencesController } from "./controllers/shoppingMall/seller/notifications/preferences/ShoppingmallSellerNotificationsPreferencesController";
import { ShoppingmallSellerNotificationsReadController } from "./controllers/shoppingMall/seller/notifications/read/ShoppingmallSellerNotificationsReadController";
import { ShoppingmallSellerNotificationsUnread_countController } from "./controllers/shoppingMall/seller/notifications/unread-count/ShoppingmallSellerNotificationsUnread_countController";
import { ShoppingmallSellerProductsController } from "./controllers/shoppingMall/seller/products/ShoppingmallSellerProductsController";
import { ShoppingmallSellerProductsImagesController } from "./controllers/shoppingMall/seller/products/images/ShoppingmallSellerProductsImagesController";
import { ShoppingmallSellerProductsImagesOrderController } from "./controllers/shoppingMall/seller/products/images/order/ShoppingmallSellerProductsImagesOrderController";
import { ShoppingmallSellerProductsSnapshotsController } from "./controllers/shoppingMall/seller/products/snapshots/ShoppingmallSellerProductsSnapshotsController";
import { ShoppingmallSellerProductsVariantsController } from "./controllers/shoppingMall/seller/products/variants/ShoppingmallSellerProductsVariantsController";
import { ShoppingmallSellerProductsVariantsInventoryController } from "./controllers/shoppingMall/seller/products/variants/inventory/ShoppingmallSellerProductsVariantsInventoryController";
import { ShoppingmallSellerProductsVariantsSnapshotsController } from "./controllers/shoppingMall/seller/products/variants/snapshots/ShoppingmallSellerProductsVariantsSnapshotsController";
import { ShoppingmallSellerRefund_requestsController } from "./controllers/shoppingMall/seller/refund-requests/ShoppingmallSellerRefund_requestsController";
import { ShoppingmallSellerRefund_requestsApproveController } from "./controllers/shoppingMall/seller/refund-requests/approve/ShoppingmallSellerRefund_requestsApproveController";
import { ShoppingmallSellerReportsSalesController } from "./controllers/shoppingMall/seller/reports/sales/ShoppingmallSellerReportsSalesController";
import { ShoppingmallSellerSalesController } from "./controllers/shoppingMall/seller/sales/ShoppingmallSellerSalesController";
import { ShoppingmallSellerSalesImagesController } from "./controllers/shoppingMall/seller/sales/images/ShoppingmallSellerSalesImagesController";
import { ShoppingmallSellerSalesPromotionsController } from "./controllers/shoppingMall/seller/sales/promotions/ShoppingmallSellerSalesPromotionsController";
import { ShoppingmallSellerSalesQuestion_answersController } from "./controllers/shoppingMall/seller/sales/question-answers/ShoppingmallSellerSalesQuestion_answersController";
import { ShoppingmallSellerSalesQuestionsController } from "./controllers/shoppingMall/seller/sales/questions/ShoppingmallSellerSalesQuestionsController";
import { ShoppingmallSellerSalesQuestionsBulk_updateController } from "./controllers/shoppingMall/seller/sales/questions/bulk-update/ShoppingmallSellerSalesQuestionsBulk_updateController";
import { ShoppingmallSellerSalesReview_votesController } from "./controllers/shoppingMall/seller/sales/review-votes/ShoppingmallSellerSalesReview_votesController";
import { ShoppingmallSellerSalesSnapshotsController } from "./controllers/shoppingMall/seller/sales/snapshots/ShoppingmallSellerSalesSnapshotsController";
import { ShoppingmallSellerSalesUnitsController } from "./controllers/shoppingMall/seller/sales/units/ShoppingmallSellerSalesUnitsController";
import { ShoppingmallSellerSalesUnitsSnapshotsController } from "./controllers/shoppingMall/seller/sales/units/snapshots/ShoppingmallSellerSalesUnitsSnapshotsController";
import { ShoppingmallSellerSalesView_statsController } from "./controllers/shoppingMall/seller/sales/view-stats/ShoppingmallSellerSalesView_statsController";
import { ShoppingmallSellerSellersController } from "./controllers/shoppingMall/seller/sellers/ShoppingmallSellerSellersController";
import { ShoppingmallSellerShipment_itemsController } from "./controllers/shoppingMall/seller/shipment-items/ShoppingmallSellerShipment_itemsController";
import { ShoppingmallSellerShipmentorderitemsController } from "./controllers/shoppingMall/seller/shipmentOrderItems/ShoppingmallSellerShipmentorderitemsController";
import { ShoppingmallSellerShipmenttrackingsController } from "./controllers/shoppingMall/seller/shipmentTrackings/ShoppingmallSellerShipmenttrackingsController";
import { ShoppingmallSellerShipmentsController } from "./controllers/shoppingMall/seller/shipments/ShoppingmallSellerShipmentsController";
import { ShoppingmallSellerShipmentsTrackingController } from "./controllers/shoppingMall/seller/shipments/tracking/ShoppingmallSellerShipmentsTrackingController";
import { ShoppingmallSellerUsernotificationpreferencesController } from "./controllers/shoppingMall/seller/userNotificationPreferences/ShoppingmallSellerUsernotificationpreferencesController";
import { ShoppingmallSellerUsernotificationsController } from "./controllers/shoppingMall/seller/userNotifications/ShoppingmallSellerUsernotificationsController";

@Module({
  controllers: [
    ShoppingmallAuthCustomerController,
    ShoppingmallAuthSellerController,
    ShoppingmallAuthAdministratorController,
    ShoppingmallCustomerCustomersController,
    ShoppingmallAdministratorCustomersController,
    ShoppingmallCustomerProfileController,
    ShoppingmallCustomerSessionsController,
    ShoppingmallAdministratorSessionsController,
    ShoppingmallCustomerPassword_resetsController,
    ShoppingmallAdministratorPassword_resetsController,
    ShoppingmallCustomerEmail_verificationsController,
    ShoppingmallAdministratorEmail_verificationsController,
    ShoppingmallSellerSellersController,
    ShoppingmallAdministratorSellersController,
    ShoppingmallAdministratorAdministratorsController,
    ShoppingmallAdministratorSellerprofilesnapshotsController,
    ShoppingmallAdministratorOrderitemsnapshotsController,
    ShoppingmallAdministratorReviewsnapshotsController,
    ShoppingmallAdministratorCancellationrequestsnapshotsController,
    ShoppingmallAdministratorRefundrequestsnapshotsController,
    ShoppingmallAdministratorAuditlogsController,
    ShoppingmallAdministratorSystemsettingsController,
    ShoppingmallAdministratorSystemversionsController,
    ShoppingmallAdministratorCategoriesController,
    ShoppingmallAdministratorCategoriesSubcategoriesController,
    ShoppingmallAdministratorProduct_categoriesController,
    ShoppingmallAdministratorProduct_categoriesSubcategoriesController,
    ShoppingmallSellerProductsController,
    ShoppingmallSellerProductsImagesController,
    ShoppingmallSellerProductsVariantsController,
    ShoppingmallSellerProductsSnapshotsController,
    ShoppingmallSellerProductsVariantsSnapshotsController,
    ShoppingmallSalesController,
    ShoppingmallSellerSalesController,
    ShoppingmallSellerSalesSnapshotsController,
    ShoppingmallAdministratorSalesSnapshotsController,
    ShoppingmallSellerSalesUnitsController,
    ShoppingmallSellerSalesUnitsSnapshotsController,
    ShoppingmallAdministratorSalesUnitsSnapshotsController,
    ShoppingmallSellerSalesImagesController,
    ShoppingmallSellerSalesPromotionsController,
    ShoppingmallSalesReviewsController,
    ShoppingmallCustomerSalesReviewsController,
    ShoppingmallCustomerSalesReview_votesController,
    ShoppingmallSellerSalesReview_votesController,
    ShoppingmallCustomerSalesQuestionsController,
    ShoppingmallSellerSalesQuestion_answersController,
    ShoppingmallCustomerSalesFavoritesController,
    ShoppingmallSellerSalesView_statsController,
    ShoppingmallAdministratorSalesView_statsController,
    ShoppingmallCustomerOrdersController,
    ShoppingmallCustomerOrder_itemsController,
    ShoppingmallCustomerCancellation_requestsController,
    ShoppingmallSellerCancellation_requestsController,
    ShoppingmallAdministratorCancellation_requestsController,
    ShoppingmallCustomerRefund_requestsController,
    ShoppingmallSellerRefund_requestsController,
    ShoppingmallAdministratorRefund_requestsController,
    ShoppingmallSellerShipment_itemsController,
    ShoppingmallCustomerOrder_snapshotsController,
    ShoppingmallCustomerReviewsController,
    ShoppingmallSellerShipmentsController,
    ShoppingmallSellerShipmentorderitemsController,
    ShoppingmallSellerShipmenttrackingsController,
    ShoppingmallCustomerShipmentconfirmationsController,
    ShoppingmallCustomerProductreviewsController,
    ShoppingmallProductreviewsnapshotsController,
    ShoppingmallSellerInventoryhistoriesController,
    ShoppingmallAdministratorNotificationtemplatesController,
    ShoppingmallCustomerUsernotificationsController,
    ShoppingmallSellerUsernotificationsController,
    ShoppingmallAdministratorUsernotificationsController,
    ShoppingmallAdministratorNotificationdeliveriesController,
    ShoppingmallAdministratorNotificationlogsController,
    ShoppingmallCustomerUsernotificationpreferencesController,
    ShoppingmallSellerUsernotificationpreferencesController,
    ShoppingmallAdministratorUsernotificationpreferencesController,
    ShoppingmallAdministratorAdministratorrequestsController,
    ShoppingmallAdministratorAdministratorgradesController,
    ShoppingmallAdministratorSellerapprovalsController,
    ShoppingmallAdministratorProductcategoriesController,
    ShoppingmallAdministratorProductcategoriesProductsubcategoriesController,
    ShoppingmallAdministratorBannedusersController,
    ShoppingmallAdministratorAdministrativeauditlogsController,
    ShoppingmallAdministratorSellersuspensionsController,
    ShoppingmallAdministratorAuditlogsStatisticsController,
    ShoppingmallAdministratorSystemversionsHistoryController,
    ShoppingmallAdministratorSystemsettingsSummaryController,
    ShoppingmallAdministratorCancellationrequestsnapshotsHistoryController,
    ShoppingmallAdministratorRefundrequestsnapshotsHistoryController,
    ShoppingmallAdministratorOrderitemsnapshotsReportsController,
    ShoppingmallAdministratorSellerprofilesnapshotsHistoryController,
    ShoppingmallAdministratorReviewsnapshotsHistoryController,
    ShoppingmallSellerProductsImagesOrderController,
    ShoppingmallSellerProductsVariantsInventoryController,
    ShoppingmallAdministratorAnalyticsSalesController,
    ShoppingmallSellerDashboardController,
    ShoppingmallCustomerFavoritesSummaryController,
    ShoppingmallAdministratorAnalyticsSale_view_statsController,
    ShoppingmallAdministratorReportsSale_questionsController,
    ShoppingmallSellerAnalyticsSale_questionsController,
    ShoppingmallAdministratorAnalyticsSale_reviewsController,
    ShoppingmallAdministratorAnalyticsSale_promotionsController,
    ShoppingmallSellerSalesQuestionsController,
    ShoppingmallSellerSalesQuestionsBulk_updateController,
    ShoppingmallAdministratorReportsSale_favoritesController,
    ShoppingmallSellerReportsSalesController,
    ShoppingmallAdministratorAnalyticsSale_specificationsController,
    ShoppingmallCustomerCustomerSale_questionsController,
    ShoppingmallSellerRefund_requestsApproveController,
    ShoppingmallCustomerOrdersConfirm_deliveryController,
    ShoppingmallCustomerShipmentsConfirm_deliveryController,
    ShoppingmallSellerShipmentsTrackingController,
    ShoppingmallSellerInventoryAdjustmentsController,
    ShoppingmallSellerInventoryHistoriesController,
    ShoppingmallCustomerNotificationsController,
    ShoppingmallSellerNotificationsController,
    ShoppingmallAdministratorNotificationsController,
    ShoppingmallCustomerNotificationsReadController,
    ShoppingmallSellerNotificationsReadController,
    ShoppingmallAdministratorNotificationsReadController,
    ShoppingmallAdministratorNotificationsSendController,
    ShoppingmallCustomerNotificationsUnread_countController,
    ShoppingmallSellerNotificationsUnread_countController,
    ShoppingmallAdministratorNotificationsUnread_countController,
    ShoppingmallCustomerNotificationsPreferencesController,
    ShoppingmallSellerNotificationsPreferencesController,
    ShoppingmallAdministratorNotificationsPreferencesController,
    ShoppingmallAdministratorRequestsApproveController,
    ShoppingmallAdministratorSeller_approvalsApproveController,
    ShoppingmallAdministratorSeller_suspensionsController,
    ShoppingmallAdministratorBanned_usersCustomersBanController,
    ShoppingmallAdministratorBanned_usersCustomersUnbanController,
    ShoppingmallAdministratorBanned_usersSellersBanController,
    ShoppingmallAdministratorBanned_usersSellersUnbanController,
    ShoppingmallAdministratorAdministrative_audit_logsSearchController,
  ],
})
export class MyModule {}
