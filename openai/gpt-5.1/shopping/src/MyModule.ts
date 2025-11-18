import { Module } from "@nestjs/common";

import { AuthCustomerController } from "./controllers/auth/customer/AuthCustomerController";
import { AuthSellerController } from "./controllers/auth/seller/AuthSellerController";
import { AuthAdminController } from "./controllers/auth/admin/AuthAdminController";
import { AuthGuestuserController } from "./controllers/auth/guestUser/AuthGuestuserController";
import { ShoppingmallAdminConfigsController } from "./controllers/shoppingMall/admin/configs/ShoppingmallAdminConfigsController";
import { ShoppingmallAdminConfigsBynamespaceController } from "./controllers/shoppingMall/admin/configs/byNamespace/ShoppingmallAdminConfigsBynamespaceController";
import { ShoppingmallConfigsBynamespaceController } from "./controllers/shoppingMall/configs/byNamespace/ShoppingmallConfigsBynamespaceController";
import { ShoppingmallCountriesController } from "./controllers/shoppingMall/countries/ShoppingmallCountriesController";
import { ShoppingmallAdminCountriesController } from "./controllers/shoppingMall/admin/countries/ShoppingmallAdminCountriesController";
import { ShoppingmallCountriesRegionsController } from "./controllers/shoppingMall/countries/regions/ShoppingmallCountriesRegionsController";
import { ShoppingmallAdminCountriesRegionsController } from "./controllers/shoppingMall/admin/countries/regions/ShoppingmallAdminCountriesRegionsController";
import { ShoppingmallAdminCountriesRegionsShippingpoliciesController } from "./controllers/shoppingMall/admin/countries/regions/shippingPolicies/ShoppingmallAdminCountriesRegionsShippingpoliciesController";
import { ShoppingmallCountriesRegionsShippingpoliciesController } from "./controllers/shoppingMall/countries/regions/shippingPolicies/ShoppingmallCountriesRegionsShippingpoliciesController";
import { ShoppingmallCategoriesController } from "./controllers/shoppingMall/categories/ShoppingmallCategoriesController";
import { ShoppingmallAdminCategoriesController } from "./controllers/shoppingMall/admin/categories/ShoppingmallAdminCategoriesController";
import { ShoppingmallCategoriesTreeController } from "./controllers/shoppingMall/categories/tree/ShoppingmallCategoriesTreeController";
import { ShoppingmallCategoriesChildrenController } from "./controllers/shoppingMall/categories/children/ShoppingmallCategoriesChildrenController";
import { ShoppingmallCategoriesAncestorsController } from "./controllers/shoppingMall/categories/ancestors/ShoppingmallCategoriesAncestorsController";
import { ShoppingmallCategoriesDescendantsController } from "./controllers/shoppingMall/categories/descendants/ShoppingmallCategoriesDescendantsController";
import { ShoppingmallCategoriesLocalizationsController } from "./controllers/shoppingMall/categories/localizations/ShoppingmallCategoriesLocalizationsController";
import { ShoppingmallAdminCategoriesLocalizationsController } from "./controllers/shoppingMall/admin/categories/localizations/ShoppingmallAdminCategoriesLocalizationsController";
import { ShoppingmallAdminBusinesspoliciesController } from "./controllers/shoppingMall/admin/businessPolicies/ShoppingmallAdminBusinesspoliciesController";
import { ShoppingmallAdminBusinesspoliciesVersionsController } from "./controllers/shoppingMall/admin/businessPolicies/versions/ShoppingmallAdminBusinesspoliciesVersionsController";
import { ShoppingmallAdminRiskrulesController } from "./controllers/shoppingMall/admin/riskRules/ShoppingmallAdminRiskrulesController";
import { ShoppingmallAdminDashboardSystemoverviewController } from "./controllers/shoppingMall/admin/dashboard/systemOverview/ShoppingmallAdminDashboardSystemoverviewController";
import { ShoppingmallAdminStatisticsGeographyController } from "./controllers/shoppingMall/admin/statistics/geography/ShoppingmallAdminStatisticsGeographyController";
import { ShoppingmallAdminStatisticsPoliciesController } from "./controllers/shoppingMall/admin/statistics/policies/ShoppingmallAdminStatisticsPoliciesController";
import { ShoppingmallAdminStatisticsRiskrulesController } from "./controllers/shoppingMall/admin/statistics/riskRules/ShoppingmallAdminStatisticsRiskrulesController";
import { ShoppingmallAdminCustomersController } from "./controllers/shoppingMall/admin/customers/ShoppingmallAdminCustomersController";
import { ShoppingmallCustomerCustomersController } from "./controllers/shoppingMall/customer/customers/ShoppingmallCustomerCustomersController";
import { ShoppingmallCustomerCustomersProfileController } from "./controllers/shoppingMall/customer/customers/profile/ShoppingmallCustomerCustomersProfileController";
import { ShoppingmallAdminCustomersSessionsController } from "./controllers/shoppingMall/admin/customers/sessions/ShoppingmallAdminCustomersSessionsController";
import { ShoppingmallCustomerCustomersAddressesController } from "./controllers/shoppingMall/customer/customers/addresses/ShoppingmallCustomerCustomersAddressesController";
import { ShoppingmallCustomerCustomersAddresssnapshotsController } from "./controllers/shoppingMall/customer/customers/addressSnapshots/ShoppingmallCustomerCustomersAddresssnapshotsController";
import { ShoppingmallAdminSellersController } from "./controllers/shoppingMall/admin/sellers/ShoppingmallAdminSellersController";
import { ShoppingmallSellerSellersProfileController } from "./controllers/shoppingMall/seller/sellers/profile/ShoppingmallSellerSellersProfileController";
import { ShoppingmallAdminSellersProfileController } from "./controllers/shoppingMall/admin/sellers/profile/ShoppingmallAdminSellersProfileController";
import { ShoppingmallAdminSellersSessionsController } from "./controllers/shoppingMall/admin/sellers/sessions/ShoppingmallAdminSellersSessionsController";
import { ShoppingmallAdminAdminsController } from "./controllers/shoppingMall/admin/admins/ShoppingmallAdminAdminsController";
import { ShoppingmallAdminAdminsProfileController } from "./controllers/shoppingMall/admin/admins/profile/ShoppingmallAdminAdminsProfileController";
import { ShoppingmallAdminAdminsSessionsController } from "./controllers/shoppingMall/admin/admins/sessions/ShoppingmallAdminAdminsSessionsController";
import { ShoppingmallAdminGuestusersController } from "./controllers/shoppingMall/admin/guestUsers/ShoppingmallAdminGuestusersController";
import { ShoppingmallAdminGuestusersSessionsController } from "./controllers/shoppingMall/admin/guestUsers/sessions/ShoppingmallAdminGuestusersSessionsController";
import { ShoppingmallAdminAccountriskflagsController } from "./controllers/shoppingMall/admin/accountRiskFlags/ShoppingmallAdminAccountriskflagsController";
import { ShoppingmallAdminCustomersAccountriskflagsController } from "./controllers/shoppingMall/admin/customers/accountRiskFlags/ShoppingmallAdminCustomersAccountriskflagsController";
import { ShoppingmallAdminSellersAccountriskflagsController } from "./controllers/shoppingMall/admin/sellers/accountRiskFlags/ShoppingmallAdminSellersAccountriskflagsController";
import { ShoppingmallAdminAdminsAccountriskflagsController } from "./controllers/shoppingMall/admin/admins/accountRiskFlags/ShoppingmallAdminAdminsAccountriskflagsController";
import { ShoppingmallAdminGuestusersAccountriskflagsController } from "./controllers/shoppingMall/admin/guestUsers/accountRiskFlags/ShoppingmallAdminGuestusersAccountriskflagsController";
import { ShoppingmallAdminActorsecurityeventsController } from "./controllers/shoppingMall/admin/actorSecurityEvents/ShoppingmallAdminActorsecurityeventsController";
import { ShoppingmallAdminCustomersActorsecurityeventsController } from "./controllers/shoppingMall/admin/customers/actorSecurityEvents/ShoppingmallAdminCustomersActorsecurityeventsController";
import { ShoppingmallAdminSellersActorsecurityeventsController } from "./controllers/shoppingMall/admin/sellers/actorSecurityEvents/ShoppingmallAdminSellersActorsecurityeventsController";
import { ShoppingmallAdminAdminsActorsecurityeventsController } from "./controllers/shoppingMall/admin/admins/actorSecurityEvents/ShoppingmallAdminAdminsActorsecurityeventsController";
import { ShoppingmallAdminGuestusersActorsecurityeventsController } from "./controllers/shoppingMall/admin/guestUsers/actorSecurityEvents/ShoppingmallAdminGuestusersActorsecurityeventsController";
import { ShoppingmallAdminActorsSearchController } from "./controllers/shoppingMall/admin/actors/search/ShoppingmallAdminActorsSearchController";
import { ShoppingmallAdminActorsRisksummaryController } from "./controllers/shoppingMall/admin/actors/riskSummary/ShoppingmallAdminActorsRisksummaryController";
import { ShoppingmallAdminActorsSecurityoverviewController } from "./controllers/shoppingMall/admin/actors/securityOverview/ShoppingmallAdminActorsSecurityoverviewController";
import { ShoppingmallProductsController } from "./controllers/shoppingMall/products/ShoppingmallProductsController";
import { ShoppingmallSellerProductsController } from "./controllers/shoppingMall/seller/products/ShoppingmallSellerProductsController";
import { ShoppingmallAdminProductsController } from "./controllers/shoppingMall/admin/products/ShoppingmallAdminProductsController";
import { ShoppingmallProductsImagesController } from "./controllers/shoppingMall/products/images/ShoppingmallProductsImagesController";
import { ShoppingmallSellerProductsImagesController } from "./controllers/shoppingMall/seller/products/images/ShoppingmallSellerProductsImagesController";
import { ShoppingmallAdminProductsLocalizationsController } from "./controllers/shoppingMall/admin/products/localizations/ShoppingmallAdminProductsLocalizationsController";
import { ShoppingmallSellerProductsLocalizationsController } from "./controllers/shoppingMall/seller/products/localizations/ShoppingmallSellerProductsLocalizationsController";
import { ShoppingmallCustomerProductsCategoriesController } from "./controllers/shoppingMall/customer/products/categories/ShoppingmallCustomerProductsCategoriesController";
import { ShoppingmallSellerProductsCategoriesController } from "./controllers/shoppingMall/seller/products/categories/ShoppingmallSellerProductsCategoriesController";
import { ShoppingmallAdminProductsCategoriesController } from "./controllers/shoppingMall/admin/products/categories/ShoppingmallAdminProductsCategoriesController";
import { ShoppingmallAdminProducttagsController } from "./controllers/shoppingMall/admin/productTags/ShoppingmallAdminProducttagsController";
import { ShoppingmallProductsTagsController } from "./controllers/shoppingMall/products/tags/ShoppingmallProductsTagsController";
import { ShoppingmallSellerProductsTagsController } from "./controllers/shoppingMall/seller/products/tags/ShoppingmallSellerProductsTagsController";
import { ShoppingmallSellerProductsAttributesController } from "./controllers/shoppingMall/seller/products/attributes/ShoppingmallSellerProductsAttributesController";
import { ShoppingmallAdminProductsAttributesController } from "./controllers/shoppingMall/admin/products/attributes/ShoppingmallAdminProductsAttributesController";
import { ShoppingmallAdminProductsAttributesValuesController } from "./controllers/shoppingMall/admin/products/attributes/values/ShoppingmallAdminProductsAttributesValuesController";
import { ShoppingmallSellerProductsAttributesValuesController } from "./controllers/shoppingMall/seller/products/attributes/values/ShoppingmallSellerProductsAttributesValuesController";
import { ShoppingmallSellerProductsSkusController } from "./controllers/shoppingMall/seller/products/skus/ShoppingmallSellerProductsSkusController";
import { ShoppingmallAdminProductsSkusController } from "./controllers/shoppingMall/admin/products/skus/ShoppingmallAdminProductsSkusController";
import { ShoppingmallProductsSkusController } from "./controllers/shoppingMall/products/skus/ShoppingmallProductsSkusController";
import { ShoppingmallAdminSkusController } from "./controllers/shoppingMall/admin/skus/ShoppingmallAdminSkusController";
import { ShoppingmallSellerSkusAttributevaluesController } from "./controllers/shoppingMall/seller/skus/attributeValues/ShoppingmallSellerSkusAttributevaluesController";
import { ShoppingmallAdminSkusAttributevaluesController } from "./controllers/shoppingMall/admin/skus/attributeValues/ShoppingmallAdminSkusAttributevaluesController";
import { ShoppingmallAdminSkusExternalidsController } from "./controllers/shoppingMall/admin/skus/externalIds/ShoppingmallAdminSkusExternalidsController";
import { ShoppingmallAdminSkuinventorystatesController } from "./controllers/shoppingMall/admin/skuInventoryStates/ShoppingmallAdminSkuinventorystatesController";
import { ShoppingmallAdminCatalogvisibilityrulesController } from "./controllers/shoppingMall/admin/catalogVisibilityRules/ShoppingmallAdminCatalogvisibilityrulesController";
import { ShoppingmallCatalogsearchController } from "./controllers/shoppingMall/catalogSearch/ShoppingmallCatalogsearchController";
import { ShoppingmallAdminCatalogsearchIndexentriesController } from "./controllers/shoppingMall/admin/catalogSearch/indexEntries/ShoppingmallAdminCatalogsearchIndexentriesController";
import { ShoppingmallAdminCatalogblockreasonsController } from "./controllers/shoppingMall/admin/catalogBlockReasons/ShoppingmallAdminCatalogblockreasonsController";
import { ShoppingmallCatalogOverviewController } from "./controllers/shoppingMall/catalog/overview/ShoppingmallCatalogOverviewController";
import { ShoppingmallCatalogStatisticsProductavailabilityController } from "./controllers/shoppingMall/catalog/statistics/productAvailability/ShoppingmallCatalogStatisticsProductavailabilityController";
import { ShoppingmallAdminCatalogStatisticsTopsellingskusController } from "./controllers/shoppingMall/admin/catalog/statistics/topSellingSkus/ShoppingmallAdminCatalogStatisticsTopsellingskusController";
import { ShoppingmallAdminCatalogStatisticsBlockreasonbreakdownController } from "./controllers/shoppingMall/admin/catalog/statistics/blockReasonBreakdown/ShoppingmallAdminCatalogStatisticsBlockreasonbreakdownController";
import { ShoppingmallAdminCartsController } from "./controllers/shoppingMall/admin/carts/ShoppingmallAdminCartsController";
import { ShoppingmallCustomerCartsController } from "./controllers/shoppingMall/customer/carts/ShoppingmallCustomerCartsController";
import { ShoppingmallGuestuserCartsController } from "./controllers/shoppingMall/guestUser/carts/ShoppingmallGuestuserCartsController";
import { ShoppingmallCustomerCartsItemsController } from "./controllers/shoppingMall/customer/carts/items/ShoppingmallCustomerCartsItemsController";
import { ShoppingmallAdminCartsItemsValidationsController } from "./controllers/shoppingMall/admin/carts/items/validations/ShoppingmallAdminCartsItemsValidationsController";
import { ShoppingmallAdminCartsMergeeventsController } from "./controllers/shoppingMall/admin/carts/mergeEvents/ShoppingmallAdminCartsMergeeventsController";
import { ShoppingmallCustomerWishlistsController } from "./controllers/shoppingMall/customer/wishlists/ShoppingmallCustomerWishlistsController";
import { ShoppingmallAdminWishlistsController } from "./controllers/shoppingMall/admin/wishlists/ShoppingmallAdminWishlistsController";
import { ShoppingmallCustomerWishlistsItemsController } from "./controllers/shoppingMall/customer/wishlists/items/ShoppingmallCustomerWishlistsItemsController";
import { ShoppingmallCustomerWishlistsMergeeventsController } from "./controllers/shoppingMall/customer/wishlists/mergeEvents/ShoppingmallCustomerWishlistsMergeeventsController";
import { ShoppingmallCustomerCartsCheckoutpreviewController } from "./controllers/shoppingMall/customer/carts/checkoutPreview/ShoppingmallCustomerCartsCheckoutpreviewController";
import { ShoppingmallAdminCartsAnalyticsFrictionController } from "./controllers/shoppingMall/admin/carts/analytics/friction/ShoppingmallAdminCartsAnalyticsFrictionController";
import { ShoppingmallAdminWishlistsAnalyticsEngagementController } from "./controllers/shoppingMall/admin/wishlists/analytics/engagement/ShoppingmallAdminWishlistsAnalyticsEngagementController";
import { ShoppingmallAdminWishlistsMergeeventsController } from "./controllers/shoppingMall/admin/wishlists/mergeEvents/ShoppingmallAdminWishlistsMergeeventsController";
import { ShoppingmallAdminOrdersController } from "./controllers/shoppingMall/admin/orders/ShoppingmallAdminOrdersController";
import { ShoppingmallCustomerOrdersController } from "./controllers/shoppingMall/customer/orders/ShoppingmallCustomerOrdersController";
import { ShoppingmallCustomerOrdersItemsController } from "./controllers/shoppingMall/customer/orders/items/ShoppingmallCustomerOrdersItemsController";
import { ShoppingmallAdminOrdersItemsellersController } from "./controllers/shoppingMall/admin/orders/itemSellers/ShoppingmallAdminOrdersItemsellersController";
import { ShoppingmallAdminOrdersItemsSellerController } from "./controllers/shoppingMall/admin/orders/items/seller/ShoppingmallAdminOrdersItemsSellerController";
import { ShoppingmallOrdersPricesnapshotsController } from "./controllers/shoppingMall/orders/priceSnapshots/ShoppingmallOrdersPricesnapshotsController";
import { ShoppingmallCustomerOrdersPricesnapshotsController } from "./controllers/shoppingMall/customer/orders/priceSnapshots/ShoppingmallCustomerOrdersPricesnapshotsController";
import { ShoppingmallSellerOrdersPricesnapshotsController } from "./controllers/shoppingMall/seller/orders/priceSnapshots/ShoppingmallSellerOrdersPricesnapshotsController";
import { ShoppingmallAdminOrdersPricesnapshotsController } from "./controllers/shoppingMall/admin/orders/priceSnapshots/ShoppingmallAdminOrdersPricesnapshotsController";
import { ShoppingmallCustomerOrdersStatushistoriesController } from "./controllers/shoppingMall/customer/orders/statusHistories/ShoppingmallCustomerOrdersStatushistoriesController";
import { ShoppingmallAdminOrdersStatushistoriesController } from "./controllers/shoppingMall/admin/orders/statusHistories/ShoppingmallAdminOrdersStatushistoriesController";
import { ShoppingmallCustomerOrdersCustomercontactController } from "./controllers/shoppingMall/customer/orders/customerContact/ShoppingmallCustomerOrdersCustomercontactController";
import { ShoppingmallAdminOrdersCustomercontactController } from "./controllers/shoppingMall/admin/orders/customerContact/ShoppingmallAdminOrdersCustomercontactController";
import { ShoppingmallOrdersShippingaddressController } from "./controllers/shoppingMall/orders/shippingAddress/ShoppingmallOrdersShippingaddressController";
import { ShoppingmallCustomerOrdersShippingaddressController } from "./controllers/shoppingMall/customer/orders/shippingAddress/ShoppingmallCustomerOrdersShippingaddressController";
import { ShoppingmallAdminOrdersShippingaddressController } from "./controllers/shoppingMall/admin/orders/shippingAddress/ShoppingmallAdminOrdersShippingaddressController";
import { ShoppingmallAdminShippingmethodsController } from "./controllers/shoppingMall/admin/shippingMethods/ShoppingmallAdminShippingmethodsController";
import { ShoppingmallShippingmethodsController } from "./controllers/shoppingMall/shippingMethods/ShoppingmallShippingmethodsController";
import { ShoppingmallAdminShipmentsController } from "./controllers/shoppingMall/admin/shipments/ShoppingmallAdminShipmentsController";
import { ShoppingmallCustomerOrdersShipmentsController } from "./controllers/shoppingMall/customer/orders/shipments/ShoppingmallCustomerOrdersShipmentsController";
import { ShoppingmallSellerOrdersShipmentsController } from "./controllers/shoppingMall/seller/orders/shipments/ShoppingmallSellerOrdersShipmentsController";
import { ShoppingmallAdminOrdersShipmentsController } from "./controllers/shoppingMall/admin/orders/shipments/ShoppingmallAdminOrdersShipmentsController";
import { ShoppingmallAdminShipmentsItemsController } from "./controllers/shoppingMall/admin/shipments/items/ShoppingmallAdminShipmentsItemsController";
import { ShoppingmallShipmentsEventsController } from "./controllers/shoppingMall/shipments/events/ShoppingmallShipmentsEventsController";
import { ShoppingmallAdminShipmentsEventsController } from "./controllers/shoppingMall/admin/shipments/events/ShoppingmallAdminShipmentsEventsController";
import { ShoppingmallCustomerOrdersTimelineController } from "./controllers/shoppingMall/customer/orders/timeline/ShoppingmallCustomerOrdersTimelineController";
import { ShoppingmallCustomerOrdersTrackingController } from "./controllers/shoppingMall/customer/orders/tracking/ShoppingmallCustomerOrdersTrackingController";
import { ShoppingmallCustomerShipmentsTrackingController } from "./controllers/shoppingMall/customer/shipments/tracking/ShoppingmallCustomerShipmentsTrackingController";
import { ShoppingmallGuestuserShipmentsTrackingController } from "./controllers/shoppingMall/guestUser/shipments/tracking/ShoppingmallGuestuserShipmentsTrackingController";
import { ShoppingmallAdminAnalyticsOrderstatusController } from "./controllers/shoppingMall/admin/analytics/orderStatus/ShoppingmallAdminAnalyticsOrderstatusController";
import { ShoppingmallAdminAnalyticsShippingperformanceController } from "./controllers/shoppingMall/admin/analytics/shippingPerformance/ShoppingmallAdminAnalyticsShippingperformanceController";
import { ShoppingmallAdminSearchOrdersController } from "./controllers/shoppingMall/admin/search/orders/ShoppingmallAdminSearchOrdersController";
import { ShoppingmallCustomerSearchShipmentsController } from "./controllers/shoppingMall/customer/search/shipments/ShoppingmallCustomerSearchShipmentsController";
import { ShoppingmallAdminPaymentmethodsController } from "./controllers/shoppingMall/admin/paymentMethods/ShoppingmallAdminPaymentmethodsController";
import { ShoppingmallAdminPaymentmethodsSurchargesController } from "./controllers/shoppingMall/admin/paymentMethods/surcharges/ShoppingmallAdminPaymentmethodsSurchargesController";
import { ShoppingmallCustomerOrdersPaymentsController } from "./controllers/shoppingMall/customer/orders/payments/ShoppingmallCustomerOrdersPaymentsController";
import { ShoppingmallSellerOrdersPaymentsController } from "./controllers/shoppingMall/seller/orders/payments/ShoppingmallSellerOrdersPaymentsController";
import { ShoppingmallAdminOrdersPaymentsController } from "./controllers/shoppingMall/admin/orders/payments/ShoppingmallAdminOrdersPaymentsController";
import { ShoppingmallGuestuserOrdersPaymentsController } from "./controllers/shoppingMall/guestUser/orders/payments/ShoppingmallGuestuserOrdersPaymentsController";
import { ShoppingmallCustomerCustomersPaymentsController } from "./controllers/shoppingMall/customer/customers/payments/ShoppingmallCustomerCustomersPaymentsController";
import { ShoppingmallAdminPaymentsController } from "./controllers/shoppingMall/admin/payments/ShoppingmallAdminPaymentsController";
import { ShoppingmallAdminPaymentsAttemptsController } from "./controllers/shoppingMall/admin/payments/attempts/ShoppingmallAdminPaymentsAttemptsController";
import { ShoppingmallAdminPaymentsStatushistoriesController } from "./controllers/shoppingMall/admin/payments/statusHistories/ShoppingmallAdminPaymentsStatushistoriesController";
import { ShoppingmallAdminPaymentsRefundsController } from "./controllers/shoppingMall/admin/payments/refunds/ShoppingmallAdminPaymentsRefundsController";
import { ShoppingmallAdminPaymentsRefundsItemsController } from "./controllers/shoppingMall/admin/payments/refunds/items/ShoppingmallAdminPaymentsRefundsItemsController";
import { ShoppingmallAdminPaymentsChargebacksController } from "./controllers/shoppingMall/admin/payments/chargebacks/ShoppingmallAdminPaymentsChargebacksController";
import { ShoppingmallAdminPaymentsReconciliationeventsController } from "./controllers/shoppingMall/admin/payments/reconciliationEvents/ShoppingmallAdminPaymentsReconciliationeventsController";
import { ShoppingmallSellerSellersEarningsController } from "./controllers/shoppingMall/seller/sellers/earnings/ShoppingmallSellerSellersEarningsController";
import { ShoppingmallAdminSellersEarningsController } from "./controllers/shoppingMall/admin/sellers/earnings/ShoppingmallAdminSellersEarningsController";
import { ShoppingmallAdminSellerearningsController } from "./controllers/shoppingMall/admin/sellerEarnings/ShoppingmallAdminSellerearningsController";
import { ShoppingmallAdminPayoutbatchesController } from "./controllers/shoppingMall/admin/payoutBatches/ShoppingmallAdminPayoutbatchesController";
import { ShoppingmallAdminPayoutbatchesItemsController } from "./controllers/shoppingMall/admin/payoutBatches/items/ShoppingmallAdminPayoutbatchesItemsController";
import { ShoppingmallAdminAnalyticsPaymentmethodsStatsController } from "./controllers/shoppingMall/admin/analytics/paymentMethods/stats/ShoppingmallAdminAnalyticsPaymentmethodsStatsController";
import { ShoppingmallAdminAnalyticsPaymentsSummaryController } from "./controllers/shoppingMall/admin/analytics/payments/summary/ShoppingmallAdminAnalyticsPaymentsSummaryController";
import { ShoppingmallAdminAnalyticsRefundsSummaryController } from "./controllers/shoppingMall/admin/analytics/refunds/summary/ShoppingmallAdminAnalyticsRefundsSummaryController";
import { ShoppingmallAdminAnalyticsChargebacksSummaryController } from "./controllers/shoppingMall/admin/analytics/chargebacks/summary/ShoppingmallAdminAnalyticsChargebacksSummaryController";
import { ShoppingmallAdminAnalyticsSellerearningsSummaryController } from "./controllers/shoppingMall/admin/analytics/sellerEarnings/summary/ShoppingmallAdminAnalyticsSellerearningsSummaryController";
import { ShoppingmallAdminAnalyticsPayoutsSummaryController } from "./controllers/shoppingMall/admin/analytics/payouts/summary/ShoppingmallAdminAnalyticsPayoutsSummaryController";
import { ShoppingmallAdminCancellationrequestsController } from "./controllers/shoppingMall/admin/cancellationRequests/ShoppingmallAdminCancellationrequestsController";
import { ShoppingmallCustomerCancellationrequestsController } from "./controllers/shoppingMall/customer/cancellationRequests/ShoppingmallCustomerCancellationrequestsController";
import { ShoppingmallCancellationrequestsItemsController } from "./controllers/shoppingMall/cancellationRequests/items/ShoppingmallCancellationrequestsItemsController";
import { ShoppingmallCustomerCancellationrequestsItemsController } from "./controllers/shoppingMall/customer/cancellationRequests/items/ShoppingmallCustomerCancellationrequestsItemsController";
import { ShoppingmallAdminCancellationrequestsItemsController } from "./controllers/shoppingMall/admin/cancellationRequests/items/ShoppingmallAdminCancellationrequestsItemsController";
import { ShoppingmallAdminRefundrequestsController } from "./controllers/shoppingMall/admin/refundRequests/ShoppingmallAdminRefundrequestsController";
import { ShoppingmallAdminRefundrequestsItemsController } from "./controllers/shoppingMall/admin/refundRequests/items/ShoppingmallAdminRefundrequestsItemsController";
import { ShoppingmallCustomerRefundrequestsItemsController } from "./controllers/shoppingMall/customer/refundRequests/items/ShoppingmallCustomerRefundrequestsItemsController";
import { ShoppingmallAdminRefundrequestsStatushistoriesController } from "./controllers/shoppingMall/admin/refundRequests/statusHistories/ShoppingmallAdminRefundrequestsStatushistoriesController";
import { ShoppingmallAdminRefundrequestreasonsController } from "./controllers/shoppingMall/admin/refundRequestReasons/ShoppingmallAdminRefundrequestreasonsController";
import { ShoppingmallAdminDisputesController } from "./controllers/shoppingMall/admin/disputes/ShoppingmallAdminDisputesController";
import { ShoppingmallCustomerDisputesController } from "./controllers/shoppingMall/customer/disputes/ShoppingmallCustomerDisputesController";
import { ShoppingmallSellerDisputesController } from "./controllers/shoppingMall/seller/disputes/ShoppingmallSellerDisputesController";
import { ShoppingmallAdminDisputesPartiesController } from "./controllers/shoppingMall/admin/disputes/parties/ShoppingmallAdminDisputesPartiesController";
import { ShoppingmallAdminDisputesEventsController } from "./controllers/shoppingMall/admin/disputes/events/ShoppingmallAdminDisputesEventsController";
import { ShoppingmallAdminDisputesEvidencesController } from "./controllers/shoppingMall/admin/disputes/evidences/ShoppingmallAdminDisputesEvidencesController";
import { ShoppingmallAdminCaseslaconfigsController } from "./controllers/shoppingMall/admin/caseSlaConfigs/ShoppingmallAdminCaseslaconfigsController";
import { ShoppingmallAdminCaseslaviolationsController } from "./controllers/shoppingMall/admin/caseSlaViolations/ShoppingmallAdminCaseslaviolationsController";
import { ShoppingmallAdminRefundsanddisputesDashboardController } from "./controllers/shoppingMall/admin/refundsAndDisputes/dashboard/ShoppingmallAdminRefundsanddisputesDashboardController";
import { ShoppingmallAdminRefundsanddisputesStatisticsRefundsbystatusController } from "./controllers/shoppingMall/admin/refundsAndDisputes/statistics/refundsByStatus/ShoppingmallAdminRefundsanddisputesStatisticsRefundsbystatusController";
import { ShoppingmallAdminRefundsanddisputesStatisticsDisputesbystatusController } from "./controllers/shoppingMall/admin/refundsAndDisputes/statistics/disputesByStatus/ShoppingmallAdminRefundsanddisputesStatisticsDisputesbystatusController";
import { ShoppingmallAdminRefundsanddisputesStatisticsSlacomplianceController } from "./controllers/shoppingMall/admin/refundsAndDisputes/statistics/slaCompliance/ShoppingmallAdminRefundsanddisputesStatisticsSlacomplianceController";
import { ShoppingmallAdminRefundsanddisputesSearchCasesController } from "./controllers/shoppingMall/admin/refundsAndDisputes/search/cases/ShoppingmallAdminRefundsanddisputesSearchCasesController";
import { ShoppingmallReviewsController } from "./controllers/shoppingMall/reviews/ShoppingmallReviewsController";
import { ShoppingmallCustomerReviewsController } from "./controllers/shoppingMall/customer/reviews/ShoppingmallCustomerReviewsController";
import { ShoppingmallProductsReviewsController } from "./controllers/shoppingMall/products/reviews/ShoppingmallProductsReviewsController";
import { ShoppingmallCustomerProductsReviewsController } from "./controllers/shoppingMall/customer/products/reviews/ShoppingmallCustomerProductsReviewsController";
import { ShoppingmallSkusReviewsController } from "./controllers/shoppingMall/skus/reviews/ShoppingmallSkusReviewsController";
import { ShoppingmallCustomerSkusReviewsController } from "./controllers/shoppingMall/customer/skus/reviews/ShoppingmallCustomerSkusReviewsController";
import { ShoppingmallAdminSkusReviewsController } from "./controllers/shoppingMall/admin/skus/reviews/ShoppingmallAdminSkusReviewsController";
import { ShoppingmallCustomerCustomersReviewsController } from "./controllers/shoppingMall/customer/customers/reviews/ShoppingmallCustomerCustomersReviewsController";
import { ShoppingmallCustomerOrderitemsReviewsController } from "./controllers/shoppingMall/customer/orderItems/reviews/ShoppingmallCustomerOrderitemsReviewsController";
import { ShoppingmallAdminReviewversionsController } from "./controllers/shoppingMall/admin/reviewVersions/ShoppingmallAdminReviewversionsController";
import { ShoppingmallAdminReviewsVersionsController } from "./controllers/shoppingMall/admin/reviews/versions/ShoppingmallAdminReviewsVersionsController";
import { ShoppingmallAdminReviewreportsController } from "./controllers/shoppingMall/admin/reviewReports/ShoppingmallAdminReviewreportsController";
import { ShoppingmallCustomerReviewreportsController } from "./controllers/shoppingMall/customer/reviewReports/ShoppingmallCustomerReviewreportsController";
import { ShoppingmallAdminReviewsReportsController } from "./controllers/shoppingMall/admin/reviews/reports/ShoppingmallAdminReviewsReportsController";
import { ShoppingmallCustomerReviewsReportsController } from "./controllers/shoppingMall/customer/reviews/reports/ShoppingmallCustomerReviewsReportsController";
import { ShoppingmallAdminReviewsModerationactionsController } from "./controllers/shoppingMall/admin/reviews/moderationActions/ShoppingmallAdminReviewsModerationactionsController";
import { ShoppingmallAdminReviewhelpfulvotesController } from "./controllers/shoppingMall/admin/reviewHelpfulVotes/ShoppingmallAdminReviewhelpfulvotesController";
import { ShoppingmallCustomerReviewhelpfulvotesController } from "./controllers/shoppingMall/customer/reviewHelpfulVotes/ShoppingmallCustomerReviewhelpfulvotesController";
import { ShoppingmallCustomerReviewsHelpfulvotesController } from "./controllers/shoppingMall/customer/reviews/helpfulVotes/ShoppingmallCustomerReviewsHelpfulvotesController";
import { ShoppingmallCustomerCustomersHelpfulvotesController } from "./controllers/shoppingMall/customer/customers/helpfulVotes/ShoppingmallCustomerCustomersHelpfulvotesController";
import { ShoppingmallAdminCustomersHelpfulvotesController } from "./controllers/shoppingMall/admin/customers/helpfulVotes/ShoppingmallAdminCustomersHelpfulvotesController";
import { ShoppingmallProductsRatingaggregatesController } from "./controllers/shoppingMall/products/ratingAggregates/ShoppingmallProductsRatingaggregatesController";
import { ShoppingmallSkusRatingaggregatesController } from "./controllers/shoppingMall/skus/ratingAggregates/ShoppingmallSkusRatingaggregatesController";
import { ShoppingmallRatingaggregatesProductsController } from "./controllers/shoppingMall/ratingAggregates/products/ShoppingmallRatingaggregatesProductsController";
import { ShoppingmallRatingaggregatesSkusController } from "./controllers/shoppingMall/ratingAggregates/skus/ShoppingmallRatingaggregatesSkusController";
import { ShoppingmallCustomerRevieweligibilitiesController } from "./controllers/shoppingMall/customer/reviewEligibilities/ShoppingmallCustomerRevieweligibilitiesController";
import { ShoppingmallAdminRevieweligibilitiesController } from "./controllers/shoppingMall/admin/reviewEligibilities/ShoppingmallAdminRevieweligibilitiesController";
import { ShoppingmallCustomerCustomersRevieweligibilitiesController } from "./controllers/shoppingMall/customer/customers/reviewEligibilities/ShoppingmallCustomerCustomersRevieweligibilitiesController";
import { ShoppingmallCustomerOrderitemsRevieweligibilitiesController } from "./controllers/shoppingMall/customer/orderItems/reviewEligibilities/ShoppingmallCustomerOrderitemsRevieweligibilitiesController";
import { ShoppingmallAdminAnalyticsReviewsDistributionController } from "./controllers/shoppingMall/admin/analytics/reviews/distribution/ShoppingmallAdminAnalyticsReviewsDistributionController";
import { ShoppingmallAdminAnalyticsReviewsHelpfulnessController } from "./controllers/shoppingMall/admin/analytics/reviews/helpfulness/ShoppingmallAdminAnalyticsReviewsHelpfulnessController";
import { ShoppingmallAdminAnalyticsReviewsVolumeController } from "./controllers/shoppingMall/admin/analytics/reviews/volume/ShoppingmallAdminAnalyticsReviewsVolumeController";
import { ShoppingmallAdminAnalyticsReviewsModerationController } from "./controllers/shoppingMall/admin/analytics/reviews/moderation/ShoppingmallAdminAnalyticsReviewsModerationController";
import { ShoppingmallSellerSellerwarehousesController } from "./controllers/shoppingMall/seller/sellerWarehouses/ShoppingmallSellerSellerwarehousesController";
import { ShoppingmallSellerSellerwarehousesAddressController } from "./controllers/shoppingMall/seller/sellerWarehouses/address/ShoppingmallSellerSellerwarehousesAddressController";
import { ShoppingmallAdminSellerwarehousesAddressController } from "./controllers/shoppingMall/admin/sellerWarehouses/address/ShoppingmallAdminSellerwarehousesAddressController";
import { ShoppingmallAdminInventoryadjustmentreasonsController } from "./controllers/shoppingMall/admin/inventoryAdjustmentReasons/ShoppingmallAdminInventoryadjustmentreasonsController";
import { ShoppingmallAdminInventoryadjustmentsController } from "./controllers/shoppingMall/admin/inventoryAdjustments/ShoppingmallAdminInventoryadjustmentsController";
import { ShoppingmallAdminSellerordermetricssnapshotsController } from "./controllers/shoppingMall/admin/sellerOrderMetricsSnapshots/ShoppingmallAdminSellerordermetricssnapshotsController";
import { ShoppingmallAdminSellerperformancesnapshotsController } from "./controllers/shoppingMall/admin/sellerPerformanceSnapshots/ShoppingmallAdminSellerperformancesnapshotsController";
import { ShoppingmallSellersubscriptionplansController } from "./controllers/shoppingMall/sellerSubscriptionPlans/ShoppingmallSellersubscriptionplansController";
import { ShoppingmallAdminSellersubscriptionplansController } from "./controllers/shoppingMall/admin/sellerSubscriptionPlans/ShoppingmallAdminSellersubscriptionplansController";
import { ShoppingmallAdminSellersubscriptionsController } from "./controllers/shoppingMall/admin/sellerSubscriptions/ShoppingmallAdminSellersubscriptionsController";
import { ShoppingmallAdminSellerfeechargesController } from "./controllers/shoppingMall/admin/sellerFeeCharges/ShoppingmallAdminSellerfeechargesController";
import { ShoppingmallAdminAnalyticsSellerordermetricsController } from "./controllers/shoppingMall/admin/analytics/sellerOrderMetrics/ShoppingmallAdminAnalyticsSellerordermetricsController";
import { ShoppingmallAdminAnalyticsSellerperformanceController } from "./controllers/shoppingMall/admin/analytics/sellerPerformance/ShoppingmallAdminAnalyticsSellerperformanceController";
import { ShoppingmallSellerDashboardSelleroverviewController } from "./controllers/shoppingMall/seller/dashboard/sellerOverview/ShoppingmallSellerDashboardSelleroverviewController";
import { ShoppingmallSellerAnalyticsSellerfeesController } from "./controllers/shoppingMall/seller/analytics/sellerFees/ShoppingmallSellerAnalyticsSellerfeesController";
import { ShoppingmallAdminAnalyticsSellersubscriptionsController } from "./controllers/shoppingMall/admin/analytics/sellerSubscriptions/ShoppingmallAdminAnalyticsSellersubscriptionsController";
import { ShoppingmallAdminAnalyticsSellerinventoryadjustmentsController } from "./controllers/shoppingMall/admin/analytics/sellerInventoryAdjustments/ShoppingmallAdminAnalyticsSellerinventoryadjustmentsController";
import { ShoppingmallAdminAdminrolesController } from "./controllers/shoppingMall/admin/adminRoles/ShoppingmallAdminAdminrolesController";
import { ShoppingmallAdminAdminrolesAssignmentsController } from "./controllers/shoppingMall/admin/adminRoles/assignments/ShoppingmallAdminAdminrolesAssignmentsController";
import { ShoppingmallAdminAdminroleassignmentsController } from "./controllers/shoppingMall/admin/adminRoleAssignments/ShoppingmallAdminAdminroleassignmentsController";
import { ShoppingmallAdminAdminpermissionsController } from "./controllers/shoppingMall/admin/adminPermissions/ShoppingmallAdminAdminpermissionsController";
import { ShoppingmallAdminAdminauditlogsController } from "./controllers/shoppingMall/admin/adminAuditLogs/ShoppingmallAdminAdminauditlogsController";
import { ShoppingmallAdminLegalholdsController } from "./controllers/shoppingMall/admin/legalHolds/ShoppingmallAdminLegalholdsController";
import { ShoppingmallAdminLegalholdsTargetsController } from "./controllers/shoppingMall/admin/legalHolds/targets/ShoppingmallAdminLegalholdsTargetsController";
import { ShoppingmallAdminRiskcasesController } from "./controllers/shoppingMall/admin/riskCases/ShoppingmallAdminRiskcasesController";
import { ShoppingmallAdminRiskcasesEventsController } from "./controllers/shoppingMall/admin/riskCases/events/ShoppingmallAdminRiskcasesEventsController";
import { ShoppingmallAdminPolicyoverridesController } from "./controllers/shoppingMall/admin/policyOverrides/ShoppingmallAdminPolicyoverridesController";
import { ShoppingmallAdminAdminnotificationsController } from "./controllers/shoppingMall/admin/adminNotifications/ShoppingmallAdminAdminnotificationsController";
import { ShoppingmallAdminAdmindashboardGovernanceoverviewController } from "./controllers/shoppingMall/admin/adminDashboard/governanceOverview/ShoppingmallAdminAdmindashboardGovernanceoverviewController";
import { ShoppingmallAdminAdmindashboardRiskoverviewController } from "./controllers/shoppingMall/admin/adminDashboard/riskOverview/ShoppingmallAdminAdmindashboardRiskoverviewController";
import { ShoppingmallAdminAdmindashboardLegalholdoverviewController } from "./controllers/shoppingMall/admin/adminDashboard/legalHoldOverview/ShoppingmallAdminAdmindashboardLegalholdoverviewController";
import { ShoppingmallAdminAdmindashboardNotificationsSummaryController } from "./controllers/shoppingMall/admin/adminDashboard/notifications/summary/ShoppingmallAdminAdmindashboardNotificationsSummaryController";
import { ShoppingmallAdminAdminsearchAuditlogsController } from "./controllers/shoppingMall/admin/adminSearch/auditLogs/ShoppingmallAdminAdminsearchAuditlogsController";
import { ShoppingmallAdminAdminsearchRiskcasesController } from "./controllers/shoppingMall/admin/adminSearch/riskCases/ShoppingmallAdminAdminsearchRiskcasesController";
import { ShoppingmallAdminAdminsearchLegalholdsController } from "./controllers/shoppingMall/admin/adminSearch/legalHolds/ShoppingmallAdminAdminsearchLegalholdsController";
import { ShoppingmallAdminAdminsearchPolicyoverridesController } from "./controllers/shoppingMall/admin/adminSearch/policyOverrides/ShoppingmallAdminAdminsearchPolicyoverridesController";
import { ShoppingmallAdminAdminsearchAdminnotificationsController } from "./controllers/shoppingMall/admin/adminSearch/adminNotifications/ShoppingmallAdminAdminsearchAdminnotificationsController";
import { ShoppingmallAdminStatisticsAdminactivitiesController } from "./controllers/shoppingMall/admin/statistics/adminActivities/ShoppingmallAdminStatisticsAdminactivitiesController";
import { ShoppingmallAdminStatisticsRiskcasesbystatusController } from "./controllers/shoppingMall/admin/statistics/riskCasesByStatus/ShoppingmallAdminStatisticsRiskcasesbystatusController";
import { ShoppingmallAdminStatisticsLegalholdsbystatusController } from "./controllers/shoppingMall/admin/statistics/legalHoldsByStatus/ShoppingmallAdminStatisticsLegalholdsbystatusController";
import { ShoppingmallAdminStatisticsPolicyoverridesbystatusController } from "./controllers/shoppingMall/admin/statistics/policyOverridesByStatus/ShoppingmallAdminStatisticsPolicyoverridesbystatusController";
import { ShoppingmallAdminAnalyticsOrderdailystatsController } from "./controllers/shoppingMall/admin/analytics/orderDailyStats/ShoppingmallAdminAnalyticsOrderdailystatsController";
import { ShoppingmallAdminAnalyticsSellerdailystatsController } from "./controllers/shoppingMall/admin/analytics/sellerDailyStats/ShoppingmallAdminAnalyticsSellerdailystatsController";
import { ShoppingmallAdminAnalyticsCustomerdailystatsController } from "./controllers/shoppingMall/admin/analytics/customerDailyStats/ShoppingmallAdminAnalyticsCustomerdailystatsController";
import { ShoppingmallAdminAnalyticsCampaignmetricsController } from "./controllers/shoppingMall/admin/analytics/campaignMetrics/ShoppingmallAdminAnalyticsCampaignmetricsController";
import { ShoppingmallAdminAnalyticsPlatformkpisnapshotsController } from "./controllers/shoppingMall/admin/analytics/platformKpiSnapshots/ShoppingmallAdminAnalyticsPlatformkpisnapshotsController";
import { ShoppingmallAdminAnalyticsPaymentmethodstatsController } from "./controllers/shoppingMall/admin/analytics/paymentMethodStats/ShoppingmallAdminAnalyticsPaymentmethodstatsController";
import { ShoppingmallAdminAnalyticsShippingperformancestatsController } from "./controllers/shoppingMall/admin/analytics/shippingPerformanceStats/ShoppingmallAdminAnalyticsShippingperformancestatsController";
import { ShoppingmallAdminAnalyticsRefundanddisputestatsController } from "./controllers/shoppingMall/admin/analytics/refundAndDisputeStats/ShoppingmallAdminAnalyticsRefundanddisputestatsController";
import { ShoppingmallAdminDashboardAdminoverviewController } from "./controllers/shoppingMall/admin/dashboard/adminOverview/ShoppingmallAdminDashboardAdminoverviewController";
import { ShoppingmallAdminStatisticsCustomeractivitybydayController } from "./controllers/shoppingMall/admin/statistics/customerActivityByDay/ShoppingmallAdminStatisticsCustomeractivitybydayController";
import { ShoppingmallAdminStatisticsCampaignperformancebydayController } from "./controllers/shoppingMall/admin/statistics/campaignPerformanceByDay/ShoppingmallAdminStatisticsCampaignperformancebydayController";
import { ShoppingmallAdminStatisticsPaymentmethodperformancebydayController } from "./controllers/shoppingMall/admin/statistics/paymentMethodPerformanceByDay/ShoppingmallAdminStatisticsPaymentmethodperformancebydayController";
import { ShoppingmallAdminStatisticsShippingperformancebydayController } from "./controllers/shoppingMall/admin/statistics/shippingPerformanceByDay/ShoppingmallAdminStatisticsShippingperformancebydayController";
import { ShoppingmallAdminAnalyticsPlatformkpisController } from "./controllers/shoppingMall/admin/analytics/platformKpis/ShoppingmallAdminAnalyticsPlatformkpisController";

@Module({
  controllers: [
    AuthCustomerController,
    AuthSellerController,
    AuthAdminController,
    AuthGuestuserController,
    ShoppingmallAdminConfigsController,
    ShoppingmallAdminConfigsBynamespaceController,
    ShoppingmallConfigsBynamespaceController,
    ShoppingmallCountriesController,
    ShoppingmallAdminCountriesController,
    ShoppingmallCountriesRegionsController,
    ShoppingmallAdminCountriesRegionsController,
    ShoppingmallAdminCountriesRegionsShippingpoliciesController,
    ShoppingmallCountriesRegionsShippingpoliciesController,
    ShoppingmallCategoriesController,
    ShoppingmallAdminCategoriesController,
    ShoppingmallCategoriesTreeController,
    ShoppingmallCategoriesChildrenController,
    ShoppingmallCategoriesAncestorsController,
    ShoppingmallCategoriesDescendantsController,
    ShoppingmallCategoriesLocalizationsController,
    ShoppingmallAdminCategoriesLocalizationsController,
    ShoppingmallAdminBusinesspoliciesController,
    ShoppingmallAdminBusinesspoliciesVersionsController,
    ShoppingmallAdminRiskrulesController,
    ShoppingmallAdminDashboardSystemoverviewController,
    ShoppingmallAdminStatisticsGeographyController,
    ShoppingmallAdminStatisticsPoliciesController,
    ShoppingmallAdminStatisticsRiskrulesController,
    ShoppingmallAdminCustomersController,
    ShoppingmallCustomerCustomersController,
    ShoppingmallCustomerCustomersProfileController,
    ShoppingmallAdminCustomersSessionsController,
    ShoppingmallCustomerCustomersAddressesController,
    ShoppingmallCustomerCustomersAddresssnapshotsController,
    ShoppingmallAdminSellersController,
    ShoppingmallSellerSellersProfileController,
    ShoppingmallAdminSellersProfileController,
    ShoppingmallAdminSellersSessionsController,
    ShoppingmallAdminAdminsController,
    ShoppingmallAdminAdminsProfileController,
    ShoppingmallAdminAdminsSessionsController,
    ShoppingmallAdminGuestusersController,
    ShoppingmallAdminGuestusersSessionsController,
    ShoppingmallAdminAccountriskflagsController,
    ShoppingmallAdminCustomersAccountriskflagsController,
    ShoppingmallAdminSellersAccountriskflagsController,
    ShoppingmallAdminAdminsAccountriskflagsController,
    ShoppingmallAdminGuestusersAccountriskflagsController,
    ShoppingmallAdminActorsecurityeventsController,
    ShoppingmallAdminCustomersActorsecurityeventsController,
    ShoppingmallAdminSellersActorsecurityeventsController,
    ShoppingmallAdminAdminsActorsecurityeventsController,
    ShoppingmallAdminGuestusersActorsecurityeventsController,
    ShoppingmallAdminActorsSearchController,
    ShoppingmallAdminActorsRisksummaryController,
    ShoppingmallAdminActorsSecurityoverviewController,
    ShoppingmallProductsController,
    ShoppingmallSellerProductsController,
    ShoppingmallAdminProductsController,
    ShoppingmallProductsImagesController,
    ShoppingmallSellerProductsImagesController,
    ShoppingmallAdminProductsLocalizationsController,
    ShoppingmallSellerProductsLocalizationsController,
    ShoppingmallCustomerProductsCategoriesController,
    ShoppingmallSellerProductsCategoriesController,
    ShoppingmallAdminProductsCategoriesController,
    ShoppingmallAdminProducttagsController,
    ShoppingmallProductsTagsController,
    ShoppingmallSellerProductsTagsController,
    ShoppingmallSellerProductsAttributesController,
    ShoppingmallAdminProductsAttributesController,
    ShoppingmallAdminProductsAttributesValuesController,
    ShoppingmallSellerProductsAttributesValuesController,
    ShoppingmallSellerProductsSkusController,
    ShoppingmallAdminProductsSkusController,
    ShoppingmallProductsSkusController,
    ShoppingmallAdminSkusController,
    ShoppingmallSellerSkusAttributevaluesController,
    ShoppingmallAdminSkusAttributevaluesController,
    ShoppingmallAdminSkusExternalidsController,
    ShoppingmallAdminSkuinventorystatesController,
    ShoppingmallAdminCatalogvisibilityrulesController,
    ShoppingmallCatalogsearchController,
    ShoppingmallAdminCatalogsearchIndexentriesController,
    ShoppingmallAdminCatalogblockreasonsController,
    ShoppingmallCatalogOverviewController,
    ShoppingmallCatalogStatisticsProductavailabilityController,
    ShoppingmallAdminCatalogStatisticsTopsellingskusController,
    ShoppingmallAdminCatalogStatisticsBlockreasonbreakdownController,
    ShoppingmallAdminCartsController,
    ShoppingmallCustomerCartsController,
    ShoppingmallGuestuserCartsController,
    ShoppingmallCustomerCartsItemsController,
    ShoppingmallAdminCartsItemsValidationsController,
    ShoppingmallAdminCartsMergeeventsController,
    ShoppingmallCustomerWishlistsController,
    ShoppingmallAdminWishlistsController,
    ShoppingmallCustomerWishlistsItemsController,
    ShoppingmallCustomerWishlistsMergeeventsController,
    ShoppingmallCustomerCartsCheckoutpreviewController,
    ShoppingmallAdminCartsAnalyticsFrictionController,
    ShoppingmallAdminWishlistsAnalyticsEngagementController,
    ShoppingmallAdminWishlistsMergeeventsController,
    ShoppingmallAdminOrdersController,
    ShoppingmallCustomerOrdersController,
    ShoppingmallCustomerOrdersItemsController,
    ShoppingmallAdminOrdersItemsellersController,
    ShoppingmallAdminOrdersItemsSellerController,
    ShoppingmallOrdersPricesnapshotsController,
    ShoppingmallCustomerOrdersPricesnapshotsController,
    ShoppingmallSellerOrdersPricesnapshotsController,
    ShoppingmallAdminOrdersPricesnapshotsController,
    ShoppingmallCustomerOrdersStatushistoriesController,
    ShoppingmallAdminOrdersStatushistoriesController,
    ShoppingmallCustomerOrdersCustomercontactController,
    ShoppingmallAdminOrdersCustomercontactController,
    ShoppingmallOrdersShippingaddressController,
    ShoppingmallCustomerOrdersShippingaddressController,
    ShoppingmallAdminOrdersShippingaddressController,
    ShoppingmallAdminShippingmethodsController,
    ShoppingmallShippingmethodsController,
    ShoppingmallAdminShipmentsController,
    ShoppingmallCustomerOrdersShipmentsController,
    ShoppingmallSellerOrdersShipmentsController,
    ShoppingmallAdminOrdersShipmentsController,
    ShoppingmallAdminShipmentsItemsController,
    ShoppingmallShipmentsEventsController,
    ShoppingmallAdminShipmentsEventsController,
    ShoppingmallCustomerOrdersTimelineController,
    ShoppingmallCustomerOrdersTrackingController,
    ShoppingmallCustomerShipmentsTrackingController,
    ShoppingmallGuestuserShipmentsTrackingController,
    ShoppingmallAdminAnalyticsOrderstatusController,
    ShoppingmallAdminAnalyticsShippingperformanceController,
    ShoppingmallAdminSearchOrdersController,
    ShoppingmallCustomerSearchShipmentsController,
    ShoppingmallAdminPaymentmethodsController,
    ShoppingmallAdminPaymentmethodsSurchargesController,
    ShoppingmallCustomerOrdersPaymentsController,
    ShoppingmallSellerOrdersPaymentsController,
    ShoppingmallAdminOrdersPaymentsController,
    ShoppingmallGuestuserOrdersPaymentsController,
    ShoppingmallCustomerCustomersPaymentsController,
    ShoppingmallAdminPaymentsController,
    ShoppingmallAdminPaymentsAttemptsController,
    ShoppingmallAdminPaymentsStatushistoriesController,
    ShoppingmallAdminPaymentsRefundsController,
    ShoppingmallAdminPaymentsRefundsItemsController,
    ShoppingmallAdminPaymentsChargebacksController,
    ShoppingmallAdminPaymentsReconciliationeventsController,
    ShoppingmallSellerSellersEarningsController,
    ShoppingmallAdminSellersEarningsController,
    ShoppingmallAdminSellerearningsController,
    ShoppingmallAdminPayoutbatchesController,
    ShoppingmallAdminPayoutbatchesItemsController,
    ShoppingmallAdminAnalyticsPaymentmethodsStatsController,
    ShoppingmallAdminAnalyticsPaymentsSummaryController,
    ShoppingmallAdminAnalyticsRefundsSummaryController,
    ShoppingmallAdminAnalyticsChargebacksSummaryController,
    ShoppingmallAdminAnalyticsSellerearningsSummaryController,
    ShoppingmallAdminAnalyticsPayoutsSummaryController,
    ShoppingmallAdminCancellationrequestsController,
    ShoppingmallCustomerCancellationrequestsController,
    ShoppingmallCancellationrequestsItemsController,
    ShoppingmallCustomerCancellationrequestsItemsController,
    ShoppingmallAdminCancellationrequestsItemsController,
    ShoppingmallAdminRefundrequestsController,
    ShoppingmallAdminRefundrequestsItemsController,
    ShoppingmallCustomerRefundrequestsItemsController,
    ShoppingmallAdminRefundrequestsStatushistoriesController,
    ShoppingmallAdminRefundrequestreasonsController,
    ShoppingmallAdminDisputesController,
    ShoppingmallCustomerDisputesController,
    ShoppingmallSellerDisputesController,
    ShoppingmallAdminDisputesPartiesController,
    ShoppingmallAdminDisputesEventsController,
    ShoppingmallAdminDisputesEvidencesController,
    ShoppingmallAdminCaseslaconfigsController,
    ShoppingmallAdminCaseslaviolationsController,
    ShoppingmallAdminRefundsanddisputesDashboardController,
    ShoppingmallAdminRefundsanddisputesStatisticsRefundsbystatusController,
    ShoppingmallAdminRefundsanddisputesStatisticsDisputesbystatusController,
    ShoppingmallAdminRefundsanddisputesStatisticsSlacomplianceController,
    ShoppingmallAdminRefundsanddisputesSearchCasesController,
    ShoppingmallReviewsController,
    ShoppingmallCustomerReviewsController,
    ShoppingmallProductsReviewsController,
    ShoppingmallCustomerProductsReviewsController,
    ShoppingmallSkusReviewsController,
    ShoppingmallCustomerSkusReviewsController,
    ShoppingmallAdminSkusReviewsController,
    ShoppingmallCustomerCustomersReviewsController,
    ShoppingmallCustomerOrderitemsReviewsController,
    ShoppingmallAdminReviewversionsController,
    ShoppingmallAdminReviewsVersionsController,
    ShoppingmallAdminReviewreportsController,
    ShoppingmallCustomerReviewreportsController,
    ShoppingmallAdminReviewsReportsController,
    ShoppingmallCustomerReviewsReportsController,
    ShoppingmallAdminReviewsModerationactionsController,
    ShoppingmallAdminReviewhelpfulvotesController,
    ShoppingmallCustomerReviewhelpfulvotesController,
    ShoppingmallCustomerReviewsHelpfulvotesController,
    ShoppingmallCustomerCustomersHelpfulvotesController,
    ShoppingmallAdminCustomersHelpfulvotesController,
    ShoppingmallProductsRatingaggregatesController,
    ShoppingmallSkusRatingaggregatesController,
    ShoppingmallRatingaggregatesProductsController,
    ShoppingmallRatingaggregatesSkusController,
    ShoppingmallCustomerRevieweligibilitiesController,
    ShoppingmallAdminRevieweligibilitiesController,
    ShoppingmallCustomerCustomersRevieweligibilitiesController,
    ShoppingmallCustomerOrderitemsRevieweligibilitiesController,
    ShoppingmallAdminAnalyticsReviewsDistributionController,
    ShoppingmallAdminAnalyticsReviewsHelpfulnessController,
    ShoppingmallAdminAnalyticsReviewsVolumeController,
    ShoppingmallAdminAnalyticsReviewsModerationController,
    ShoppingmallSellerSellerwarehousesController,
    ShoppingmallSellerSellerwarehousesAddressController,
    ShoppingmallAdminSellerwarehousesAddressController,
    ShoppingmallAdminInventoryadjustmentreasonsController,
    ShoppingmallAdminInventoryadjustmentsController,
    ShoppingmallAdminSellerordermetricssnapshotsController,
    ShoppingmallAdminSellerperformancesnapshotsController,
    ShoppingmallSellersubscriptionplansController,
    ShoppingmallAdminSellersubscriptionplansController,
    ShoppingmallAdminSellersubscriptionsController,
    ShoppingmallAdminSellerfeechargesController,
    ShoppingmallAdminAnalyticsSellerordermetricsController,
    ShoppingmallAdminAnalyticsSellerperformanceController,
    ShoppingmallSellerDashboardSelleroverviewController,
    ShoppingmallSellerAnalyticsSellerfeesController,
    ShoppingmallAdminAnalyticsSellersubscriptionsController,
    ShoppingmallAdminAnalyticsSellerinventoryadjustmentsController,
    ShoppingmallAdminAdminrolesController,
    ShoppingmallAdminAdminrolesAssignmentsController,
    ShoppingmallAdminAdminroleassignmentsController,
    ShoppingmallAdminAdminpermissionsController,
    ShoppingmallAdminAdminauditlogsController,
    ShoppingmallAdminLegalholdsController,
    ShoppingmallAdminLegalholdsTargetsController,
    ShoppingmallAdminRiskcasesController,
    ShoppingmallAdminRiskcasesEventsController,
    ShoppingmallAdminPolicyoverridesController,
    ShoppingmallAdminAdminnotificationsController,
    ShoppingmallAdminAdmindashboardGovernanceoverviewController,
    ShoppingmallAdminAdmindashboardRiskoverviewController,
    ShoppingmallAdminAdmindashboardLegalholdoverviewController,
    ShoppingmallAdminAdmindashboardNotificationsSummaryController,
    ShoppingmallAdminAdminsearchAuditlogsController,
    ShoppingmallAdminAdminsearchRiskcasesController,
    ShoppingmallAdminAdminsearchLegalholdsController,
    ShoppingmallAdminAdminsearchPolicyoverridesController,
    ShoppingmallAdminAdminsearchAdminnotificationsController,
    ShoppingmallAdminStatisticsAdminactivitiesController,
    ShoppingmallAdminStatisticsRiskcasesbystatusController,
    ShoppingmallAdminStatisticsLegalholdsbystatusController,
    ShoppingmallAdminStatisticsPolicyoverridesbystatusController,
    ShoppingmallAdminAnalyticsOrderdailystatsController,
    ShoppingmallAdminAnalyticsSellerdailystatsController,
    ShoppingmallAdminAnalyticsCustomerdailystatsController,
    ShoppingmallAdminAnalyticsCampaignmetricsController,
    ShoppingmallAdminAnalyticsPlatformkpisnapshotsController,
    ShoppingmallAdminAnalyticsPaymentmethodstatsController,
    ShoppingmallAdminAnalyticsShippingperformancestatsController,
    ShoppingmallAdminAnalyticsRefundanddisputestatsController,
    ShoppingmallAdminDashboardAdminoverviewController,
    ShoppingmallAdminStatisticsCustomeractivitybydayController,
    ShoppingmallAdminStatisticsCampaignperformancebydayController,
    ShoppingmallAdminStatisticsPaymentmethodperformancebydayController,
    ShoppingmallAdminStatisticsShippingperformancebydayController,
    ShoppingmallAdminAnalyticsPlatformkpisController,
  ],
})
export class MyModule {}
