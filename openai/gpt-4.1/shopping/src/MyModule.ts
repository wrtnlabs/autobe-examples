import { Module } from "@nestjs/common";

import { AuthCustomerController } from "./controllers/auth/customer/AuthCustomerController";
import { AuthSellerController } from "./controllers/auth/seller/AuthSellerController";
import { AuthAdminController } from "./controllers/auth/admin/AuthAdminController";
import { ShoppingmallAdminMallconfigurationsController } from "./controllers/shoppingMall/admin/mallConfigurations/ShoppingmallAdminMallconfigurationsController";
import { ShoppingmallMallcategoriesController } from "./controllers/shoppingMall/mallCategories/ShoppingmallMallcategoriesController";
import { ShoppingmallAdminMallcategoriesController } from "./controllers/shoppingMall/admin/mallCategories/ShoppingmallAdminMallcategoriesController";
import { ShoppingmallMallcategoriesChildrenController } from "./controllers/shoppingMall/mallCategories/children/ShoppingmallMallcategoriesChildrenController";
import { ShoppingmallAdminExternalpaymentprovidersController } from "./controllers/shoppingMall/admin/externalPaymentProviders/ShoppingmallAdminExternalpaymentprovidersController";
import { ShoppingmallExternalpaymentprovidersController } from "./controllers/shoppingMall/externalPaymentProviders/ShoppingmallExternalpaymentprovidersController";
import { ShoppingmallAdminShippingpartnersController } from "./controllers/shoppingMall/admin/shippingPartners/ShoppingmallAdminShippingpartnersController";
import { ShoppingmallAdminCustomersController } from "./controllers/shoppingMall/admin/customers/ShoppingmallAdminCustomersController";
import { ShoppingmallCustomerCustomersController } from "./controllers/shoppingMall/customer/customers/ShoppingmallCustomerCustomersController";
import { ShoppingmallAdminCustomersSessionsController } from "./controllers/shoppingMall/admin/customers/sessions/ShoppingmallAdminCustomersSessionsController";
import { ShoppingmallCustomerCustomersSessionsController } from "./controllers/shoppingMall/customer/customers/sessions/ShoppingmallCustomerCustomersSessionsController";
import { ShoppingmallCustomerCustomersAddressesController } from "./controllers/shoppingMall/customer/customers/addresses/ShoppingmallCustomerCustomersAddressesController";
import { ShoppingmallAdminCustomersAddressesController } from "./controllers/shoppingMall/admin/customers/addresses/ShoppingmallAdminCustomersAddressesController";
import { ShoppingmallAdminSellersController } from "./controllers/shoppingMall/admin/sellers/ShoppingmallAdminSellersController";
import { ShoppingmallSellerSellersSessionsController } from "./controllers/shoppingMall/seller/sellers/sessions/ShoppingmallSellerSellersSessionsController";
import { ShoppingmallAdminSellersSessionsController } from "./controllers/shoppingMall/admin/sellers/sessions/ShoppingmallAdminSellersSessionsController";
import { ShoppingmallSellerSellersAddressesController } from "./controllers/shoppingMall/seller/sellers/addresses/ShoppingmallSellerSellersAddressesController";
import { ShoppingmallAdminSellersAddressesController } from "./controllers/shoppingMall/admin/sellers/addresses/ShoppingmallAdminSellersAddressesController";
import { ShoppingmallSellerSellersVerificationsController } from "./controllers/shoppingMall/seller/sellers/verifications/ShoppingmallSellerSellersVerificationsController";
import { ShoppingmallAdminSellersVerificationsController } from "./controllers/shoppingMall/admin/sellers/verifications/ShoppingmallAdminSellersVerificationsController";
import { ShoppingmallAdminAdminsController } from "./controllers/shoppingMall/admin/admins/ShoppingmallAdminAdminsController";
import { ShoppingmallAdminAdminsSessionsController } from "./controllers/shoppingMall/admin/admins/sessions/ShoppingmallAdminAdminsSessionsController";
import { ShoppingmallAdminRoleescalationsController } from "./controllers/shoppingMall/admin/roleEscalations/ShoppingmallAdminRoleescalationsController";
import { ShoppingmallProductsController } from "./controllers/shoppingMall/products/ShoppingmallProductsController";
import { ShoppingmallSellerProductsController } from "./controllers/shoppingMall/seller/products/ShoppingmallSellerProductsController";
import { ShoppingmallAdminProductsController } from "./controllers/shoppingMall/admin/products/ShoppingmallAdminProductsController";
import { ShoppingmallSellerProductsCategoriesController } from "./controllers/shoppingMall/seller/products/categories/ShoppingmallSellerProductsCategoriesController";
import { ShoppingmallAdminProductsCategoriesController } from "./controllers/shoppingMall/admin/products/categories/ShoppingmallAdminProductsCategoriesController";
import { ShoppingmallSellerProductsSkusController } from "./controllers/shoppingMall/seller/products/skus/ShoppingmallSellerProductsSkusController";
import { ShoppingmallAdminProductsSkusController } from "./controllers/shoppingMall/admin/products/skus/ShoppingmallAdminProductsSkusController";
import { ShoppingmallProductsSkusController } from "./controllers/shoppingMall/products/skus/ShoppingmallProductsSkusController";
import { ShoppingmallProductsSkusImagesController } from "./controllers/shoppingMall/products/skus/images/ShoppingmallProductsSkusImagesController";
import { ShoppingmallSellerProductsSkusImagesController } from "./controllers/shoppingMall/seller/products/skus/images/ShoppingmallSellerProductsSkusImagesController";
import { ShoppingmallAdminProductsSkusImagesController } from "./controllers/shoppingMall/admin/products/skus/images/ShoppingmallAdminProductsSkusImagesController";
import { ShoppingmallSellerProductsImagesController } from "./controllers/shoppingMall/seller/products/images/ShoppingmallSellerProductsImagesController";
import { ShoppingmallAdminProductsImagesController } from "./controllers/shoppingMall/admin/products/images/ShoppingmallAdminProductsImagesController";
import { ShoppingmallProductsImagesController } from "./controllers/shoppingMall/products/images/ShoppingmallProductsImagesController";
import { ShoppingmallSellerProductsAttributesController } from "./controllers/shoppingMall/seller/products/attributes/ShoppingmallSellerProductsAttributesController";
import { ShoppingmallAdminProductsAttributesController } from "./controllers/shoppingMall/admin/products/attributes/ShoppingmallAdminProductsAttributesController";
import { ShoppingmallSellerSkusAttributevaluesController } from "./controllers/shoppingMall/seller/skus/attributeValues/ShoppingmallSellerSkusAttributevaluesController";
import { ShoppingmallAdminSkusAttributevaluesController } from "./controllers/shoppingMall/admin/skus/attributeValues/ShoppingmallAdminSkusAttributevaluesController";
import { ShoppingmallSkusAttributevaluesController } from "./controllers/shoppingMall/skus/attributeValues/ShoppingmallSkusAttributevaluesController";
import { ShoppingmallAdminCartsController } from "./controllers/shoppingMall/admin/carts/ShoppingmallAdminCartsController";
import { ShoppingmallCustomerCartsController } from "./controllers/shoppingMall/customer/carts/ShoppingmallCustomerCartsController";
import { ShoppingmallCustomerCartsItemsController } from "./controllers/shoppingMall/customer/carts/items/ShoppingmallCustomerCartsItemsController";
import { ShoppingmallAdminWishlistsController } from "./controllers/shoppingMall/admin/wishlists/ShoppingmallAdminWishlistsController";
import { ShoppingmallCustomerWishlistsController } from "./controllers/shoppingMall/customer/wishlists/ShoppingmallCustomerWishlistsController";
import { ShoppingmallCustomerWishlistsItemsController } from "./controllers/shoppingMall/customer/wishlists/items/ShoppingmallCustomerWishlistsItemsController";
import { ShoppingmallAdminOrdersController } from "./controllers/shoppingMall/admin/orders/ShoppingmallAdminOrdersController";
import { ShoppingmallCustomerOrdersController } from "./controllers/shoppingMall/customer/orders/ShoppingmallCustomerOrdersController";
import { ShoppingmallAdminOrdersItemsController } from "./controllers/shoppingMall/admin/orders/items/ShoppingmallAdminOrdersItemsController";
import { ShoppingmallCustomerOrdersItemsController } from "./controllers/shoppingMall/customer/orders/items/ShoppingmallCustomerOrdersItemsController";
import { ShoppingmallSellerOrdersItemsController } from "./controllers/shoppingMall/seller/orders/items/ShoppingmallSellerOrdersItemsController";
import { ShoppingmallCustomerOrdersShipmentsController } from "./controllers/shoppingMall/customer/orders/shipments/ShoppingmallCustomerOrdersShipmentsController";
import { ShoppingmallSellerOrdersShipmentsController } from "./controllers/shoppingMall/seller/orders/shipments/ShoppingmallSellerOrdersShipmentsController";
import { ShoppingmallAdminOrdersShipmentsController } from "./controllers/shoppingMall/admin/orders/shipments/ShoppingmallAdminOrdersShipmentsController";
import { ShoppingmallAdminOrdersStatushistoriesController } from "./controllers/shoppingMall/admin/orders/statusHistories/ShoppingmallAdminOrdersStatushistoriesController";
import { ShoppingmallAdminOrdersAuditlogsController } from "./controllers/shoppingMall/admin/orders/auditLogs/ShoppingmallAdminOrdersAuditlogsController";
import { ShoppingmallSellerOrdersAuditlogsController } from "./controllers/shoppingMall/seller/orders/auditLogs/ShoppingmallSellerOrdersAuditlogsController";
import { ShoppingmallAdminPaymentsController } from "./controllers/shoppingMall/admin/payments/ShoppingmallAdminPaymentsController";
import { ShoppingmallAdminPaymentsRefundsController } from "./controllers/shoppingMall/admin/payments/refunds/ShoppingmallAdminPaymentsRefundsController";
import { ShoppingmallAdminPaymentsStatusesController } from "./controllers/shoppingMall/admin/payments/statuses/ShoppingmallAdminPaymentsStatusesController";
import { ShoppingmallAdminPaymentsAuditlogsController } from "./controllers/shoppingMall/admin/payments/auditLogs/ShoppingmallAdminPaymentsAuditlogsController";
import { ShoppingmallAdminReviewsController } from "./controllers/shoppingMall/admin/reviews/ShoppingmallAdminReviewsController";
import { ShoppingmallReviewsController } from "./controllers/shoppingMall/reviews/ShoppingmallReviewsController";
import { ShoppingmallCustomerReviewsController } from "./controllers/shoppingMall/customer/reviews/ShoppingmallCustomerReviewsController";
import { ShoppingmallAdminReviewsResponsesController } from "./controllers/shoppingMall/admin/reviews/responses/ShoppingmallAdminReviewsResponsesController";
import { ShoppingmallSellerReviewsResponsesController } from "./controllers/shoppingMall/seller/reviews/responses/ShoppingmallSellerReviewsResponsesController";
import { ShoppingmallSellerProductratingsController } from "./controllers/shoppingMall/seller/productRatings/ShoppingmallSellerProductratingsController";
import { ShoppingmallAdminProductratingsController } from "./controllers/shoppingMall/admin/productRatings/ShoppingmallAdminProductratingsController";
import { ShoppingmallProductratingsController } from "./controllers/shoppingMall/productRatings/ShoppingmallProductratingsController";
import { ShoppingmallCustomerProductratingsController } from "./controllers/shoppingMall/customer/productRatings/ShoppingmallCustomerProductratingsController";
import { ShoppingmallAdminReviewsStatushistoriesController } from "./controllers/shoppingMall/admin/reviews/statusHistories/ShoppingmallAdminReviewsStatushistoriesController";
import { ShoppingmallAdminAdminactionlogsController } from "./controllers/shoppingMall/admin/adminActionLogs/ShoppingmallAdminAdminactionlogsController";
import { ShoppingmallAdminEscalationqueuesController } from "./controllers/shoppingMall/admin/escalationQueues/ShoppingmallAdminEscalationqueuesController";
import { ShoppingmallAdminAuditlogsController } from "./controllers/shoppingMall/admin/auditLogs/ShoppingmallAdminAuditlogsController";
import { ShoppingmallAdminRefundrequestsController } from "./controllers/shoppingMall/admin/refundRequests/ShoppingmallAdminRefundrequestsController";
import { ShoppingmallCustomerRefundrequestsController } from "./controllers/shoppingMall/customer/refundRequests/ShoppingmallCustomerRefundrequestsController";
import { ShoppingmallSellerRefundrequestsController } from "./controllers/shoppingMall/seller/refundRequests/ShoppingmallSellerRefundrequestsController";
import { ShoppingmallAdminDisputesController } from "./controllers/shoppingMall/admin/disputes/ShoppingmallAdminDisputesController";
import { ShoppingmallAdminDisputesHistoriesController } from "./controllers/shoppingMall/admin/disputes/histories/ShoppingmallAdminDisputesHistoriesController";
import { ShoppingmallSellerDisputesHistoriesController } from "./controllers/shoppingMall/seller/disputes/histories/ShoppingmallSellerDisputesHistoriesController";
import { ShoppingmallCustomerDisputesHistoriesController } from "./controllers/shoppingMall/customer/disputes/histories/ShoppingmallCustomerDisputesHistoriesController";
import { ShoppingmallAdminDisputesMessagesController } from "./controllers/shoppingMall/admin/disputes/messages/ShoppingmallAdminDisputesMessagesController";
import { ShoppingmallSellerDisputesMessagesController } from "./controllers/shoppingMall/seller/disputes/messages/ShoppingmallSellerDisputesMessagesController";
import { ShoppingmallCustomerDisputesMessagesController } from "./controllers/shoppingMall/customer/disputes/messages/ShoppingmallCustomerDisputesMessagesController";
import { ShoppingmallAdminShipmentsController } from "./controllers/shoppingMall/admin/shipments/ShoppingmallAdminShipmentsController";
import { ShoppingmallSellerShipmentsController } from "./controllers/shoppingMall/seller/shipments/ShoppingmallSellerShipmentsController";
import { ShoppingmallAdminShipmentsTrackinghistoriesController } from "./controllers/shoppingMall/admin/shipments/trackingHistories/ShoppingmallAdminShipmentsTrackinghistoriesController";
import { ShoppingmallSellerShipmentsTrackinghistoriesController } from "./controllers/shoppingMall/seller/shipments/trackingHistories/ShoppingmallSellerShipmentsTrackinghistoriesController";
import { ShoppingmallCustomerShipmentsTrackinghistoriesController } from "./controllers/shoppingMall/customer/shipments/trackingHistories/ShoppingmallCustomerShipmentsTrackinghistoriesController";
import { ShoppingmallAdminReturnrequestsController } from "./controllers/shoppingMall/admin/returnRequests/ShoppingmallAdminReturnrequestsController";
import { ShoppingmallCustomerReturnrequestsController } from "./controllers/shoppingMall/customer/returnRequests/ShoppingmallCustomerReturnrequestsController";
import { ShoppingmallSellerReturnrequestsController } from "./controllers/shoppingMall/seller/returnRequests/ShoppingmallSellerReturnrequestsController";

@Module({
  controllers: [
    AuthCustomerController,
    AuthSellerController,
    AuthAdminController,
    ShoppingmallAdminMallconfigurationsController,
    ShoppingmallMallcategoriesController,
    ShoppingmallAdminMallcategoriesController,
    ShoppingmallMallcategoriesChildrenController,
    ShoppingmallAdminExternalpaymentprovidersController,
    ShoppingmallExternalpaymentprovidersController,
    ShoppingmallAdminShippingpartnersController,
    ShoppingmallAdminCustomersController,
    ShoppingmallCustomerCustomersController,
    ShoppingmallAdminCustomersSessionsController,
    ShoppingmallCustomerCustomersSessionsController,
    ShoppingmallCustomerCustomersAddressesController,
    ShoppingmallAdminCustomersAddressesController,
    ShoppingmallAdminSellersController,
    ShoppingmallSellerSellersSessionsController,
    ShoppingmallAdminSellersSessionsController,
    ShoppingmallSellerSellersAddressesController,
    ShoppingmallAdminSellersAddressesController,
    ShoppingmallSellerSellersVerificationsController,
    ShoppingmallAdminSellersVerificationsController,
    ShoppingmallAdminAdminsController,
    ShoppingmallAdminAdminsSessionsController,
    ShoppingmallAdminRoleescalationsController,
    ShoppingmallProductsController,
    ShoppingmallSellerProductsController,
    ShoppingmallAdminProductsController,
    ShoppingmallSellerProductsCategoriesController,
    ShoppingmallAdminProductsCategoriesController,
    ShoppingmallSellerProductsSkusController,
    ShoppingmallAdminProductsSkusController,
    ShoppingmallProductsSkusController,
    ShoppingmallProductsSkusImagesController,
    ShoppingmallSellerProductsSkusImagesController,
    ShoppingmallAdminProductsSkusImagesController,
    ShoppingmallSellerProductsImagesController,
    ShoppingmallAdminProductsImagesController,
    ShoppingmallProductsImagesController,
    ShoppingmallSellerProductsAttributesController,
    ShoppingmallAdminProductsAttributesController,
    ShoppingmallSellerSkusAttributevaluesController,
    ShoppingmallAdminSkusAttributevaluesController,
    ShoppingmallSkusAttributevaluesController,
    ShoppingmallAdminCartsController,
    ShoppingmallCustomerCartsController,
    ShoppingmallCustomerCartsItemsController,
    ShoppingmallAdminWishlistsController,
    ShoppingmallCustomerWishlistsController,
    ShoppingmallCustomerWishlistsItemsController,
    ShoppingmallAdminOrdersController,
    ShoppingmallCustomerOrdersController,
    ShoppingmallAdminOrdersItemsController,
    ShoppingmallCustomerOrdersItemsController,
    ShoppingmallSellerOrdersItemsController,
    ShoppingmallCustomerOrdersShipmentsController,
    ShoppingmallSellerOrdersShipmentsController,
    ShoppingmallAdminOrdersShipmentsController,
    ShoppingmallAdminOrdersStatushistoriesController,
    ShoppingmallAdminOrdersAuditlogsController,
    ShoppingmallSellerOrdersAuditlogsController,
    ShoppingmallAdminPaymentsController,
    ShoppingmallAdminPaymentsRefundsController,
    ShoppingmallAdminPaymentsStatusesController,
    ShoppingmallAdminPaymentsAuditlogsController,
    ShoppingmallAdminReviewsController,
    ShoppingmallReviewsController,
    ShoppingmallCustomerReviewsController,
    ShoppingmallAdminReviewsResponsesController,
    ShoppingmallSellerReviewsResponsesController,
    ShoppingmallSellerProductratingsController,
    ShoppingmallAdminProductratingsController,
    ShoppingmallProductratingsController,
    ShoppingmallCustomerProductratingsController,
    ShoppingmallAdminReviewsStatushistoriesController,
    ShoppingmallAdminAdminactionlogsController,
    ShoppingmallAdminEscalationqueuesController,
    ShoppingmallAdminAuditlogsController,
    ShoppingmallAdminRefundrequestsController,
    ShoppingmallCustomerRefundrequestsController,
    ShoppingmallSellerRefundrequestsController,
    ShoppingmallAdminDisputesController,
    ShoppingmallAdminDisputesHistoriesController,
    ShoppingmallSellerDisputesHistoriesController,
    ShoppingmallCustomerDisputesHistoriesController,
    ShoppingmallAdminDisputesMessagesController,
    ShoppingmallSellerDisputesMessagesController,
    ShoppingmallCustomerDisputesMessagesController,
    ShoppingmallAdminShipmentsController,
    ShoppingmallSellerShipmentsController,
    ShoppingmallAdminShipmentsTrackinghistoriesController,
    ShoppingmallSellerShipmentsTrackinghistoriesController,
    ShoppingmallCustomerShipmentsTrackinghistoriesController,
    ShoppingmallAdminReturnrequestsController,
    ShoppingmallCustomerReturnrequestsController,
    ShoppingmallSellerReturnrequestsController,
  ],
})
export class MyModule {}
