import { Module } from "@nestjs/common";

import { AuthCustomerController } from "./controllers/auth/customer/AuthCustomerController";
import { AuthCustomerPasswordResetRequestController } from "./controllers/auth/customer/password/reset/request/AuthCustomerPasswordResetRequestController";
import { AuthCustomerPasswordResetCompleteController } from "./controllers/auth/customer/password/reset/complete/AuthCustomerPasswordResetCompleteController";
import { AuthCustomerEmailVerifyController } from "./controllers/auth/customer/email/verify/AuthCustomerEmailVerifyController";
import { AuthCustomerEmailVerifyResendController } from "./controllers/auth/customer/email/verify/resend/AuthCustomerEmailVerifyResendController";
import { AuthCustomerPasswordChangeController } from "./controllers/auth/customer/password/change/AuthCustomerPasswordChangeController";
import { AuthCustomer_logoutAllController } from "./controllers/auth/customer/logout/all/AuthCustomer_logoutAllController";
import { AuthSellerController } from "./controllers/auth/seller/AuthSellerController";
import { AuthSellerPasswordResetRequestController } from "./controllers/auth/seller/password/reset/request/AuthSellerPasswordResetRequestController";
import { AuthSellerPasswordResetConfirmController } from "./controllers/auth/seller/password/reset/confirm/AuthSellerPasswordResetConfirmController";
import { AuthSellerPasswordChangeController } from "./controllers/auth/seller/password/change/AuthSellerPasswordChangeController";
import { AuthSellerVerificationResendController } from "./controllers/auth/seller/verification/resend/AuthSellerVerificationResendController";
import { AuthSellerVerificationConfirmController } from "./controllers/auth/seller/verification/confirm/AuthSellerVerificationConfirmController";
import { AuthSellerSessionsController } from "./controllers/auth/seller/sessions/AuthSellerSessionsController";
import { AuthAdminController } from "./controllers/auth/admin/AuthAdminController";
import { AuthAdminPasswordResetRequestController } from "./controllers/auth/admin/password/reset/request/AuthAdminPasswordResetRequestController";
import { AuthAdminPasswordResetCompleteController } from "./controllers/auth/admin/password/reset/complete/AuthAdminPasswordResetCompleteController";
import { AuthAdminPasswordChangeController } from "./controllers/auth/admin/password/change/AuthAdminPasswordChangeController";
import { AuthAdminSessionsController } from "./controllers/auth/admin/sessions/AuthAdminSessionsController";
import { AuthAdminSessionsAllController } from "./controllers/auth/admin/sessions/all/AuthAdminSessionsAllController";
import { ShoppingmallAdminSystemconfigsController } from "./controllers/shoppingMall/admin/systemConfigs/ShoppingmallAdminSystemconfigsController";
import { ShoppingmallAdminChannelsController } from "./controllers/shoppingMall/admin/channels/ShoppingmallAdminChannelsController";
import { ShoppingmallAdminEmailtemplatesController } from "./controllers/shoppingMall/admin/emailTemplates/ShoppingmallAdminEmailtemplatesController";
import { ShoppingmallAdminCustomersController } from "./controllers/shoppingMall/admin/customers/ShoppingmallAdminCustomersController";
import { ShoppingmallCustomerCustomersSessionsController } from "./controllers/shoppingMall/customer/customers/sessions/ShoppingmallCustomerCustomersSessionsController";
import { ShoppingmallAdminCustomersSessionsController } from "./controllers/shoppingMall/admin/customers/sessions/ShoppingmallAdminCustomersSessionsController";
import { ShoppingmallAdminSellersController } from "./controllers/shoppingMall/admin/sellers/ShoppingmallAdminSellersController";
import { ShoppingmallSellerSellersController } from "./controllers/shoppingMall/seller/sellers/ShoppingmallSellerSellersController";
import { ShoppingmallSellersSessionsController } from "./controllers/shoppingMall/sellers/sessions/ShoppingmallSellersSessionsController";
import { ShoppingmallSellerSellersSessionsController } from "./controllers/shoppingMall/seller/sellers/sessions/ShoppingmallSellerSellersSessionsController";
import { ShoppingmallAdminAdminsController } from "./controllers/shoppingMall/admin/admins/ShoppingmallAdminAdminsController";
import { ShoppingmallAdminAdminsSessionsController } from "./controllers/shoppingMall/admin/admins/sessions/ShoppingmallAdminAdminsSessionsController";
import { ShoppingmallCustomerAddressesController } from "./controllers/shoppingMall/customer/addresses/ShoppingmallCustomerAddressesController";
import { ShoppingmallSellerAddressesController } from "./controllers/shoppingMall/seller/addresses/ShoppingmallSellerAddressesController";
import { ShoppingmallAdminAddressesController } from "./controllers/shoppingMall/admin/addresses/ShoppingmallAdminAddressesController";
import { ShoppingmallCategoriesController } from "./controllers/shoppingMall/categories/ShoppingmallCategoriesController";
import { ShoppingmallAdminCategoriesController } from "./controllers/shoppingMall/admin/categories/ShoppingmallAdminCategoriesController";
import { ShoppingmallProductsController } from "./controllers/shoppingMall/products/ShoppingmallProductsController";
import { ShoppingmallSellerProductsController } from "./controllers/shoppingMall/seller/products/ShoppingmallSellerProductsController";
import { ShoppingmallAdminProductsController } from "./controllers/shoppingMall/admin/products/ShoppingmallAdminProductsController";
import { ShoppingmallProductsSkusController } from "./controllers/shoppingMall/products/skus/ShoppingmallProductsSkusController";
import { ShoppingmallSellerProductsSkusController } from "./controllers/shoppingMall/seller/products/skus/ShoppingmallSellerProductsSkusController";
import { ShoppingmallAdminProductsSkusController } from "./controllers/shoppingMall/admin/products/skus/ShoppingmallAdminProductsSkusController";
import { ShoppingmallSellerProductsImagesController } from "./controllers/shoppingMall/seller/products/images/ShoppingmallSellerProductsImagesController";
import { ShoppingmallAdminProductsImagesController } from "./controllers/shoppingMall/admin/products/images/ShoppingmallAdminProductsImagesController";
import { ShoppingmallSkucolorsController } from "./controllers/shoppingMall/skuColors/ShoppingmallSkucolorsController";
import { ShoppingmallAdminSkucolorsController } from "./controllers/shoppingMall/admin/skuColors/ShoppingmallAdminSkucolorsController";
import { ShoppingmallSkusizesController } from "./controllers/shoppingMall/skuSizes/ShoppingmallSkusizesController";
import { ShoppingmallAdminSkusizesController } from "./controllers/shoppingMall/admin/skuSizes/ShoppingmallAdminSkusizesController";
import { ShoppingmallAdminSkuoptionsController } from "./controllers/shoppingMall/admin/skuOptions/ShoppingmallAdminSkuoptionsController";
import { ShoppingmallSkuoptionsController } from "./controllers/shoppingMall/skuOptions/ShoppingmallSkuoptionsController";
import { ShoppingmallSellerSkuoptionsController } from "./controllers/shoppingMall/seller/skuOptions/ShoppingmallSellerSkuoptionsController";
import { ShoppingmallAdminInventorytransactionsController } from "./controllers/shoppingMall/admin/inventoryTransactions/ShoppingmallAdminInventorytransactionsController";
import { ShoppingmallCustomerCartsController } from "./controllers/shoppingMall/customer/carts/ShoppingmallCustomerCartsController";
import { ShoppingmallCustomerCartsItemsController } from "./controllers/shoppingMall/customer/carts/items/ShoppingmallCustomerCartsItemsController";
import { ShoppingmallCustomerWishlistsController } from "./controllers/shoppingMall/customer/wishlists/ShoppingmallCustomerWishlistsController";
import { ShoppingmallCustomerWishlistsItemsController } from "./controllers/shoppingMall/customer/wishlists/items/ShoppingmallCustomerWishlistsItemsController";
import { ShoppingmallOrdersController } from "./controllers/shoppingMall/orders/ShoppingmallOrdersController";
import { ShoppingmallCustomerOrdersController } from "./controllers/shoppingMall/customer/orders/ShoppingmallCustomerOrdersController";
import { ShoppingmallCustomerOrdersRefundController } from "./controllers/shoppingMall/customer/orders/refund/ShoppingmallCustomerOrdersRefundController";
import { ShoppingmallCustomerOrdersStatushistoryController } from "./controllers/shoppingMall/customer/orders/statusHistory/ShoppingmallCustomerOrdersStatushistoryController";
import { ShoppingmallSellerOrdersStatushistoryController } from "./controllers/shoppingMall/seller/orders/statusHistory/ShoppingmallSellerOrdersStatushistoryController";
import { ShoppingmallAdminOrdersStatushistoryController } from "./controllers/shoppingMall/admin/orders/statusHistory/ShoppingmallAdminOrdersStatushistoryController";
import { ShoppingmallOrdersStatushistoryController } from "./controllers/shoppingMall/orders/statusHistory/ShoppingmallOrdersStatushistoryController";
import { ShoppingmallOrdersItemsController } from "./controllers/shoppingMall/orders/items/ShoppingmallOrdersItemsController";
import { ShoppingmallShipmentsController } from "./controllers/shoppingMall/shipments/ShoppingmallShipmentsController";
import { ShoppingmallSellerShipmentsController } from "./controllers/shoppingMall/seller/shipments/ShoppingmallSellerShipmentsController";
import { ShoppingmallCustomerCancellationsController } from "./controllers/shoppingMall/customer/cancellations/ShoppingmallCustomerCancellationsController";
import { ShoppingmallSellerCancellationsController } from "./controllers/shoppingMall/seller/cancellations/ShoppingmallSellerCancellationsController";
import { ShoppingmallAdminCancellationsController } from "./controllers/shoppingMall/admin/cancellations/ShoppingmallAdminCancellationsController";
import { ShoppingmallCancellationsController } from "./controllers/shoppingMall/cancellations/ShoppingmallCancellationsController";
import { ShoppingmallRefundrequestsController } from "./controllers/shoppingMall/refundRequests/ShoppingmallRefundrequestsController";
import { ShoppingmallCustomerRefundrequestsController } from "./controllers/shoppingMall/customer/refundRequests/ShoppingmallCustomerRefundrequestsController";
import { ShoppingmallSellerRefundrequestsController } from "./controllers/shoppingMall/seller/refundRequests/ShoppingmallSellerRefundrequestsController";
import { ShoppingmallAdminRefundrequestsController } from "./controllers/shoppingMall/admin/refundRequests/ShoppingmallAdminRefundrequestsController";
import { ShoppingmallPaymenttransactionsController } from "./controllers/shoppingMall/paymentTransactions/ShoppingmallPaymenttransactionsController";
import { ShoppingmallCustomerPaymentmethodsController } from "./controllers/shoppingMall/customer/paymentMethods/ShoppingmallCustomerPaymentmethodsController";
import { ShoppingmallRefundsController } from "./controllers/shoppingMall/refunds/ShoppingmallRefundsController";
import { ShoppingmallAdminSellerpayoutsController } from "./controllers/shoppingMall/admin/sellerPayouts/ShoppingmallAdminSellerpayoutsController";
import { ShoppingmallSellerSellerpayoutsController } from "./controllers/shoppingMall/seller/sellerPayouts/ShoppingmallSellerSellerpayoutsController";
import { ShoppingmallReviewsController } from "./controllers/shoppingMall/reviews/ShoppingmallReviewsController";
import { ShoppingmallCustomerReviewsController } from "./controllers/shoppingMall/customer/reviews/ShoppingmallCustomerReviewsController";
import { ShoppingmallReviewsImagesController } from "./controllers/shoppingMall/reviews/images/ShoppingmallReviewsImagesController";
import { ShoppingmallCustomerReviewsImagesController } from "./controllers/shoppingMall/customer/reviews/images/ShoppingmallCustomerReviewsImagesController";
import { ShoppingmallAdminReviewsImagesController } from "./controllers/shoppingMall/admin/reviews/images/ShoppingmallAdminReviewsImagesController";
import { ShoppingmallSellerSellerresponsesController } from "./controllers/shoppingMall/seller/sellerResponses/ShoppingmallSellerSellerresponsesController";
import { ShoppingmallAdminSellerresponsesController } from "./controllers/shoppingMall/admin/sellerResponses/ShoppingmallAdminSellerresponsesController";

@Module({
  controllers: [
    AuthCustomerController,
    AuthCustomerPasswordResetRequestController,
    AuthCustomerPasswordResetCompleteController,
    AuthCustomerEmailVerifyController,
    AuthCustomerEmailVerifyResendController,
    AuthCustomerPasswordChangeController,
    AuthCustomer_logoutAllController,
    AuthSellerController,
    AuthSellerPasswordResetRequestController,
    AuthSellerPasswordResetConfirmController,
    AuthSellerPasswordChangeController,
    AuthSellerVerificationResendController,
    AuthSellerVerificationConfirmController,
    AuthSellerSessionsController,
    AuthAdminController,
    AuthAdminPasswordResetRequestController,
    AuthAdminPasswordResetCompleteController,
    AuthAdminPasswordChangeController,
    AuthAdminSessionsController,
    AuthAdminSessionsAllController,
    ShoppingmallAdminSystemconfigsController,
    ShoppingmallAdminChannelsController,
    ShoppingmallAdminEmailtemplatesController,
    ShoppingmallAdminCustomersController,
    ShoppingmallCustomerCustomersSessionsController,
    ShoppingmallAdminCustomersSessionsController,
    ShoppingmallAdminSellersController,
    ShoppingmallSellerSellersController,
    ShoppingmallSellersSessionsController,
    ShoppingmallSellerSellersSessionsController,
    ShoppingmallAdminAdminsController,
    ShoppingmallAdminAdminsSessionsController,
    ShoppingmallCustomerAddressesController,
    ShoppingmallSellerAddressesController,
    ShoppingmallAdminAddressesController,
    ShoppingmallCategoriesController,
    ShoppingmallAdminCategoriesController,
    ShoppingmallProductsController,
    ShoppingmallSellerProductsController,
    ShoppingmallAdminProductsController,
    ShoppingmallProductsSkusController,
    ShoppingmallSellerProductsSkusController,
    ShoppingmallAdminProductsSkusController,
    ShoppingmallSellerProductsImagesController,
    ShoppingmallAdminProductsImagesController,
    ShoppingmallSkucolorsController,
    ShoppingmallAdminSkucolorsController,
    ShoppingmallSkusizesController,
    ShoppingmallAdminSkusizesController,
    ShoppingmallAdminSkuoptionsController,
    ShoppingmallSkuoptionsController,
    ShoppingmallSellerSkuoptionsController,
    ShoppingmallAdminInventorytransactionsController,
    ShoppingmallCustomerCartsController,
    ShoppingmallCustomerCartsItemsController,
    ShoppingmallCustomerWishlistsController,
    ShoppingmallCustomerWishlistsItemsController,
    ShoppingmallOrdersController,
    ShoppingmallCustomerOrdersController,
    ShoppingmallCustomerOrdersRefundController,
    ShoppingmallCustomerOrdersStatushistoryController,
    ShoppingmallSellerOrdersStatushistoryController,
    ShoppingmallAdminOrdersStatushistoryController,
    ShoppingmallOrdersStatushistoryController,
    ShoppingmallOrdersItemsController,
    ShoppingmallShipmentsController,
    ShoppingmallSellerShipmentsController,
    ShoppingmallCustomerCancellationsController,
    ShoppingmallSellerCancellationsController,
    ShoppingmallAdminCancellationsController,
    ShoppingmallCancellationsController,
    ShoppingmallRefundrequestsController,
    ShoppingmallCustomerRefundrequestsController,
    ShoppingmallSellerRefundrequestsController,
    ShoppingmallAdminRefundrequestsController,
    ShoppingmallPaymenttransactionsController,
    ShoppingmallCustomerPaymentmethodsController,
    ShoppingmallRefundsController,
    ShoppingmallAdminSellerpayoutsController,
    ShoppingmallSellerSellerpayoutsController,
    ShoppingmallReviewsController,
    ShoppingmallCustomerReviewsController,
    ShoppingmallReviewsImagesController,
    ShoppingmallCustomerReviewsImagesController,
    ShoppingmallAdminReviewsImagesController,
    ShoppingmallSellerSellerresponsesController,
    ShoppingmallAdminSellerresponsesController,
  ],
})
export class MyModule {}
