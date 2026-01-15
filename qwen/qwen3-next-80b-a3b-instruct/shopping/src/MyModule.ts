import { Module } from "@nestjs/common";

import { AuthCustomerController } from "./controllers/auth/customer/AuthCustomerController";
import { AuthCustomerSelfController } from "./controllers/auth/customer/self/AuthCustomerSelfController";
import { AuthSellerProductsController } from "./controllers/auth/seller/products/AuthSellerProductsController";
import { AuthSellerController } from "./controllers/auth/seller/AuthSellerController";
import { AuthAdminController } from "./controllers/auth/admin/AuthAdminController";
import { AuthAdminAccountDeactivateController } from "./controllers/auth/admin/account/deactivate/AuthAdminAccountDeactivateController";
import { ShoppingmallChannelsController } from "./controllers/shoppingMall/channels/ShoppingmallChannelsController";
import { ShoppingmallAdminChannelsController } from "./controllers/shoppingMall/admin/channels/ShoppingmallAdminChannelsController";
import { ShoppingmallSectionsController } from "./controllers/shoppingMall/sections/ShoppingmallSectionsController";
import { ShoppingmallAdminSectionsController } from "./controllers/shoppingMall/admin/sections/ShoppingmallAdminSectionsController";
import { ShoppingmallConfigurationsController } from "./controllers/shoppingMall/configurations/ShoppingmallConfigurationsController";
import { ShoppingmallCustomerConfigurationsController } from "./controllers/shoppingMall/customer/configurations/ShoppingmallCustomerConfigurationsController";
import { ShoppingmallAdminConfigurationsController } from "./controllers/shoppingMall/admin/configurations/ShoppingmallAdminConfigurationsController";
import { ShoppingmallAdminCustomersController } from "./controllers/shoppingMall/admin/customers/ShoppingmallAdminCustomersController";
import { ShoppingmallAdminSellersController } from "./controllers/shoppingMall/admin/sellers/ShoppingmallAdminSellersController";
import { ShoppingmallAdminAdminsController } from "./controllers/shoppingMall/admin/admins/ShoppingmallAdminAdminsController";
import { ShoppingmallCustomerCustomersController } from "./controllers/shoppingMall/customer/customers/ShoppingmallCustomerCustomersController";
import { ShoppingmallSellerSellersController } from "./controllers/shoppingMall/seller/sellers/ShoppingmallSellerSellersController";
import { ShoppingmallAdminCategoriesController } from "./controllers/shoppingMall/admin/categories/ShoppingmallAdminCategoriesController";
import { ShoppingmallCustomerProductsController } from "./controllers/shoppingMall/customer/products/ShoppingmallCustomerProductsController";
import { ShoppingmallAdminProductsController } from "./controllers/shoppingMall/admin/products/ShoppingmallAdminProductsController";
import { ShoppingmallCustomerProductsSecondary_categoriesController } from "./controllers/shoppingMall/customer/products/secondary-categories/ShoppingmallCustomerProductsSecondary_categoriesController";
import { ShoppingmallProductsSecondary_categoriesController } from "./controllers/shoppingMall/products/secondary-categories/ShoppingmallProductsSecondary_categoriesController";
import { ShoppingmallSellerProductsSecondary_categoriesController } from "./controllers/shoppingMall/seller/products/secondary-categories/ShoppingmallSellerProductsSecondary_categoriesController";
import { ShoppingmallAdminProductsSecondary_categoriesController } from "./controllers/shoppingMall/admin/products/secondary-categories/ShoppingmallAdminProductsSecondary_categoriesController";
import { ShoppingmallProductsAttributesController } from "./controllers/shoppingMall/products/attributes/ShoppingmallProductsAttributesController";
import { ShoppingmallSellerProductsAttributesController } from "./controllers/shoppingMall/seller/products/attributes/ShoppingmallSellerProductsAttributesController";
import { ShoppingmallAdminProductsAttributesController } from "./controllers/shoppingMall/admin/products/attributes/ShoppingmallAdminProductsAttributesController";
import { ShoppingmallAdminProductsAttributesValuesController } from "./controllers/shoppingMall/admin/products/attributes/values/ShoppingmallAdminProductsAttributesValuesController";
import { ShoppingmallSellerProductsAttributesValuesController } from "./controllers/shoppingMall/seller/products/attributes/values/ShoppingmallSellerProductsAttributesValuesController";
import { ShoppingmallCustomerProductsImagesController } from "./controllers/shoppingMall/customer/products/images/ShoppingmallCustomerProductsImagesController";
import { ShoppingmallSellerProductsImagesController } from "./controllers/shoppingMall/seller/products/images/ShoppingmallSellerProductsImagesController";
import { ShoppingmallAdminProductsImagesController } from "./controllers/shoppingMall/admin/products/images/ShoppingmallAdminProductsImagesController";
import { ShoppingmallCustomerProductsTagsController } from "./controllers/shoppingMall/customer/products/tags/ShoppingmallCustomerProductsTagsController";
import { ShoppingmallSellerProductsTagsController } from "./controllers/shoppingMall/seller/products/tags/ShoppingmallSellerProductsTagsController";
import { ShoppingmallAdminProductsTagsController } from "./controllers/shoppingMall/admin/products/tags/ShoppingmallAdminProductsTagsController";
import { ShoppingmallCustomerProductsReviewsController } from "./controllers/shoppingMall/customer/products/reviews/ShoppingmallCustomerProductsReviewsController";
import { ShoppingmallAdminProductsReviewsController } from "./controllers/shoppingMall/admin/products/reviews/ShoppingmallAdminProductsReviewsController";
import { ShoppingmallCustomerProductsReviewsVotesController } from "./controllers/shoppingMall/customer/products/reviews/votes/ShoppingmallCustomerProductsReviewsVotesController";
import { ShoppingmallCustomerProductsQuestionsController } from "./controllers/shoppingMall/customer/products/questions/ShoppingmallCustomerProductsQuestionsController";
import { ShoppingmallAdminProductsQuestionsController } from "./controllers/shoppingMall/admin/products/questions/ShoppingmallAdminProductsQuestionsController";
import { ShoppingmallCustomerProductsQuestionsAnswersController } from "./controllers/shoppingMall/customer/products/questions/answers/ShoppingmallCustomerProductsQuestionsAnswersController";
import { ShoppingmallCustomerProductsVariantsAttributesController } from "./controllers/shoppingMall/customer/products/variants/attributes/ShoppingmallCustomerProductsVariantsAttributesController";
import { ShoppingmallSellerProductsVariantsAttributesController } from "./controllers/shoppingMall/seller/products/variants/attributes/ShoppingmallSellerProductsVariantsAttributesController";
import { ShoppingmallAdminProductsVariantsAttributesController } from "./controllers/shoppingMall/admin/products/variants/attributes/ShoppingmallAdminProductsVariantsAttributesController";
import { ShoppingmallProductsVariantsAttributesController } from "./controllers/shoppingMall/products/variants/attributes/ShoppingmallProductsVariantsAttributesController";
import { ShoppingmallSellerProductsVariantsController } from "./controllers/shoppingMall/seller/products/variants/ShoppingmallSellerProductsVariantsController";
import { ShoppingmallAdminProductsVariantsController } from "./controllers/shoppingMall/admin/products/variants/ShoppingmallAdminProductsVariantsController";
import { ShoppingmallProductsReviewsVotesController } from "./controllers/shoppingMall/products/reviews/votes/ShoppingmallProductsReviewsVotesController";
import { ShoppingmallAdminProductsQuestionsAnswersController } from "./controllers/shoppingMall/admin/products/questions/answers/ShoppingmallAdminProductsQuestionsAnswersController";
import { ShoppingmallAdminBrandsController } from "./controllers/shoppingMall/admin/brands/ShoppingmallAdminBrandsController";
import { ShoppingmallSellerBrandsController } from "./controllers/shoppingMall/seller/brands/ShoppingmallSellerBrandsController";
import { ShoppingmallBrandsController } from "./controllers/shoppingMall/brands/ShoppingmallBrandsController";
import { ShoppingmallCategoriesController } from "./controllers/shoppingMall/categories/ShoppingmallCategoriesController";
import { ShoppingmallProductsController } from "./controllers/shoppingMall/products/ShoppingmallProductsController";
import { ShoppingmallProductsImagesController } from "./controllers/shoppingMall/products/images/ShoppingmallProductsImagesController";
import { ShoppingmallProductsTagsController } from "./controllers/shoppingMall/products/tags/ShoppingmallProductsTagsController";
import { ShoppingmallProductsReviewsController } from "./controllers/shoppingMall/products/reviews/ShoppingmallProductsReviewsController";
import { ShoppingmallCustomerProductsVariantsController } from "./controllers/shoppingMall/customer/products/variants/ShoppingmallCustomerProductsVariantsController";
import { ShoppingmallProductsVariantsController } from "./controllers/shoppingMall/products/variants/ShoppingmallProductsVariantsController";
import { ShoppingmallCustomerProductsAttributesController } from "./controllers/shoppingMall/customer/products/attributes/ShoppingmallCustomerProductsAttributesController";
import { ShoppingmallCustomerProductsAttributesValuesController } from "./controllers/shoppingMall/customer/products/attributes/values/ShoppingmallCustomerProductsAttributesValuesController";
import { ShoppingmallProductsAttributesValuesController } from "./controllers/shoppingMall/products/attributes/values/ShoppingmallProductsAttributesValuesController";
import { ShoppingmallProductsQuestionsAnswersController } from "./controllers/shoppingMall/products/questions/answers/ShoppingmallProductsQuestionsAnswersController";
import { ShoppingmallCustomerProductsView_statsController } from "./controllers/shoppingMall/customer/products/view-stats/ShoppingmallCustomerProductsView_statsController";
import { ShoppingmallAdminProductsView_statsController } from "./controllers/shoppingMall/admin/products/view-stats/ShoppingmallAdminProductsView_statsController";
import { ShoppingmallCustomerProductsSales_statsController } from "./controllers/shoppingMall/customer/products/sales-stats/ShoppingmallCustomerProductsSales_statsController";
import { ShoppingmallAdminProductsSales_statsController } from "./controllers/shoppingMall/admin/products/sales-stats/ShoppingmallAdminProductsSales_statsController";
import { ShoppingmallAdminProductsSnapshotsController } from "./controllers/shoppingMall/admin/products/snapshots/ShoppingmallAdminProductsSnapshotsController";
import { ShoppingmallProductsSnapshotsController } from "./controllers/shoppingMall/products/snapshots/ShoppingmallProductsSnapshotsController";
import { ShoppingmallCustomerBrandsController } from "./controllers/shoppingMall/customer/brands/ShoppingmallCustomerBrandsController";
import { ShoppingmallProduct_variantsAttributesController } from "./controllers/shoppingMall/product-variants/attributes/ShoppingmallProduct_variantsAttributesController";
import { ShoppingmallAdminProduct_variantsAttributesController } from "./controllers/shoppingMall/admin/product-variants/attributes/ShoppingmallAdminProduct_variantsAttributesController";
import { ShoppingmallProduct_variantsAttribute_valuesController } from "./controllers/shoppingMall/product-variants/attribute-values/ShoppingmallProduct_variantsAttribute_valuesController";
import { ShoppingmallAdminProduct_variantsAttribute_valuesController } from "./controllers/shoppingMall/admin/product-variants/attribute-values/ShoppingmallAdminProduct_variantsAttribute_valuesController";
import { ShoppingmallSellerProductsController } from "./controllers/shoppingMall/seller/products/ShoppingmallSellerProductsController";
import { ShoppingmallCustomerProductsSkusController } from "./controllers/shoppingMall/customer/products/skus/ShoppingmallCustomerProductsSkusController";
import { ShoppingmallAdminProductsSkusController } from "./controllers/shoppingMall/admin/products/skus/ShoppingmallAdminProductsSkusController";
import { ShoppingmallProductsSkusController } from "./controllers/shoppingMall/products/skus/ShoppingmallProductsSkusController";
import { ShoppingmallSellerProductsSkusController } from "./controllers/shoppingMall/seller/products/skus/ShoppingmallSellerProductsSkusController";
import { ShoppingmallCustomerProductsInventoryController } from "./controllers/shoppingMall/customer/products/inventory/ShoppingmallCustomerProductsInventoryController";
import { ShoppingmallSellerProductsInventoryController } from "./controllers/shoppingMall/seller/products/inventory/ShoppingmallSellerProductsInventoryController";
import { ShoppingmallAdminProductsInventoryController } from "./controllers/shoppingMall/admin/products/inventory/ShoppingmallAdminProductsInventoryController";
import { ShoppingmallProductsInventoryController } from "./controllers/shoppingMall/products/inventory/ShoppingmallProductsInventoryController";
import { ShoppingmallProductsPricingController } from "./controllers/shoppingMall/products/pricing/ShoppingmallProductsPricingController";
import { ShoppingmallCustomerProductsPricingController } from "./controllers/shoppingMall/customer/products/pricing/ShoppingmallCustomerProductsPricingController";
import { ShoppingmallAdminProductsPricingController } from "./controllers/shoppingMall/admin/products/pricing/ShoppingmallAdminProductsPricingController";
import { ShoppingmallProductsCompatibilitiesController } from "./controllers/shoppingMall/products/compatibilities/ShoppingmallProductsCompatibilitiesController";
import { ShoppingmallSellerProductsCompatibilitiesController } from "./controllers/shoppingMall/seller/products/compatibilities/ShoppingmallSellerProductsCompatibilitiesController";
import { ShoppingmallSellerProductsTemplatesController } from "./controllers/shoppingMall/seller/products/templates/ShoppingmallSellerProductsTemplatesController";
import { ShoppingmallAdminProductsTemplatesController } from "./controllers/shoppingMall/admin/products/templates/ShoppingmallAdminProductsTemplatesController";
import { ShoppingmallProductsTemplatesController } from "./controllers/shoppingMall/products/templates/ShoppingmallProductsTemplatesController";
import { ShoppingmallProductsAvailabilitiesController } from "./controllers/shoppingMall/products/availabilities/ShoppingmallProductsAvailabilitiesController";
import { ShoppingmallCustomerCartsController } from "./controllers/shoppingMall/customer/carts/ShoppingmallCustomerCartsController";
import { ShoppingmallCustomerCartsItemsController } from "./controllers/shoppingMall/customer/carts/items/ShoppingmallCustomerCartsItemsController";
import { ShoppingmallAdminCartsItemsController } from "./controllers/shoppingMall/admin/carts/items/ShoppingmallAdminCartsItemsController";
import { ShoppingmallCustomerWishlistsItemsController } from "./controllers/shoppingMall/customer/wishlists/items/ShoppingmallCustomerWishlistsItemsController";
import { ShoppingmallCustomerCart_sessionsController } from "./controllers/shoppingMall/customer/cart-sessions/ShoppingmallCustomerCart_sessionsController";
import { ShoppingmallCart_sessionsController } from "./controllers/shoppingMall/cart-sessions/ShoppingmallCart_sessionsController";
import { ShoppingmallOrdersController } from "./controllers/shoppingMall/orders/ShoppingmallOrdersController";
import { ShoppingmallCustomerOrdersController } from "./controllers/shoppingMall/customer/orders/ShoppingmallCustomerOrdersController";
import { ShoppingmallAdminOrdersController } from "./controllers/shoppingMall/admin/orders/ShoppingmallAdminOrdersController";
import { ShoppingmallCustomerOrdersItemsController } from "./controllers/shoppingMall/customer/orders/items/ShoppingmallCustomerOrdersItemsController";
import { ShoppingmallSellerOrdersItemsController } from "./controllers/shoppingMall/seller/orders/items/ShoppingmallSellerOrdersItemsController";
import { ShoppingmallAdminOrdersItemsController } from "./controllers/shoppingMall/admin/orders/items/ShoppingmallAdminOrdersItemsController";
import { ShoppingmallCustomerOrdersAddressesController } from "./controllers/shoppingMall/customer/orders/addresses/ShoppingmallCustomerOrdersAddressesController";
import { ShoppingmallOrdersAddressesController } from "./controllers/shoppingMall/orders/addresses/ShoppingmallOrdersAddressesController";
import { ShoppingmallAdminOrdersAddressesController } from "./controllers/shoppingMall/admin/orders/addresses/ShoppingmallAdminOrdersAddressesController";
import { ShoppingmallCustomerOrdersPaymentsController } from "./controllers/shoppingMall/customer/orders/payments/ShoppingmallCustomerOrdersPaymentsController";
import { ShoppingmallAdminOrdersPaymentsController } from "./controllers/shoppingMall/admin/orders/payments/ShoppingmallAdminOrdersPaymentsController";
import { ShoppingmallCustomerOrdersEventsController } from "./controllers/shoppingMall/customer/orders/events/ShoppingmallCustomerOrdersEventsController";
import { ShoppingmallAdminOrdersEventsController } from "./controllers/shoppingMall/admin/orders/events/ShoppingmallAdminOrdersEventsController";
import { ShoppingmallOrdersReturnsController } from "./controllers/shoppingMall/orders/returns/ShoppingmallOrdersReturnsController";
import { ShoppingmallCustomerOrdersReturnsController } from "./controllers/shoppingMall/customer/orders/returns/ShoppingmallCustomerOrdersReturnsController";
import { ShoppingmallAdminOrdersReturnsController } from "./controllers/shoppingMall/admin/orders/returns/ShoppingmallAdminOrdersReturnsController";
import { ShoppingmallSellerOrdersReturnsController } from "./controllers/shoppingMall/seller/orders/returns/ShoppingmallSellerOrdersReturnsController";
import { ShoppingmallCustomerOrdersRefundsController } from "./controllers/shoppingMall/customer/orders/refunds/ShoppingmallCustomerOrdersRefundsController";
import { ShoppingmallAdminOrdersRefundsController } from "./controllers/shoppingMall/admin/orders/refunds/ShoppingmallAdminOrdersRefundsController";
import { ShoppingmallOrdersDeliveriesController } from "./controllers/shoppingMall/orders/deliveries/ShoppingmallOrdersDeliveriesController";
import { ShoppingmallAdminOrdersDeliveriesController } from "./controllers/shoppingMall/admin/orders/deliveries/ShoppingmallAdminOrdersDeliveriesController";
import { ShoppingmallSellerOrdersDeliveriesController } from "./controllers/shoppingMall/seller/orders/deliveries/ShoppingmallSellerOrdersDeliveriesController";
import { ShoppingmallPayment_methodsController } from "./controllers/shoppingMall/payment-methods/ShoppingmallPayment_methodsController";
import { ShoppingmallAdminPayment_methodsController } from "./controllers/shoppingMall/admin/payment-methods/ShoppingmallAdminPayment_methodsController";
import { ShoppingmallAdminPayment_intentsController } from "./controllers/shoppingMall/admin/payment-intents/ShoppingmallAdminPayment_intentsController";
import { ShoppingmallPayment_intentsController } from "./controllers/shoppingMall/payment-intents/ShoppingmallPayment_intentsController";
import { ShoppingmallCustomerPayment_intentsController } from "./controllers/shoppingMall/customer/payment-intents/ShoppingmallCustomerPayment_intentsController";
import { ShoppingmallCustomerPaymentsController } from "./controllers/shoppingMall/customer/payments/ShoppingmallCustomerPaymentsController";
import { ShoppingmallAdminPaymentsController } from "./controllers/shoppingMall/admin/payments/ShoppingmallAdminPaymentsController";
import { ShoppingmallPaymentsController } from "./controllers/shoppingMall/payments/ShoppingmallPaymentsController";
import { ShoppingmallSellerPaymentsController } from "./controllers/shoppingMall/seller/payments/ShoppingmallSellerPaymentsController";
import { ShoppingmallPayment_refundsController } from "./controllers/shoppingMall/payment-refunds/ShoppingmallPayment_refundsController";
import { ShoppingmallCustomerPayment_refundsController } from "./controllers/shoppingMall/customer/payment-refunds/ShoppingmallCustomerPayment_refundsController";
import { ShoppingmallAdminPayment_refundsController } from "./controllers/shoppingMall/admin/payment-refunds/ShoppingmallAdminPayment_refundsController";
import { ShoppingmallAdminPayment_audit_logsController } from "./controllers/shoppingMall/admin/payment-audit-logs/ShoppingmallAdminPayment_audit_logsController";
import { ShoppingmallAdminPayment_gateway_logsController } from "./controllers/shoppingMall/admin/payment-gateway-logs/ShoppingmallAdminPayment_gateway_logsController";
import { ShoppingmallCustomerPayment_regionsController } from "./controllers/shoppingMall/customer/payment-regions/ShoppingmallCustomerPayment_regionsController";
import { ShoppingmallAdminPayment_regionsController } from "./controllers/shoppingMall/admin/payment-regions/ShoppingmallAdminPayment_regionsController";
import { ShoppingmallPayment_regionsController } from "./controllers/shoppingMall/payment-regions/ShoppingmallPayment_regionsController";
import { ShoppingmallPayment_gateway_failoversController } from "./controllers/shoppingMall/payment-gateway-failovers/ShoppingmallPayment_gateway_failoversController";
import { ShoppingmallAdminPayment_gateway_failoversController } from "./controllers/shoppingMall/admin/payment-gateway-failovers/ShoppingmallAdminPayment_gateway_failoversController";
import { ShoppingmallPayment_tokenizationsController } from "./controllers/shoppingMall/payment-tokenizations/ShoppingmallPayment_tokenizationsController";
import { ShoppingmallCustomerPayment_tokenizationsController } from "./controllers/shoppingMall/customer/payment-tokenizations/ShoppingmallCustomerPayment_tokenizationsController";
import { ShoppingmallAdminPayment_tokenizationsController } from "./controllers/shoppingMall/admin/payment-tokenizations/ShoppingmallAdminPayment_tokenizationsController";
import { ShoppingmallAdminPayment_disputesController } from "./controllers/shoppingMall/admin/payment-disputes/ShoppingmallAdminPayment_disputesController";
import { ShoppingmallCustomerPayment_disputesController } from "./controllers/shoppingMall/customer/payment-disputes/ShoppingmallCustomerPayment_disputesController";
import { ShoppingmallAdminPayment_vault_entriesController } from "./controllers/shoppingMall/admin/payment-vault-entries/ShoppingmallAdminPayment_vault_entriesController";
import { ShoppingmallCustomerPayment_vault_entriesController } from "./controllers/shoppingMall/customer/payment-vault-entries/ShoppingmallCustomerPayment_vault_entriesController";
import { ShoppingmallPayment_exchange_ratesController } from "./controllers/shoppingMall/payment-exchange-rates/ShoppingmallPayment_exchange_ratesController";
import { ShoppingmallAdminPayment_exchange_ratesController } from "./controllers/shoppingMall/admin/payment-exchange-rates/ShoppingmallAdminPayment_exchange_ratesController";
import { ShoppingmallAdminPayment_surcharge_rulesController } from "./controllers/shoppingMall/admin/payment-surcharge-rules/ShoppingmallAdminPayment_surcharge_rulesController";
import { ShoppingmallAdminPayment_rate_limitsController } from "./controllers/shoppingMall/admin/payment-rate-limits/ShoppingmallAdminPayment_rate_limitsController";
import { ShoppingmallAdminPayment_notificationsController } from "./controllers/shoppingMall/admin/payment-notifications/ShoppingmallAdminPayment_notificationsController";
import { ShoppingmallCustomerPayment_notificationsController } from "./controllers/shoppingMall/customer/payment-notifications/ShoppingmallCustomerPayment_notificationsController";
import { ShoppingmallPayment_notificationsController } from "./controllers/shoppingMall/payment-notifications/ShoppingmallPayment_notificationsController";
import { ShoppingmallAdminPayment_settingsController } from "./controllers/shoppingMall/admin/payment-settings/ShoppingmallAdminPayment_settingsController";
import { ShoppingmallPayment_cryptocurrency_conversionsController } from "./controllers/shoppingMall/payment-cryptocurrency-conversions/ShoppingmallPayment_cryptocurrency_conversionsController";
import { ShoppingmallCustomerPayment_cryptocurrency_conversionsController } from "./controllers/shoppingMall/customer/payment-cryptocurrency-conversions/ShoppingmallCustomerPayment_cryptocurrency_conversionsController";
import { ShoppingmallAdminPayment_cryptocurrency_conversionsController } from "./controllers/shoppingMall/admin/payment-cryptocurrency-conversions/ShoppingmallAdminPayment_cryptocurrency_conversionsController";
import { ShoppingmallPayment_webhooksController } from "./controllers/shoppingMall/payment-webhooks/ShoppingmallPayment_webhooksController";
import { ShoppingmallAdminPayment_webhooksController } from "./controllers/shoppingMall/admin/payment-webhooks/ShoppingmallAdminPayment_webhooksController";
import { ShoppingmallAdminPayment_batch_job_logsController } from "./controllers/shoppingMall/admin/payment-batch-job-logs/ShoppingmallAdminPayment_batch_job_logsController";
import { ShoppingmallAdminPayment_reconciliationController } from "./controllers/shoppingMall/admin/payment-reconciliation/ShoppingmallAdminPayment_reconciliationController";
import { ShoppingmallAdminCarriersController } from "./controllers/shoppingMall/admin/carriers/ShoppingmallAdminCarriersController";
import { ShoppingmallSellerCarriersController } from "./controllers/shoppingMall/seller/carriers/ShoppingmallSellerCarriersController";
import { ShoppingmallShipping_methodsController } from "./controllers/shoppingMall/shipping-methods/ShoppingmallShipping_methodsController";
import { ShoppingmallAdminShipping_methodsController } from "./controllers/shoppingMall/admin/shipping-methods/ShoppingmallAdminShipping_methodsController";
import { ShoppingmallAdminDelivery_eventsController } from "./controllers/shoppingMall/admin/delivery-events/ShoppingmallAdminDelivery_eventsController";
import { ShoppingmallDelivery_eventsController } from "./controllers/shoppingMall/delivery-events/ShoppingmallDelivery_eventsController";
import { ShoppingmallShipping_trackingsController } from "./controllers/shoppingMall/ShoppingmallShipping_trackingsController";
import { ShoppingmallCustomerShipping_trackingsController } from "./controllers/shoppingMall/customer/shipping-trackings/ShoppingmallCustomerShipping_trackingsController";
import { ShoppingmallAdminShipping_trackingsController } from "./controllers/shoppingMall/admin/shipping-trackings/ShoppingmallAdminShipping_trackingsController";
import { ShoppingmallSellerShipping_trackingsController } from "./controllers/shoppingMall/seller/shipping-trackings/ShoppingmallSellerShipping_trackingsController";
import { ShoppingmallAdminOrder_shipmentsController } from "./controllers/shoppingMall/admin/order-shipments/ShoppingmallAdminOrder_shipmentsController";
import { ShoppingmallOrder_shipmentsController } from "./controllers/shoppingMall/order-shipments/ShoppingmallOrder_shipmentsController";
import { ShoppingmallCustomerReviewsController } from "./controllers/shoppingMall/customer/reviews/ShoppingmallCustomerReviewsController";
import { ShoppingmallReviewsController } from "./controllers/shoppingMall/reviews/ShoppingmallReviewsController";
import { ShoppingmallAdminReviewsController } from "./controllers/shoppingMall/admin/reviews/ShoppingmallAdminReviewsController";
import { ShoppingmallCustomerReviewsVotesController } from "./controllers/shoppingMall/customer/reviews/votes/ShoppingmallCustomerReviewsVotesController";
import { ShoppingmallReviewsVotesController } from "./controllers/shoppingMall/reviews/votes/ShoppingmallReviewsVotesController";
import { ShoppingmallAdminReviewsVotesController } from "./controllers/shoppingMall/admin/reviews/votes/ShoppingmallAdminReviewsVotesController";
import { ShoppingmallCustomerReviewsFlagsController } from "./controllers/shoppingMall/customer/reviews/flags/ShoppingmallCustomerReviewsFlagsController";
import { ShoppingmallAdminReviewsModeration_logsController } from "./controllers/shoppingMall/admin/reviews/moderation-logs/ShoppingmallAdminReviewsModeration_logsController";
import { ShoppingmallCustomerReviewsImagesController } from "./controllers/shoppingMall/customer/reviews/images/ShoppingmallCustomerReviewsImagesController";
import { ShoppingmallAdminReviewsImagesController } from "./controllers/shoppingMall/admin/reviews/images/ShoppingmallAdminReviewsImagesController";
import { ShoppingmallReviewsRepliesController } from "./controllers/shoppingMall/reviews/replies/ShoppingmallReviewsRepliesController";
import { ShoppingmallCustomerReviewsRepliesController } from "./controllers/shoppingMall/customer/reviews/replies/ShoppingmallCustomerReviewsRepliesController";
import { ShoppingmallAdminReviewsRepliesController } from "./controllers/shoppingMall/admin/reviews/replies/ShoppingmallAdminReviewsRepliesController";
import { ShoppingmallSellerReviewsImagesController } from "./controllers/shoppingMall/seller/reviews/images/ShoppingmallSellerReviewsImagesController";
import { ShoppingmallAdminSellersVerification_documentsController } from "./controllers/shoppingMall/admin/sellers/verification-documents/ShoppingmallAdminSellersVerification_documentsController";
import { ShoppingmallSellersVerification_documentsController } from "./controllers/shoppingMall/sellers/verification-documents/ShoppingmallSellersVerification_documentsController";
import { ShoppingmallSellerSellersVerification_documentsController } from "./controllers/shoppingMall/seller/sellers/verification-documents/ShoppingmallSellerSellersVerification_documentsController";
import { ShoppingmallAdminSellersBank_accountsController } from "./controllers/shoppingMall/admin/sellers/bank-accounts/ShoppingmallAdminSellersBank_accountsController";
import { ShoppingmallSellerSellersBank_accountsController } from "./controllers/shoppingMall/seller/sellers/bank-accounts/ShoppingmallSellerSellersBank_accountsController";
import { ShoppingmallSellerSellersDashboard_settingsController } from "./controllers/shoppingMall/seller/sellers/dashboard-settings/ShoppingmallSellerSellersDashboard_settingsController";
import { ShoppingmallSellerSellersOnboarding_completionController } from "./controllers/shoppingMall/seller/sellers/onboarding-completion/ShoppingmallSellerSellersOnboarding_completionController";
import { ShoppingmallSellersOnboarding_completionController } from "./controllers/shoppingMall/sellers/onboarding-completion/ShoppingmallSellersOnboarding_completionController";
import { ShoppingmallAdminSellersOnboarding_completionController } from "./controllers/shoppingMall/admin/sellers/onboarding-completion/ShoppingmallAdminSellersOnboarding_completionController";
import { ShoppingmallSellersPerformance_metricsController } from "./controllers/shoppingMall/sellers/performance-metrics/ShoppingmallSellersPerformance_metricsController";
import { ShoppingmallSellerSellersPerformance_metricsController } from "./controllers/shoppingMall/seller/sellers/performance-metrics/ShoppingmallSellerSellersPerformance_metricsController";
import { ShoppingmallAdminSellersPerformance_metricsController } from "./controllers/shoppingMall/admin/sellers/performance-metrics/ShoppingmallAdminSellersPerformance_metricsController";
import { ShoppingmallAdminSellersCommunication_logsController } from "./controllers/shoppingMall/admin/sellers/communication-logs/ShoppingmallAdminSellersCommunication_logsController";
import { ShoppingmallSellerSellersCommunication_logsController } from "./controllers/shoppingMall/seller/sellers/communication-logs/ShoppingmallSellerSellersCommunication_logsController";
import { ShoppingmallAdminSellersCompliance_historyController } from "./controllers/shoppingMall/admin/sellers/compliance-history/ShoppingmallAdminSellersCompliance_historyController";
import { ShoppingmallSellerSellersSubscription_tiersController } from "./controllers/shoppingMall/seller/sellers/subscription-tiers/ShoppingmallSellerSellersSubscription_tiersController";
import { ShoppingmallAdminSellersSubscription_tiersController } from "./controllers/shoppingMall/admin/sellers/subscription-tiers/ShoppingmallAdminSellersSubscription_tiersController";
import { ShoppingmallAuditLogsController } from "./controllers/shoppingMall/audit/logs/ShoppingmallAuditLogsController";
import { ShoppingmallAdminPlatformConfigurationsController } from "./controllers/shoppingMall/admin/platform/configurations/ShoppingmallAdminPlatformConfigurationsController";
import { ShoppingmallPlatformConfigurationsController } from "./controllers/shoppingMall/platform/configurations/ShoppingmallPlatformConfigurationsController";
import { ShoppingmallAdminEmailTemplatesController } from "./controllers/shoppingMall/admin/email/templates/ShoppingmallAdminEmailTemplatesController";
import { ShoppingmallAdminSecurityPoliciesController } from "./controllers/shoppingMall/admin/security/policies/ShoppingmallAdminSecurityPoliciesController";
import { ShoppingmallAdminComplianceRecordsController } from "./controllers/shoppingMall/admin/compliance/records/ShoppingmallAdminComplianceRecordsController";
import { ShoppingmallComplianceRecordsController } from "./controllers/shoppingMall/compliance/records/ShoppingmallComplianceRecordsController";
import { ShoppingmallAdminConfigHistoryController } from "./controllers/shoppingMall/admin/config/history/ShoppingmallAdminConfigHistoryController";
import { ShoppingmallAdminDataExportsController } from "./controllers/shoppingMall/admin/data/exports/ShoppingmallAdminDataExportsController";
import { ShoppingmallSellerDataExportsController } from "./controllers/shoppingMall/seller/data/exports/ShoppingmallSellerDataExportsController";
import { ShoppingmallCustomerDataExportsController } from "./controllers/shoppingMall/customer/data/exports/ShoppingmallCustomerDataExportsController";
import { ShoppingmallAdminMonitoringAlertsController } from "./controllers/shoppingMall/admin/monitoring/alerts/ShoppingmallAdminMonitoringAlertsController";
import { ShoppingmallUserFlagsController } from "./controllers/shoppingMall/user/flags/ShoppingmallUserFlagsController";
import { ShoppingmallCustomerUserFlagsController } from "./controllers/shoppingMall/customer/user/flags/ShoppingmallCustomerUserFlagsController";
import { ShoppingmallAdminAuditLogsController } from "./controllers/shoppingMall/admin/audit/logs/ShoppingmallAdminAuditLogsController";
import { ShoppingmallAdminUserFlagsController } from "./controllers/shoppingMall/admin/user/flags/ShoppingmallAdminUserFlagsController";
import { ShoppingmallAdminAnalyticsProductsController } from "./controllers/shoppingMall/admin/analytics/products/ShoppingmallAdminAnalyticsProductsController";
import { ShoppingmallAnalyticsOrder_itemsController } from "./controllers/shoppingMall/analytics/order-items/ShoppingmallAnalyticsOrder_itemsController";
import { ShoppingmallAdminAnalyticsOrder_paymentsController } from "./controllers/shoppingMall/admin/analytics/order-payments/ShoppingmallAdminAnalyticsOrder_paymentsController";
import { ShoppingmallAdminAnalyticsPaymentsController } from "./controllers/shoppingMall/admin/analytics/payments/ShoppingmallAdminAnalyticsPaymentsController";
import { ShoppingmallAdminAnalyticsProduct_reviewsController } from "./controllers/shoppingMall/admin/analytics/product-reviews/ShoppingmallAdminAnalyticsProduct_reviewsController";
import { ShoppingmallAdminAnalyticsSeller_performance_metricsController } from "./controllers/shoppingMall/admin/analytics/seller-performance-metrics/ShoppingmallAdminAnalyticsSeller_performance_metricsController";
import { ShoppingmallAdminAnalyticsProduct_sales_statsController } from "./controllers/shoppingMall/admin/analytics/product-sales-stats/ShoppingmallAdminAnalyticsProduct_sales_statsController";
import { ShoppingmallAdminAnalyticsProduct_view_statsController } from "./controllers/shoppingMall/admin/analytics/product-view-stats/ShoppingmallAdminAnalyticsProduct_view_statsController";
import { ShoppingmallProduct_variantsController } from "./controllers/shoppingMall/product_variants/ShoppingmallProduct_variantsController";
import { ShoppingmallTagsController } from "./controllers/shoppingMall/tags/ShoppingmallTagsController";
import { ShoppingmallWebhooksController } from "./controllers/shoppingMall/webhooks/ShoppingmallWebhooksController";
import { ShoppingmallAdminWebhooksController } from "./controllers/shoppingMall/admin/webhooks/ShoppingmallAdminWebhooksController";
import { ShoppingmallAdminConfigHistoriesController } from "./controllers/shoppingMall/admin/config/histories/ShoppingmallAdminConfigHistoriesController";
import { ShoppingmallConfigHistoriesController } from "./controllers/shoppingMall/config/histories/ShoppingmallConfigHistoriesController";
import { ShoppingmallSearchGlobalController } from "./controllers/shoppingMall/search/global/ShoppingmallSearchGlobalController";
import { ShoppingmallAdminDashboardAdminsOverviewController } from "./controllers/shoppingMall/admin/dashboard/admins/overview/ShoppingmallAdminDashboardAdminsOverviewController";
import { ShoppingmallAdminAnalyticsProductsSalesController } from "./controllers/shoppingMall/admin/analytics/products/sales/ShoppingmallAdminAnalyticsProductsSalesController";
import { ShoppingmallAdminAnalyticsProductsMetricsController } from "./controllers/shoppingMall/admin/analytics/products/metrics/ShoppingmallAdminAnalyticsProductsMetricsController";
import { ShoppingmallSearchProductsController } from "./controllers/shoppingMall/search/products/ShoppingmallSearchProductsController";
import { ShoppingmallAdminDashboardProductsOverviewController } from "./controllers/shoppingMall/admin/dashboard/products/overview/ShoppingmallAdminDashboardProductsOverviewController";
import { ShoppingmallReportsProductsSalesController } from "./controllers/shoppingMall/reports/products/sales/ShoppingmallReportsProductsSalesController";
import { ShoppingmallProductsEnrichedController } from "./controllers/shoppingMall/products/enriched/ShoppingmallProductsEnrichedController";
import { ShoppingmallAdminDashboardAdminsVariantsController } from "./controllers/shoppingMall/admin/dashboard/admins/variants/ShoppingmallAdminDashboardAdminsVariantsController";
import { ShoppingmallCustomerSearchVariantsController } from "./controllers/shoppingMall/customer/search/variants/ShoppingmallCustomerSearchVariantsController";
import { ShoppingmallCustomerCartsSummaryController } from "./controllers/shoppingMall/customer/carts/summary/ShoppingmallCustomerCartsSummaryController";
import { ShoppingmallCustomerWishlistsController } from "./controllers/shoppingMall/customer/wishlists/summary/ShoppingmallCustomerWishlistsController";
import { ShoppingmallCustomerCartsCleanup_expiryController } from "./controllers/shoppingMall/customer/carts/cleanup-expiry/ShoppingmallCustomerCartsCleanup_expiryController";
import { ShoppingmallWishlistsAlertsController } from "./controllers/shoppingMall/wishlists/alerts/ShoppingmallWishlistsAlertsController";
import { ShoppingmallAnalyticsPayment_batch_jobsController } from "./controllers/shoppingMall/analytics/payment-batch-jobs/ShoppingmallAnalyticsPayment_batch_jobsController";
import { ShoppingmallAnalyticsPayment_gateway_failoversController } from "./controllers/shoppingMall/analytics/payment-gateway-failovers/ShoppingmallAnalyticsPayment_gateway_failoversController";
import { ShoppingmallAdminDashboardPaymentsHealthController } from "./controllers/shoppingMall/admin/dashboard/payments/health/ShoppingmallAdminDashboardPaymentsHealthController";
import { ShoppingmallAdminMonitoringPaymentsController } from "./controllers/shoppingMall/admin/monitoring/payments/ShoppingmallAdminMonitoringPaymentsController";
import { ShoppingmallAdminDashboardPaymentsDisputesController } from "./controllers/shoppingMall/admin/dashboard/payments/disputes/ShoppingmallAdminDashboardPaymentsDisputesController";
import { ShoppingmallAnalyticsPayment_exchange_ratesController } from "./controllers/shoppingMall/analytics/payment-exchange-rates/ShoppingmallAnalyticsPayment_exchange_ratesController";
import { ShoppingmallAdminAnalyticsPayment_rate_limitsController } from "./controllers/shoppingMall/admin/analytics/payment-rate-limits/ShoppingmallAdminAnalyticsPayment_rate_limitsController";
import { ShoppingmallAdminAnalyticsPaymentsReconciliationController } from "./controllers/shoppingMall/admin/analytics/payments/reconciliation/ShoppingmallAdminAnalyticsPaymentsReconciliationController";
import { ShoppingmallAnalyticsShippingPerformanceController } from "./controllers/shoppingMall/analytics/shipping/performance/ShoppingmallAnalyticsShippingPerformanceController";
import { ShoppingmallShippingTrackingsGlobalController } from "./controllers/shoppingMall/shipping/trackings/global/ShoppingmallShippingTrackingsGlobalController";
import { ShoppingmallAdminReportsShippingsComprehensiveController } from "./controllers/shoppingMall/admin/reports/shippings/comprehensive/ShoppingmallAdminReportsShippingsComprehensiveController";
import { ShoppingmallCustomerOrdersDeliveryEstimatesController } from "./controllers/shoppingMall/customer/orders/delivery/estimates/ShoppingmallCustomerOrdersDeliveryEstimatesController";
import { ShoppingmallAnalyticsProduct_reviewsController } from "./controllers/shoppingMall/analytics/product-reviews/ShoppingmallAnalyticsProduct_reviewsController";
import { ShoppingmallAdminDashboardReviewsModerationController } from "./controllers/shoppingMall/admin/dashboard/reviews/moderation/ShoppingmallAdminDashboardReviewsModerationController";
import { ShoppingmallAdminReviews_exportController } from "./controllers/shoppingMall/admin/reviews/export/ShoppingmallAdminReviews_exportController";
import { ShoppingmallAdminAnalyticsSellersSalesController } from "./controllers/shoppingMall/admin/analytics/sellers/sales/ShoppingmallAdminAnalyticsSellersSalesController";
import { ShoppingmallAdminAnalyticsSellersPerformanceController } from "./controllers/shoppingMall/admin/analytics/sellers/performance/ShoppingmallAdminAnalyticsSellersPerformanceController";
import { ShoppingmallAnalyticsSellersCommunicationController } from "./controllers/shoppingMall/analytics/sellers/communication/ShoppingmallAnalyticsSellersCommunicationController";
import { ShoppingmallAdminAnalyticsSellersComplianceController } from "./controllers/shoppingMall/admin/analytics/sellers/compliance/ShoppingmallAdminAnalyticsSellersComplianceController";
import { ShoppingmallAdminAnalyticsSellersSubscriptionsController } from "./controllers/shoppingMall/admin/analytics/sellers/subscriptions/ShoppingmallAdminAnalyticsSellersSubscriptionsController";
import { ShoppingmallAdminDashboardAdminOverviewController } from "./controllers/shoppingMall/admin/dashboard/admin/overview/ShoppingmallAdminDashboardAdminOverviewController";
import { ShoppingmallAdminAnalyticsSalesOverviewController } from "./controllers/shoppingMall/admin/analytics/sales/overview/ShoppingmallAdminAnalyticsSalesOverviewController";
import { ShoppingmallAdminAnalyticsProductsPerformanceController } from "./controllers/shoppingMall/admin/analytics/products/performance/ShoppingmallAdminAnalyticsProductsPerformanceController";
import { ShoppingmallAdminAnalyticsInventoryHealthController } from "./controllers/shoppingMall/admin/analytics/inventory/health/ShoppingmallAdminAnalyticsInventoryHealthController";
import { ShoppingmallAdminReportsComplianceController } from "./controllers/shoppingMall/admin/reports/compliance/ShoppingmallAdminReportsComplianceController";
import { ShoppingmallAdminReportsFinancialController } from "./controllers/shoppingMall/admin/reports/financial/ShoppingmallAdminReportsFinancialController";
import { ShoppingmallAdminReportsSecurityController } from "./controllers/shoppingMall/admin/reports/security/ShoppingmallAdminReportsSecurityController";
import { ShoppingmallAdminDataExportsBulkController } from "./controllers/shoppingMall/admin/data/exports/bulk/ShoppingmallAdminDataExportsBulkController";
import { ShoppingmallAdminNotificationsBroadcastController } from "./controllers/shoppingMall/admin/notifications/broadcast/ShoppingmallAdminNotificationsBroadcastController";
import { ShoppingmallAdminAnalyticsSalesMonthlyController } from "./controllers/shoppingMall/admin/analytics/sales/monthly/ShoppingmallAdminAnalyticsSalesMonthlyController";
import { ShoppingmallAdminAnalyticsOrdersStatusController } from "./controllers/shoppingMall/admin/analytics/orders/status/ShoppingmallAdminAnalyticsOrdersStatusController";
import { ShoppingmallAdminAnalyticsCustomersBehaviorController } from "./controllers/shoppingMall/admin/analytics/customers/behavior/ShoppingmallAdminAnalyticsCustomersBehaviorController";
import { ShoppingmallAdminDashboardsAdminController } from "./controllers/shoppingMall/admin/dashboards/admin/overview/ShoppingmallAdminDashboardsAdminController";
import { ShoppingmallAdminComplianceAudit_logsController } from "./controllers/shoppingMall/admin/compliance/audit-logs/ShoppingmallAdminComplianceAudit_logsController";
import { ShoppingmallAdminComplianceConfig_historiesController } from "./controllers/shoppingMall/admin/compliance/config-histories/ShoppingmallAdminComplianceConfig_historiesController";
import { ShoppingmallAdminComplianceData_exportsController } from "./controllers/shoppingMall/admin/compliance/data-exports/ShoppingmallAdminComplianceData_exportsController";

@Module({
  controllers: [
    AuthCustomerController,
    AuthCustomerSelfController,
    AuthSellerProductsController,
    AuthSellerController,
    AuthAdminController,
    AuthAdminAccountDeactivateController,
    ShoppingmallChannelsController,
    ShoppingmallAdminChannelsController,
    ShoppingmallSectionsController,
    ShoppingmallAdminSectionsController,
    ShoppingmallConfigurationsController,
    ShoppingmallCustomerConfigurationsController,
    ShoppingmallAdminConfigurationsController,
    ShoppingmallAdminCustomersController,
    ShoppingmallAdminSellersController,
    ShoppingmallAdminAdminsController,
    ShoppingmallCustomerCustomersController,
    ShoppingmallSellerSellersController,
    ShoppingmallAdminCategoriesController,
    ShoppingmallCustomerProductsController,
    ShoppingmallAdminProductsController,
    ShoppingmallCustomerProductsSecondary_categoriesController,
    ShoppingmallProductsSecondary_categoriesController,
    ShoppingmallSellerProductsSecondary_categoriesController,
    ShoppingmallAdminProductsSecondary_categoriesController,
    ShoppingmallProductsAttributesController,
    ShoppingmallSellerProductsAttributesController,
    ShoppingmallAdminProductsAttributesController,
    ShoppingmallAdminProductsAttributesValuesController,
    ShoppingmallSellerProductsAttributesValuesController,
    ShoppingmallCustomerProductsImagesController,
    ShoppingmallSellerProductsImagesController,
    ShoppingmallAdminProductsImagesController,
    ShoppingmallCustomerProductsTagsController,
    ShoppingmallSellerProductsTagsController,
    ShoppingmallAdminProductsTagsController,
    ShoppingmallCustomerProductsReviewsController,
    ShoppingmallAdminProductsReviewsController,
    ShoppingmallCustomerProductsReviewsVotesController,
    ShoppingmallCustomerProductsQuestionsController,
    ShoppingmallAdminProductsQuestionsController,
    ShoppingmallCustomerProductsQuestionsAnswersController,
    ShoppingmallCustomerProductsVariantsAttributesController,
    ShoppingmallSellerProductsVariantsAttributesController,
    ShoppingmallAdminProductsVariantsAttributesController,
    ShoppingmallProductsVariantsAttributesController,
    ShoppingmallSellerProductsVariantsController,
    ShoppingmallAdminProductsVariantsController,
    ShoppingmallProductsReviewsVotesController,
    ShoppingmallAdminProductsQuestionsAnswersController,
    ShoppingmallAdminBrandsController,
    ShoppingmallSellerBrandsController,
    ShoppingmallBrandsController,
    ShoppingmallCategoriesController,
    ShoppingmallProductsController,
    ShoppingmallProductsImagesController,
    ShoppingmallProductsTagsController,
    ShoppingmallProductsReviewsController,
    ShoppingmallCustomerProductsVariantsController,
    ShoppingmallProductsVariantsController,
    ShoppingmallCustomerProductsAttributesController,
    ShoppingmallCustomerProductsAttributesValuesController,
    ShoppingmallProductsAttributesValuesController,
    ShoppingmallProductsQuestionsAnswersController,
    ShoppingmallCustomerProductsView_statsController,
    ShoppingmallAdminProductsView_statsController,
    ShoppingmallCustomerProductsSales_statsController,
    ShoppingmallAdminProductsSales_statsController,
    ShoppingmallAdminProductsSnapshotsController,
    ShoppingmallProductsSnapshotsController,
    ShoppingmallCustomerBrandsController,
    ShoppingmallProduct_variantsAttributesController,
    ShoppingmallAdminProduct_variantsAttributesController,
    ShoppingmallProduct_variantsAttribute_valuesController,
    ShoppingmallAdminProduct_variantsAttribute_valuesController,
    ShoppingmallSellerProductsController,
    ShoppingmallCustomerProductsSkusController,
    ShoppingmallAdminProductsSkusController,
    ShoppingmallProductsSkusController,
    ShoppingmallSellerProductsSkusController,
    ShoppingmallCustomerProductsInventoryController,
    ShoppingmallSellerProductsInventoryController,
    ShoppingmallAdminProductsInventoryController,
    ShoppingmallProductsInventoryController,
    ShoppingmallProductsPricingController,
    ShoppingmallCustomerProductsPricingController,
    ShoppingmallAdminProductsPricingController,
    ShoppingmallProductsCompatibilitiesController,
    ShoppingmallSellerProductsCompatibilitiesController,
    ShoppingmallSellerProductsTemplatesController,
    ShoppingmallAdminProductsTemplatesController,
    ShoppingmallProductsTemplatesController,
    ShoppingmallProductsAvailabilitiesController,
    ShoppingmallCustomerCartsController,
    ShoppingmallCustomerCartsItemsController,
    ShoppingmallAdminCartsItemsController,
    ShoppingmallCustomerWishlistsItemsController,
    ShoppingmallCustomerCart_sessionsController,
    ShoppingmallCart_sessionsController,
    ShoppingmallOrdersController,
    ShoppingmallCustomerOrdersController,
    ShoppingmallAdminOrdersController,
    ShoppingmallCustomerOrdersItemsController,
    ShoppingmallSellerOrdersItemsController,
    ShoppingmallAdminOrdersItemsController,
    ShoppingmallCustomerOrdersAddressesController,
    ShoppingmallOrdersAddressesController,
    ShoppingmallAdminOrdersAddressesController,
    ShoppingmallCustomerOrdersPaymentsController,
    ShoppingmallAdminOrdersPaymentsController,
    ShoppingmallCustomerOrdersEventsController,
    ShoppingmallAdminOrdersEventsController,
    ShoppingmallOrdersReturnsController,
    ShoppingmallCustomerOrdersReturnsController,
    ShoppingmallAdminOrdersReturnsController,
    ShoppingmallSellerOrdersReturnsController,
    ShoppingmallCustomerOrdersRefundsController,
    ShoppingmallAdminOrdersRefundsController,
    ShoppingmallOrdersDeliveriesController,
    ShoppingmallAdminOrdersDeliveriesController,
    ShoppingmallSellerOrdersDeliveriesController,
    ShoppingmallPayment_methodsController,
    ShoppingmallAdminPayment_methodsController,
    ShoppingmallAdminPayment_intentsController,
    ShoppingmallPayment_intentsController,
    ShoppingmallCustomerPayment_intentsController,
    ShoppingmallCustomerPaymentsController,
    ShoppingmallAdminPaymentsController,
    ShoppingmallPaymentsController,
    ShoppingmallSellerPaymentsController,
    ShoppingmallPayment_refundsController,
    ShoppingmallCustomerPayment_refundsController,
    ShoppingmallAdminPayment_refundsController,
    ShoppingmallAdminPayment_audit_logsController,
    ShoppingmallAdminPayment_gateway_logsController,
    ShoppingmallCustomerPayment_regionsController,
    ShoppingmallAdminPayment_regionsController,
    ShoppingmallPayment_regionsController,
    ShoppingmallPayment_gateway_failoversController,
    ShoppingmallAdminPayment_gateway_failoversController,
    ShoppingmallPayment_tokenizationsController,
    ShoppingmallCustomerPayment_tokenizationsController,
    ShoppingmallAdminPayment_tokenizationsController,
    ShoppingmallAdminPayment_disputesController,
    ShoppingmallCustomerPayment_disputesController,
    ShoppingmallAdminPayment_vault_entriesController,
    ShoppingmallCustomerPayment_vault_entriesController,
    ShoppingmallPayment_exchange_ratesController,
    ShoppingmallAdminPayment_exchange_ratesController,
    ShoppingmallAdminPayment_surcharge_rulesController,
    ShoppingmallAdminPayment_rate_limitsController,
    ShoppingmallAdminPayment_notificationsController,
    ShoppingmallCustomerPayment_notificationsController,
    ShoppingmallPayment_notificationsController,
    ShoppingmallAdminPayment_settingsController,
    ShoppingmallPayment_cryptocurrency_conversionsController,
    ShoppingmallCustomerPayment_cryptocurrency_conversionsController,
    ShoppingmallAdminPayment_cryptocurrency_conversionsController,
    ShoppingmallPayment_webhooksController,
    ShoppingmallAdminPayment_webhooksController,
    ShoppingmallAdminPayment_batch_job_logsController,
    ShoppingmallAdminPayment_reconciliationController,
    ShoppingmallAdminCarriersController,
    ShoppingmallSellerCarriersController,
    ShoppingmallShipping_methodsController,
    ShoppingmallAdminShipping_methodsController,
    ShoppingmallAdminDelivery_eventsController,
    ShoppingmallDelivery_eventsController,
    ShoppingmallShipping_trackingsController,
    ShoppingmallCustomerShipping_trackingsController,
    ShoppingmallAdminShipping_trackingsController,
    ShoppingmallSellerShipping_trackingsController,
    ShoppingmallAdminOrder_shipmentsController,
    ShoppingmallOrder_shipmentsController,
    ShoppingmallCustomerReviewsController,
    ShoppingmallReviewsController,
    ShoppingmallAdminReviewsController,
    ShoppingmallCustomerReviewsVotesController,
    ShoppingmallReviewsVotesController,
    ShoppingmallAdminReviewsVotesController,
    ShoppingmallCustomerReviewsFlagsController,
    ShoppingmallAdminReviewsModeration_logsController,
    ShoppingmallCustomerReviewsImagesController,
    ShoppingmallAdminReviewsImagesController,
    ShoppingmallReviewsRepliesController,
    ShoppingmallCustomerReviewsRepliesController,
    ShoppingmallAdminReviewsRepliesController,
    ShoppingmallSellerReviewsImagesController,
    ShoppingmallAdminSellersVerification_documentsController,
    ShoppingmallSellersVerification_documentsController,
    ShoppingmallSellerSellersVerification_documentsController,
    ShoppingmallAdminSellersBank_accountsController,
    ShoppingmallSellerSellersBank_accountsController,
    ShoppingmallSellerSellersDashboard_settingsController,
    ShoppingmallSellerSellersOnboarding_completionController,
    ShoppingmallSellersOnboarding_completionController,
    ShoppingmallAdminSellersOnboarding_completionController,
    ShoppingmallSellersPerformance_metricsController,
    ShoppingmallSellerSellersPerformance_metricsController,
    ShoppingmallAdminSellersPerformance_metricsController,
    ShoppingmallAdminSellersCommunication_logsController,
    ShoppingmallSellerSellersCommunication_logsController,
    ShoppingmallAdminSellersCompliance_historyController,
    ShoppingmallSellerSellersSubscription_tiersController,
    ShoppingmallAdminSellersSubscription_tiersController,
    ShoppingmallAuditLogsController,
    ShoppingmallAdminPlatformConfigurationsController,
    ShoppingmallPlatformConfigurationsController,
    ShoppingmallAdminEmailTemplatesController,
    ShoppingmallAdminSecurityPoliciesController,
    ShoppingmallAdminComplianceRecordsController,
    ShoppingmallComplianceRecordsController,
    ShoppingmallAdminConfigHistoryController,
    ShoppingmallAdminDataExportsController,
    ShoppingmallSellerDataExportsController,
    ShoppingmallCustomerDataExportsController,
    ShoppingmallAdminMonitoringAlertsController,
    ShoppingmallUserFlagsController,
    ShoppingmallCustomerUserFlagsController,
    ShoppingmallAdminAuditLogsController,
    ShoppingmallAdminUserFlagsController,
    ShoppingmallAdminAnalyticsProductsController,
    ShoppingmallAnalyticsOrder_itemsController,
    ShoppingmallAdminAnalyticsOrder_paymentsController,
    ShoppingmallAdminAnalyticsPaymentsController,
    ShoppingmallAdminAnalyticsProduct_reviewsController,
    ShoppingmallAdminAnalyticsSeller_performance_metricsController,
    ShoppingmallAdminAnalyticsProduct_sales_statsController,
    ShoppingmallAdminAnalyticsProduct_view_statsController,
    ShoppingmallProduct_variantsController,
    ShoppingmallTagsController,
    ShoppingmallWebhooksController,
    ShoppingmallAdminWebhooksController,
    ShoppingmallAdminConfigHistoriesController,
    ShoppingmallConfigHistoriesController,
    ShoppingmallSearchGlobalController,
    ShoppingmallAdminDashboardAdminsOverviewController,
    ShoppingmallAdminAnalyticsProductsSalesController,
    ShoppingmallAdminAnalyticsProductsMetricsController,
    ShoppingmallSearchProductsController,
    ShoppingmallAdminDashboardProductsOverviewController,
    ShoppingmallReportsProductsSalesController,
    ShoppingmallProductsEnrichedController,
    ShoppingmallAdminDashboardAdminsVariantsController,
    ShoppingmallCustomerSearchVariantsController,
    ShoppingmallCustomerCartsSummaryController,
    ShoppingmallCustomerWishlistsController,
    ShoppingmallCustomerCartsCleanup_expiryController,
    ShoppingmallWishlistsAlertsController,
    ShoppingmallAnalyticsPayment_batch_jobsController,
    ShoppingmallAnalyticsPayment_gateway_failoversController,
    ShoppingmallAdminDashboardPaymentsHealthController,
    ShoppingmallAdminMonitoringPaymentsController,
    ShoppingmallAdminDashboardPaymentsDisputesController,
    ShoppingmallAnalyticsPayment_exchange_ratesController,
    ShoppingmallAdminAnalyticsPayment_rate_limitsController,
    ShoppingmallAdminAnalyticsPaymentsReconciliationController,
    ShoppingmallAnalyticsShippingPerformanceController,
    ShoppingmallShippingTrackingsGlobalController,
    ShoppingmallAdminReportsShippingsComprehensiveController,
    ShoppingmallCustomerOrdersDeliveryEstimatesController,
    ShoppingmallAnalyticsProduct_reviewsController,
    ShoppingmallAdminDashboardReviewsModerationController,
    ShoppingmallAdminReviews_exportController,
    ShoppingmallAdminAnalyticsSellersSalesController,
    ShoppingmallAdminAnalyticsSellersPerformanceController,
    ShoppingmallAnalyticsSellersCommunicationController,
    ShoppingmallAdminAnalyticsSellersComplianceController,
    ShoppingmallAdminAnalyticsSellersSubscriptionsController,
    ShoppingmallAdminDashboardAdminOverviewController,
    ShoppingmallAdminAnalyticsSalesOverviewController,
    ShoppingmallAdminAnalyticsProductsPerformanceController,
    ShoppingmallAdminAnalyticsInventoryHealthController,
    ShoppingmallAdminReportsComplianceController,
    ShoppingmallAdminReportsFinancialController,
    ShoppingmallAdminReportsSecurityController,
    ShoppingmallAdminDataExportsBulkController,
    ShoppingmallAdminNotificationsBroadcastController,
    ShoppingmallAdminAnalyticsSalesMonthlyController,
    ShoppingmallAdminAnalyticsOrdersStatusController,
    ShoppingmallAdminAnalyticsCustomersBehaviorController,
    ShoppingmallAdminDashboardsAdminController,
    ShoppingmallAdminComplianceAudit_logsController,
    ShoppingmallAdminComplianceConfig_historiesController,
    ShoppingmallAdminComplianceData_exportsController,
  ],
})
export class MyModule {}
