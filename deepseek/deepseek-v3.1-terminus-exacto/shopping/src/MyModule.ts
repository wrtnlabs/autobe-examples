import { Module } from "@nestjs/common";

import { EcommerceAdministratorAdmin_category_operationsController } from "./controllers/ecommerce/administrator/admin-category-operations/EcommerceAdministratorAdmin_category_operationsController";
import { EcommerceAdministratorAdmin_seller_suspensionsController } from "./controllers/ecommerce/administrator/admin-seller-suspensions/EcommerceAdministratorAdmin_seller_suspensionsController";
import { EcommerceAdministratorAdmin_user_bansController } from "./controllers/ecommerce/administrator/admin-user-bans/EcommerceAdministratorAdmin_user_bansController";
import { EcommerceAdministratorAdmin_user_bansAdministrator_bansController } from "./controllers/ecommerce/administrator/admin-user-bans/administrator-bans/EcommerceAdministratorAdmin_user_bansAdministrator_bansController";
import { EcommerceAdministratorAdmin_user_bansBanned_sellersController } from "./controllers/ecommerce/administrator/admin-user-bans/banned-sellers/EcommerceAdministratorAdmin_user_bansBanned_sellersController";
import { EcommerceAdministratorAdmin_user_bansCustomer_bansController } from "./controllers/ecommerce/administrator/admin-user-bans/customer-bans/EcommerceAdministratorAdmin_user_bansCustomer_bansController";
import { EcommerceAdministratorAdministrative_actionsController } from "./controllers/ecommerce/administrator/administrative-actions/EcommerceAdministratorAdministrative_actionsController";
import { EcommerceAdministratorAdministrative_actionsCustomer_targetsController } from "./controllers/ecommerce/administrator/administrative-actions/customer-targets/EcommerceAdministratorAdministrative_actionsCustomer_targetsController";
import { EcommerceAdministratorAdministrative_actionsOrder_actionController } from "./controllers/ecommerce/administrator/administrative-actions/order-action/EcommerceAdministratorAdministrative_actionsOrder_actionController";
import { EcommerceAdministratorAdministrative_actionsProduct_actionsController } from "./controllers/ecommerce/administrator/administrative-actions/product-actions/EcommerceAdministratorAdministrative_actionsProduct_actionsController";
import { EcommerceAdministratorAdministrative_actionsSeller_targetsController } from "./controllers/ecommerce/administrator/administrative-actions/seller-targets/EcommerceAdministratorAdministrative_actionsSeller_targetsController";
import { EcommerceAdministratorAdministrator_promotionsController } from "./controllers/ecommerce/administrator/administrator-promotions/EcommerceAdministratorAdministrator_promotionsController";
import { EcommerceAdministratorAnalysisController } from "./controllers/ecommerce/administrator/analysis/EcommerceAdministratorAnalysisController";
import { EcommerceAdministratorAnalyticsOrdersController } from "./controllers/ecommerce/administrator/analytics/orders/EcommerceAdministratorAnalyticsOrdersController";
import { EcommerceAdministratorAnalyticsProductsController } from "./controllers/ecommerce/administrator/analytics/products/EcommerceAdministratorAnalyticsProductsController";
import { EcommerceAdministratorAudit_logsController } from "./controllers/ecommerce/administrator/audit-logs/EcommerceAdministratorAudit_logsController";
import { EcommerceAdministratorBusiness_rulesController } from "./controllers/ecommerce/administrator/business-rules/EcommerceAdministratorBusiness_rulesController";
import { EcommerceAdministratorCache_configurationsController } from "./controllers/ecommerce/administrator/cache-configurations/EcommerceAdministratorCache_configurationsController";
import { EcommerceAdministratorCache_configurationsParameter_definitionsController } from "./controllers/ecommerce/administrator/cache-configurations/parameter-definitions/EcommerceAdministratorCache_configurationsParameter_definitionsController";
import { EcommerceAdministratorCache_configurationsParametersController } from "./controllers/ecommerce/administrator/cache-configurations/parameters/EcommerceAdministratorCache_configurationsParametersController";
import { EcommerceAdministratorCache_configurationsSnapshotsController } from "./controllers/ecommerce/administrator/cache-configurations/snapshots/EcommerceAdministratorCache_configurationsSnapshotsController";
import { EcommerceAdministratorCancellation_requestsController } from "./controllers/ecommerce/administrator/cancellation-requests/EcommerceAdministratorCancellation_requestsController";
import { EcommerceAdministratorCancellation_requestsResponsesController } from "./controllers/ecommerce/administrator/cancellation-requests/responses/EcommerceAdministratorCancellation_requestsResponsesController";
import { EcommerceAdministratorCancellation_requestsSnapshotsController } from "./controllers/ecommerce/administrator/cancellation-requests/snapshots/EcommerceAdministratorCancellation_requestsSnapshotsController";
import { EcommerceAdministratorCancellation_requestsStatusesController } from "./controllers/ecommerce/administrator/cancellation-requests/statuses/EcommerceAdministratorCancellation_requestsStatusesController";
import { EcommerceAdministratorCategoriesController } from "./controllers/ecommerce/administrator/categories/EcommerceAdministratorCategoriesController";
import { EcommerceAdministratorCategory_analyticsController } from "./controllers/ecommerce/administrator/category-analytics/EcommerceAdministratorCategory_analyticsController";
import { EcommerceAdministratorCategory_usageController } from "./controllers/ecommerce/administrator/category-usage/EcommerceAdministratorCategory_usageController";
import { EcommerceAdministratorData_snapshotsController } from "./controllers/ecommerce/administrator/data-snapshots/EcommerceAdministratorData_snapshotsController";
import { EcommerceAdministratorDb_migrationsController } from "./controllers/ecommerce/administrator/db-migrations/EcommerceAdministratorDb_migrationsController";
import { EcommerceAdministratorEmail_templatesController } from "./controllers/ecommerce/administrator/email-templates/EcommerceAdministratorEmail_templatesController";
import { EcommerceAdministratorMetadata_registriesController } from "./controllers/ecommerce/administrator/metadata-registries/EcommerceAdministratorMetadata_registriesController";
import { EcommerceAdministratorMetadata_registriesField_definitionsController } from "./controllers/ecommerce/administrator/metadata-registries/field-definitions/EcommerceAdministratorMetadata_registriesField_definitionsController";
import { EcommerceAdministratorMetadata_registriesRelationshipsController } from "./controllers/ecommerce/administrator/metadata-registries/relationships/EcommerceAdministratorMetadata_registriesRelationshipsController";
import { EcommerceAdministratorMetadata_registriesRelationshipsSubtypesController } from "./controllers/ecommerce/administrator/metadata-registries/relationships/subtypes/EcommerceAdministratorMetadata_registriesRelationshipsSubtypesController";
import { EcommerceAdministratorModerationReviewsController } from "./controllers/ecommerce/administrator/moderation/reviews/EcommerceAdministratorModerationReviewsController";
import { EcommerceAdministratorModification_inventory_restorationsController } from "./controllers/ecommerce/administrator/modification-inventory-restorations/EcommerceAdministratorModification_inventory_restorationsController";
import { EcommerceAdministratorModificationsOverviewController } from "./controllers/ecommerce/administrator/modifications/overview/EcommerceAdministratorModificationsOverviewController";
import { EcommerceAdministratorPlatform_eventsController } from "./controllers/ecommerce/administrator/platform-events/EcommerceAdministratorPlatform_eventsController";
import { EcommerceAdministratorPlatform_eventsSubtypesController } from "./controllers/ecommerce/administrator/platform-events/subtypes/EcommerceAdministratorPlatform_eventsSubtypesController";
import { EcommerceAdministratorPlatform_metricsController } from "./controllers/ecommerce/administrator/platform-metrics/EcommerceAdministratorPlatform_metricsController";
import { EcommerceAdministratorPlatform_monitoring_metricsController } from "./controllers/ecommerce/administrator/platform-monitoring-metrics/EcommerceAdministratorPlatform_monitoring_metricsController";
import { EcommerceAdministratorPlatform_oversightController } from "./controllers/ecommerce/administrator/platform-oversight/EcommerceAdministratorPlatform_oversightController";
import { EcommerceAdministratorPlatform_oversightsController } from "./controllers/ecommerce/administrator/platform-oversights/EcommerceAdministratorPlatform_oversightsController";
import { EcommerceAdministratorRefund_requestsController } from "./controllers/ecommerce/administrator/refund-requests/EcommerceAdministratorRefund_requestsController";
import { EcommerceAdministratorRefund_requestsResponsesController } from "./controllers/ecommerce/administrator/refund-requests/responses/EcommerceAdministratorRefund_requestsResponsesController";
import { EcommerceAdministratorRefund_requestsSnapshotsController } from "./controllers/ecommerce/administrator/refund-requests/snapshots/EcommerceAdministratorRefund_requestsSnapshotsController";
import { EcommerceAdministratorRefund_requestsStatusesController } from "./controllers/ecommerce/administrator/refund-requests/statuses/EcommerceAdministratorRefund_requestsStatusesController";
import { EcommerceAdministratorReportsReviewsController } from "./controllers/ecommerce/administrator/reports/reviews/EcommerceAdministratorReportsReviewsController";
import { EcommerceAdministratorReview_flagsController } from "./controllers/ecommerce/administrator/review-flags/EcommerceAdministratorReview_flagsController";
import { EcommerceAdministratorReview_moderation_actionsController } from "./controllers/ecommerce/administrator/review-moderation-actions/EcommerceAdministratorReview_moderation_actionsController";
import { EcommerceAdministratorReview_report_snapshotsController } from "./controllers/ecommerce/administrator/review-report-snapshots/EcommerceAdministratorReview_report_snapshotsController";
import { EcommerceAdministratorReview_report_statusesController } from "./controllers/ecommerce/administrator/review-report-statuses/EcommerceAdministratorReview_report_statusesController";
import { EcommerceAdministratorReview_reportsController } from "./controllers/ecommerce/administrator/review-reports/EcommerceAdministratorReview_reportsController";
import { EcommerceAdministratorReviewsEditsController } from "./controllers/ecommerce/administrator/reviews/edits/EcommerceAdministratorReviewsEditsController";
import { EcommerceAdministratorSeller_approval_queuesController } from "./controllers/ecommerce/administrator/seller-approval-queues/EcommerceAdministratorSeller_approval_queuesController";
import { EcommerceAdministratorSeller_approval_responsesController } from "./controllers/ecommerce/administrator/seller-approval-responses/EcommerceAdministratorSeller_approval_responsesController";
import { EcommerceAdministratorSeller_approvalsController } from "./controllers/ecommerce/administrator/seller-approvals/EcommerceAdministratorSeller_approvalsController";
import { EcommerceAdministratorSeller_performanceController } from "./controllers/ecommerce/administrator/seller-performance/EcommerceAdministratorSeller_performanceController";
import { EcommerceAdministratorSystem_metricsController } from "./controllers/ecommerce/administrator/system-metrics/EcommerceAdministratorSystem_metricsController";
import { EcommerceAdministratorSystem_settingsController } from "./controllers/ecommerce/administrator/system-settings/EcommerceAdministratorSystem_settingsController";
import { EcommerceAdministratorUser_managementController } from "./controllers/ecommerce/administrator/user-management/EcommerceAdministratorUser_managementController";
import { EcommerceAdministratorsController } from "./controllers/ecommerce/administrators/EcommerceAdministratorsController";
import { EcommerceAnalyticsProductsReviewsController } from "./controllers/ecommerce/analytics/products/reviews/EcommerceAnalyticsProductsReviewsController";
import { EcommerceAuthAdministratorController } from "./controllers/ecommerce/auth/administrator/EcommerceAuthAdministratorController";
import { EcommerceAuthCustomerController } from "./controllers/ecommerce/auth/customer/EcommerceAuthCustomerController";
import { EcommerceAuthSellerController } from "./controllers/ecommerce/auth/seller/EcommerceAuthSellerController";
import { EcommerceAuthSuperadministratorController } from "./controllers/ecommerce/auth/superAdministrator/EcommerceAuthSuperadministratorController";
import { EcommerceCategoriesController } from "./controllers/ecommerce/categories/EcommerceCategoriesController";
import { EcommerceCustomerAddresses_defaultController } from "./controllers/ecommerce/customer/addresses/default/EcommerceCustomerAddresses_defaultController";
import { EcommerceCustomerCancellation_requestsController } from "./controllers/ecommerce/customer/cancellation-requests/EcommerceCustomerCancellation_requestsController";
import { EcommerceCustomerCancellation_requestsResponsesController } from "./controllers/ecommerce/customer/cancellation-requests/responses/EcommerceCustomerCancellation_requestsResponsesController";
import { EcommerceCustomerCancellation_requestsStatusesController } from "./controllers/ecommerce/customer/cancellation-requests/statuses/EcommerceCustomerCancellation_requestsStatusesController";
import { EcommerceCustomerCartsController } from "./controllers/ecommerce/customer/carts/EcommerceCustomerCartsController";
import { EcommerceCustomerCartsItemsController } from "./controllers/ecommerce/customer/carts/items/EcommerceCustomerCartsItemsController";
import { EcommerceCustomerCheckoutController } from "./controllers/ecommerce/customer/checkout/EcommerceCustomerCheckoutController";
import { EcommerceCustomerOrdersController } from "./controllers/ecommerce/customer/orders/EcommerceCustomerOrdersController";
import { EcommerceCustomerOrdersHistoryController } from "./controllers/ecommerce/customer/orders/history/EcommerceCustomerOrdersHistoryController";
import { EcommerceCustomerOrdersItemsController } from "./controllers/ecommerce/customer/orders/items/EcommerceCustomerOrdersItemsController";
import { EcommerceCustomerOrdersPayment_transactionsController } from "./controllers/ecommerce/customer/orders/payment-transactions/EcommerceCustomerOrdersPayment_transactionsController";
import { EcommerceCustomerProductsReviewsController } from "./controllers/ecommerce/customer/products/reviews/EcommerceCustomerProductsReviewsController";
import { EcommerceCustomerProductsReviewsReportsController } from "./controllers/ecommerce/customer/products/reviews/reports/EcommerceCustomerProductsReviewsReportsController";
import { EcommerceCustomerProfileController } from "./controllers/ecommerce/customer/profile/EcommerceCustomerProfileController";
import { EcommerceCustomerRefund_requestsController } from "./controllers/ecommerce/customer/refund-requests/EcommerceCustomerRefund_requestsController";
import { EcommerceCustomerRefund_requestsResponsesController } from "./controllers/ecommerce/customer/refund-requests/responses/EcommerceCustomerRefund_requestsResponsesController";
import { EcommerceCustomerRefund_requestsStatusesController } from "./controllers/ecommerce/customer/refund-requests/statuses/EcommerceCustomerRefund_requestsStatusesController";
import { EcommerceCustomerReviewsHelpful_votesController } from "./controllers/ecommerce/customer/reviews/helpful-votes/EcommerceCustomerReviewsHelpful_votesController";
import { EcommerceCustomerSessionsController } from "./controllers/ecommerce/customer/sessions/EcommerceCustomerSessionsController";
import { EcommerceCustomerShipmentsDelivery_confirmController } from "./controllers/ecommerce/customer/shipments/delivery-confirm/EcommerceCustomerShipmentsDelivery_confirmController";
import { EcommerceCustomerShipmentsDelivery_confirmationsController } from "./controllers/ecommerce/customer/shipments/delivery-confirmations/EcommerceCustomerShipmentsDelivery_confirmationsController";
import { EcommerceCustomerStatisticsController } from "./controllers/ecommerce/customer/statistics/EcommerceCustomerStatisticsController";
import { EcommerceCustomerTrackingController } from "./controllers/ecommerce/customer/tracking/EcommerceCustomerTrackingController";
import { EcommerceCustomersController } from "./controllers/ecommerce/customers/EcommerceCustomersController";
import { EcommerceOrdersItemsPurchase_snapshotsController } from "./controllers/ecommerce/orders/items/purchase-snapshots/EcommerceOrdersItemsPurchase_snapshotsController";
import { EcommerceOrdersItemsStatus_historiesController } from "./controllers/ecommerce/orders/items/status-histories/EcommerceOrdersItemsStatus_historiesController";
import { EcommerceProductsController } from "./controllers/ecommerce/products/EcommerceProductsController";
import { EcommerceProductsImagesController } from "./controllers/ecommerce/products/images/EcommerceProductsImagesController";
import { EcommerceProductsReviewsController } from "./controllers/ecommerce/products/reviews/EcommerceProductsReviewsController";
import { EcommerceProductsVariantsController } from "./controllers/ecommerce/products/variants/EcommerceProductsVariantsController";
import { EcommerceController } from "./controllers/ecommerce/search/EcommerceController";
import { EcommerceSellerAnalyticsReviewsController } from "./controllers/ecommerce/seller/analytics/reviews/EcommerceSellerAnalyticsReviewsController";
import { EcommerceSellerAnalyticsSalesController } from "./controllers/ecommerce/seller/analytics/sales/EcommerceSellerAnalyticsSalesController";
import { EcommerceSellerCancellation_requestsController } from "./controllers/ecommerce/seller/cancellation-requests/EcommerceSellerCancellation_requestsController";
import { EcommerceSellerCancellation_requestsPendingController } from "./controllers/ecommerce/seller/cancellation-requests/pending/EcommerceSellerCancellation_requestsPendingController";
import { EcommerceSellerCancellation_requestsResponsesController } from "./controllers/ecommerce/seller/cancellation-requests/responses/EcommerceSellerCancellation_requestsResponsesController";
import { EcommerceSellerCancellation_requestsStatusesController } from "./controllers/ecommerce/seller/cancellation-requests/statuses/EcommerceSellerCancellation_requestsStatusesController";
import { EcommerceSellerController } from "./controllers/ecommerce/seller/dashboard/EcommerceSellerController";
import { EcommerceSellerModification_inventory_restorationsController } from "./controllers/ecommerce/seller/modification-inventory-restorations/EcommerceSellerModification_inventory_restorationsController";
import { EcommerceSellerOrder_itemsController } from "./controllers/ecommerce/seller/order-items/EcommerceSellerOrder_itemsController";
import { EcommerceSellerOrdersShipmentsController } from "./controllers/ecommerce/seller/orders/shipments/EcommerceSellerOrdersShipmentsController";
import { EcommerceSellerPendingController } from "./controllers/ecommerce/seller/pending/EcommerceSellerPendingController";
import { EcommerceSellerProductsController } from "./controllers/ecommerce/seller/products/EcommerceSellerProductsController";
import { EcommerceSellerProductsImagesController } from "./controllers/ecommerce/seller/products/images/EcommerceSellerProductsImagesController";
import { EcommerceSellerProductsReviewsSeller_responseController } from "./controllers/ecommerce/seller/products/reviews/seller-response/EcommerceSellerProductsReviewsSeller_responseController";
import { EcommerceSellerProductsSnapshotsController } from "./controllers/ecommerce/seller/products/snapshots/EcommerceSellerProductsSnapshotsController";
import { EcommerceSellerProductsVariantsController } from "./controllers/ecommerce/seller/products/variants/EcommerceSellerProductsVariantsController";
import { EcommerceSellerProductsVariantsInventoryController } from "./controllers/ecommerce/seller/products/variants/inventory/EcommerceSellerProductsVariantsInventoryController";
import { EcommerceSellerProductsVariantsInventorySnapshotsController } from "./controllers/ecommerce/seller/products/variants/inventory/snapshots/EcommerceSellerProductsVariantsInventorySnapshotsController";
import { EcommerceSellerProductsVariantsSnapshotsController } from "./controllers/ecommerce/seller/products/variants/snapshots/EcommerceSellerProductsVariantsSnapshotsController";
import { EcommerceSellerProfileSnapshotsController } from "./controllers/ecommerce/seller/profile/snapshots/EcommerceSellerProfileSnapshotsController";
import { EcommerceSellerRefund_requestsController } from "./controllers/ecommerce/seller/refund-requests/EcommerceSellerRefund_requestsController";
import { EcommerceSellerRefund_requestsPendingController } from "./controllers/ecommerce/seller/refund-requests/pending/EcommerceSellerRefund_requestsPendingController";
import { EcommerceSellerRefund_requestsResponsesController } from "./controllers/ecommerce/seller/refund-requests/responses/EcommerceSellerRefund_requestsResponsesController";
import { EcommerceSellerRefund_requestsStatusesController } from "./controllers/ecommerce/seller/refund-requests/statuses/EcommerceSellerRefund_requestsStatusesController";
import { EcommerceSellerShipmentsController } from "./controllers/ecommerce/seller/shipments/EcommerceSellerShipmentsController";
import { EcommerceSellersController } from "./controllers/ecommerce/sellers/EcommerceSellersController";
import { EcommerceSuper_administratorsController } from "./controllers/ecommerce/super-administrators/EcommerceSuper_administratorsController";
import { EcommerceSuperadministratorAnalysisController } from "./controllers/ecommerce/superAdministrator/analysis/EcommerceSuperadministratorAnalysisController";
import { EcommerceSuperadministratorAudit_logsController } from "./controllers/ecommerce/superAdministrator/audit-logs/EcommerceSuperadministratorAudit_logsController";
import { EcommerceSuperadministratorBusiness_rulesController } from "./controllers/ecommerce/superAdministrator/business-rules/EcommerceSuperadministratorBusiness_rulesController";
import { EcommerceSuperadministratorCache_configurationsController } from "./controllers/ecommerce/superAdministrator/cache-configurations/EcommerceSuperadministratorCache_configurationsController";
import { EcommerceSuperadministratorCache_configurationsParameter_definitionsController } from "./controllers/ecommerce/superAdministrator/cache-configurations/parameter-definitions/EcommerceSuperadministratorCache_configurationsParameter_definitionsController";
import { EcommerceSuperadministratorCache_configurationsParametersController } from "./controllers/ecommerce/superAdministrator/cache-configurations/parameters/EcommerceSuperadministratorCache_configurationsParametersController";
import { EcommerceSuperadministratorCache_configurationsSnapshotsController } from "./controllers/ecommerce/superAdministrator/cache-configurations/snapshots/EcommerceSuperadministratorCache_configurationsSnapshotsController";
import { EcommerceSuperadministratorCategory_analyticsController } from "./controllers/ecommerce/superAdministrator/category-analytics/EcommerceSuperadministratorCategory_analyticsController";
import { EcommerceSuperadministratorCategory_usageController } from "./controllers/ecommerce/superAdministrator/category-usage/EcommerceSuperadministratorCategory_usageController";
import { EcommerceSuperadministratorData_snapshotsController } from "./controllers/ecommerce/superAdministrator/data-snapshots/EcommerceSuperadministratorData_snapshotsController";
import { EcommerceSuperadministratorDb_migrationsController } from "./controllers/ecommerce/superAdministrator/db-migrations/EcommerceSuperadministratorDb_migrationsController";
import { EcommerceSuperadministratorEmail_templatesController } from "./controllers/ecommerce/superAdministrator/email-templates/EcommerceSuperadministratorEmail_templatesController";
import { EcommerceSuperadministratorMetadata_registriesController } from "./controllers/ecommerce/superAdministrator/metadata-registries/EcommerceSuperadministratorMetadata_registriesController";
import { EcommerceSuperadministratorMetadata_registriesField_definitionsController } from "./controllers/ecommerce/superAdministrator/metadata-registries/field-definitions/EcommerceSuperadministratorMetadata_registriesField_definitionsController";
import { EcommerceSuperadministratorMetadata_registriesRelationshipsController } from "./controllers/ecommerce/superAdministrator/metadata-registries/relationships/EcommerceSuperadministratorMetadata_registriesRelationshipsController";
import { EcommerceSuperadministratorMetadata_registriesRelationshipsSubtypesController } from "./controllers/ecommerce/superAdministrator/metadata-registries/relationships/subtypes/EcommerceSuperadministratorMetadata_registriesRelationshipsSubtypesController";
import { EcommerceSuperadministratorPlatform_eventsController } from "./controllers/ecommerce/superAdministrator/platform-events/EcommerceSuperadministratorPlatform_eventsController";
import { EcommerceSuperadministratorPlatform_eventsSubtypesController } from "./controllers/ecommerce/superAdministrator/platform-events/subtypes/EcommerceSuperadministratorPlatform_eventsSubtypesController";
import { EcommerceSuperadministratorPlatform_metricsController } from "./controllers/ecommerce/superAdministrator/platform-metrics/EcommerceSuperadministratorPlatform_metricsController";
import { EcommerceSuperadministratorPlatform_oversightController } from "./controllers/ecommerce/superAdministrator/platform-oversight/EcommerceSuperadministratorPlatform_oversightController";
import { EcommerceSuperadministratorSeller_approvalsController } from "./controllers/ecommerce/superAdministrator/seller-approvals/EcommerceSuperadministratorSeller_approvalsController";
import { EcommerceSuperadministratorSeller_performanceController } from "./controllers/ecommerce/superAdministrator/seller-performance/EcommerceSuperadministratorSeller_performanceController";
import { EcommerceSuperadministratorSystem_metricsController } from "./controllers/ecommerce/superAdministrator/system-metrics/EcommerceSuperadministratorSystem_metricsController";
import { EcommerceSuperadministratorSystem_settingsController } from "./controllers/ecommerce/superAdministrator/system-settings/EcommerceSuperadministratorSystem_settingsController";
import { EcommerceSuperadministratorUser_managementController } from "./controllers/ecommerce/superAdministrator/user-management/EcommerceSuperadministratorUser_managementController";

@Module({
  controllers: [
    EcommerceAuthCustomerController,
    EcommerceAuthSellerController,
    EcommerceAuthAdministratorController,
    EcommerceAuthSuperadministratorController,
    EcommerceCustomersController,
    EcommerceCustomerProfileController,
    EcommerceCustomerSessionsController,
    EcommerceSellersController,
    EcommerceAdministratorsController,
    EcommerceSuper_administratorsController,
    EcommerceSellerProfileSnapshotsController,
    EcommerceCategoriesController,
    EcommerceAdministratorCategoriesController,
    EcommerceProductsController,
    EcommerceSellerProductsController,
    EcommerceProductsImagesController,
    EcommerceSellerProductsImagesController,
    EcommerceProductsVariantsController,
    EcommerceSellerProductsVariantsController,
    EcommerceSellerProductsVariantsInventoryController,
    EcommerceSellerProductsSnapshotsController,
    EcommerceSellerProductsVariantsSnapshotsController,
    EcommerceSellerProductsVariantsInventorySnapshotsController,
    EcommerceCustomerCartsController,
    EcommerceCustomerCartsItemsController,
    EcommerceCustomerOrdersController,
    EcommerceCustomerOrdersItemsController,
    EcommerceSellerOrdersShipmentsController,
    EcommerceCustomerShipmentsDelivery_confirmationsController,
    EcommerceCustomerOrdersPayment_transactionsController,
    EcommerceOrdersItemsPurchase_snapshotsController,
    EcommerceOrdersItemsStatus_historiesController,
    EcommerceCustomerCancellation_requestsController,
    EcommerceSellerCancellation_requestsController,
    EcommerceAdministratorCancellation_requestsController,
    EcommerceCustomerRefund_requestsController,
    EcommerceSellerRefund_requestsController,
    EcommerceAdministratorRefund_requestsController,
    EcommerceCustomerCancellation_requestsStatusesController,
    EcommerceSellerCancellation_requestsStatusesController,
    EcommerceAdministratorCancellation_requestsStatusesController,
    EcommerceCustomerRefund_requestsStatusesController,
    EcommerceSellerRefund_requestsStatusesController,
    EcommerceAdministratorRefund_requestsStatusesController,
    EcommerceCustomerCancellation_requestsResponsesController,
    EcommerceSellerCancellation_requestsResponsesController,
    EcommerceAdministratorCancellation_requestsResponsesController,
    EcommerceCustomerRefund_requestsResponsesController,
    EcommerceSellerRefund_requestsResponsesController,
    EcommerceAdministratorRefund_requestsResponsesController,
    EcommerceSellerModification_inventory_restorationsController,
    EcommerceAdministratorModification_inventory_restorationsController,
    EcommerceAdministratorCancellation_requestsSnapshotsController,
    EcommerceAdministratorRefund_requestsSnapshotsController,
    EcommerceProductsReviewsController,
    EcommerceCustomerProductsReviewsController,
    EcommerceCustomerReviewsHelpful_votesController,
    EcommerceCustomerProductsReviewsReportsController,
    EcommerceAdministratorReview_reportsController,
    EcommerceAdministratorReview_moderation_actionsController,
    EcommerceSellerProductsReviewsSeller_responseController,
    EcommerceAdministratorReviewsEditsController,
    EcommerceAdministratorReview_flagsController,
    EcommerceAdministratorReview_report_snapshotsController,
    EcommerceAdministratorReview_report_statusesController,
    EcommerceAdministratorAdministrative_actionsController,
    EcommerceAdministratorPlatform_oversightsController,
    EcommerceAdministratorAdministrator_promotionsController,
    EcommerceAdministratorSeller_approval_queuesController,
    EcommerceAdministratorSeller_approval_responsesController,
    EcommerceAdministratorAdmin_category_operationsController,
    EcommerceAdministratorAdmin_user_bansController,
    EcommerceAdministratorAdmin_seller_suspensionsController,
    EcommerceAdministratorPlatform_monitoring_metricsController,
    EcommerceAdministratorAdministrative_actionsCustomer_targetsController,
    EcommerceAdministratorAdministrative_actionsOrder_actionController,
    EcommerceAdministratorAdministrative_actionsProduct_actionsController,
    EcommerceAdministratorAdministrative_actionsSeller_targetsController,
    EcommerceAdministratorAdmin_user_bansCustomer_bansController,
    EcommerceAdministratorAdmin_user_bansBanned_sellersController,
    EcommerceAdministratorAdmin_user_bansAdministrator_bansController,
    EcommerceAdministratorSystem_settingsController,
    EcommerceSuperadministratorSystem_settingsController,
    EcommerceAdministratorEmail_templatesController,
    EcommerceSuperadministratorEmail_templatesController,
    EcommerceAdministratorAudit_logsController,
    EcommerceSuperadministratorAudit_logsController,
    EcommerceAdministratorSystem_metricsController,
    EcommerceSuperadministratorSystem_metricsController,
    EcommerceAdministratorMetadata_registriesController,
    EcommerceSuperadministratorMetadata_registriesController,
    EcommerceAdministratorData_snapshotsController,
    EcommerceSuperadministratorData_snapshotsController,
    EcommerceAdministratorBusiness_rulesController,
    EcommerceSuperadministratorBusiness_rulesController,
    EcommerceAdministratorPlatform_eventsController,
    EcommerceSuperadministratorPlatform_eventsController,
    EcommerceAdministratorDb_migrationsController,
    EcommerceSuperadministratorDb_migrationsController,
    EcommerceAdministratorCache_configurationsController,
    EcommerceSuperadministratorCache_configurationsController,
    EcommerceAdministratorMetadata_registriesField_definitionsController,
    EcommerceSuperadministratorMetadata_registriesField_definitionsController,
    EcommerceAdministratorMetadata_registriesRelationshipsController,
    EcommerceSuperadministratorMetadata_registriesRelationshipsController,
    EcommerceAdministratorCache_configurationsParametersController,
    EcommerceSuperadministratorCache_configurationsParametersController,
    EcommerceAdministratorCache_configurationsSnapshotsController,
    EcommerceSuperadministratorCache_configurationsSnapshotsController,
    EcommerceAdministratorCache_configurationsParameter_definitionsController,
    EcommerceSuperadministratorCache_configurationsParameter_definitionsController,
    EcommerceAdministratorMetadata_registriesRelationshipsSubtypesController,
    EcommerceSuperadministratorMetadata_registriesRelationshipsSubtypesController,
    EcommerceAdministratorPlatform_eventsSubtypesController,
    EcommerceSuperadministratorPlatform_eventsSubtypesController,
    EcommerceCustomerStatisticsController,
    EcommerceCustomerAddresses_defaultController,
    EcommerceController,
    EcommerceSellerController,
    EcommerceSellerAnalyticsSalesController,
    EcommerceAdministratorAnalyticsProductsController,
    EcommerceCustomerOrdersHistoryController,
    EcommerceCustomerCheckoutController,
    EcommerceSellerOrder_itemsController,
    EcommerceAdministratorAnalyticsOrdersController,
    EcommerceSellerShipmentsController,
    EcommerceCustomerShipmentsDelivery_confirmController,
    EcommerceSellerCancellation_requestsPendingController,
    EcommerceSellerRefund_requestsPendingController,
    EcommerceCustomerTrackingController,
    EcommerceSellerPendingController,
    EcommerceAdministratorModificationsOverviewController,
    EcommerceSellerAnalyticsReviewsController,
    EcommerceAdministratorModerationReviewsController,
    EcommerceAnalyticsProductsReviewsController,
    EcommerceAdministratorReportsReviewsController,
    EcommerceAdministratorSeller_approvalsController,
    EcommerceSuperadministratorSeller_approvalsController,
    EcommerceAdministratorPlatform_metricsController,
    EcommerceSuperadministratorPlatform_metricsController,
    EcommerceAdministratorSeller_performanceController,
    EcommerceSuperadministratorSeller_performanceController,
    EcommerceAdministratorCategory_usageController,
    EcommerceSuperadministratorCategory_usageController,
    EcommerceAdministratorUser_managementController,
    EcommerceSuperadministratorUser_managementController,
    EcommerceAdministratorPlatform_oversightController,
    EcommerceSuperadministratorPlatform_oversightController,
    EcommerceAdministratorCategory_analyticsController,
    EcommerceSuperadministratorCategory_analyticsController,
    EcommerceAdministratorAnalysisController,
    EcommerceSuperadministratorAnalysisController,
  ],
})
export class MyModule {}
