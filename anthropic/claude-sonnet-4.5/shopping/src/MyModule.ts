import { Module } from "@nestjs/common";

import { AuthBuyerController } from "./controllers/auth/buyer/AuthBuyerController";
import { AuthSellerController } from "./controllers/auth/seller/AuthSellerController";
import { AuthAdminController } from "./controllers/auth/admin/AuthAdminController";
import { ShoppingmallAdminSystemconfigsController } from "./controllers/shoppingMall/admin/systemConfigs/ShoppingmallAdminSystemconfigsController";
import { ShoppingmallAdminBuyersController } from "./controllers/shoppingMall/admin/buyers/ShoppingmallAdminBuyersController";
import { ShoppingmallBuyerBuyersController } from "./controllers/shoppingMall/buyer/buyers/ShoppingmallBuyerBuyersController";
import { ShoppingmallAdminBuyersSessionsController } from "./controllers/shoppingMall/admin/buyers/sessions/ShoppingmallAdminBuyersSessionsController";
import { ShoppingmallBuyerBuyersSessionsController } from "./controllers/shoppingMall/buyer/buyers/sessions/ShoppingmallBuyerBuyersSessionsController";
import { ShoppingmallAdminSellersController } from "./controllers/shoppingMall/admin/sellers/ShoppingmallAdminSellersController";
import { ShoppingmallSellerSellersController } from "./controllers/shoppingMall/seller/sellers/ShoppingmallSellerSellersController";
import { ShoppingmallSellerSellersSessionsController } from "./controllers/shoppingMall/seller/sellers/sessions/ShoppingmallSellerSellersSessionsController";
import { ShoppingmallAdminSellersSessionsController } from "./controllers/shoppingMall/admin/sellers/sessions/ShoppingmallAdminSellersSessionsController";
import { ShoppingmallAdminAdminsController } from "./controllers/shoppingMall/admin/admins/ShoppingmallAdminAdminsController";
import { ShoppingmallAdminAdminsSessionsController } from "./controllers/shoppingMall/admin/admins/sessions/ShoppingmallAdminAdminsSessionsController";
import { ShoppingmallCategoriesController } from "./controllers/shoppingMall/categories/ShoppingmallCategoriesController";
import { ShoppingmallAdminCategoriesController } from "./controllers/shoppingMall/admin/categories/ShoppingmallAdminCategoriesController";
import { ShoppingmallCategoriesChildrenController } from "./controllers/shoppingMall/categories/children/ShoppingmallCategoriesChildrenController";
import { ShoppingmallSalesController } from "./controllers/shoppingMall/sales/ShoppingmallSalesController";
import { ShoppingmallSellerSalesController } from "./controllers/shoppingMall/seller/sales/ShoppingmallSellerSalesController";
import { ShoppingmallAdminSalesController } from "./controllers/shoppingMall/admin/sales/ShoppingmallAdminSalesController";
import { ShoppingmallSalesVariantattributesController } from "./controllers/shoppingMall/sales/variantAttributes/ShoppingmallSalesVariantattributesController";
import { ShoppingmallSellerSalesVariantattributesController } from "./controllers/shoppingMall/seller/sales/variantAttributes/ShoppingmallSellerSalesVariantattributesController";
import { ShoppingmallSellerSalesVariantattributesValuesController } from "./controllers/shoppingMall/seller/sales/variantAttributes/values/ShoppingmallSellerSalesVariantattributesValuesController";
import { ShoppingmallAdminSalesVariantattributesValuesController } from "./controllers/shoppingMall/admin/sales/variantAttributes/values/ShoppingmallAdminSalesVariantattributesValuesController";
import { ShoppingmallSalesVariantattributesValuesController } from "./controllers/shoppingMall/sales/variantAttributes/values/ShoppingmallSalesVariantattributesValuesController";
import { ShoppingmallSalesSkusController } from "./controllers/shoppingMall/sales/skus/ShoppingmallSalesSkusController";
import { ShoppingmallSellerSalesSkusController } from "./controllers/shoppingMall/seller/sales/skus/ShoppingmallSellerSalesSkusController";
import { ShoppingmallSellerSalesImagesController } from "./controllers/shoppingMall/seller/sales/images/ShoppingmallSellerSalesImagesController";
import { ShoppingmallAdminSalesImagesController } from "./controllers/shoppingMall/admin/sales/images/ShoppingmallAdminSalesImagesController";
import { ShoppingmallSalesImagesController } from "./controllers/shoppingMall/sales/images/ShoppingmallSalesImagesController";
import { ShoppingmallSalesSkusImagesController } from "./controllers/shoppingMall/sales/skus/images/ShoppingmallSalesSkusImagesController";
import { ShoppingmallSellerSalesSkusImagesController } from "./controllers/shoppingMall/seller/sales/skus/images/ShoppingmallSellerSalesSkusImagesController";
import { ShoppingmallSalesQuestionsController } from "./controllers/shoppingMall/sales/questions/ShoppingmallSalesQuestionsController";
import { ShoppingmallBuyerSalesQuestionsController } from "./controllers/shoppingMall/buyer/sales/questions/ShoppingmallBuyerSalesQuestionsController";
import { ShoppingmallSellerSalesQuestionsController } from "./controllers/shoppingMall/seller/sales/questions/ShoppingmallSellerSalesQuestionsController";
import { ShoppingmallAdminSalesQuestionsController } from "./controllers/shoppingMall/admin/sales/questions/ShoppingmallAdminSalesQuestionsController";
import { ShoppingmallSalesQuestionsAnswerController } from "./controllers/shoppingMall/sales/questions/answer/ShoppingmallSalesQuestionsAnswerController";
import { ShoppingmallSellerSalesQuestionsAnswerController } from "./controllers/shoppingMall/seller/sales/questions/answer/ShoppingmallSellerSalesQuestionsAnswerController";
import { ShoppingmallSellerSalesSnapshotsController } from "./controllers/shoppingMall/seller/sales/snapshots/ShoppingmallSellerSalesSnapshotsController";
import { ShoppingmallAdminSalesSnapshotsController } from "./controllers/shoppingMall/admin/sales/snapshots/ShoppingmallAdminSalesSnapshotsController";
import { ShoppingmallSellerSaleskusInventorystockController } from "./controllers/shoppingMall/seller/saleSkus/inventoryStock/ShoppingmallSellerSaleskusInventorystockController";
import { ShoppingmallAdminSaleskusInventorystockController } from "./controllers/shoppingMall/admin/saleSkus/inventoryStock/ShoppingmallAdminSaleskusInventorystockController";
import { ShoppingmallAdminInventorytransactionsController } from "./controllers/shoppingMall/admin/inventoryTransactions/ShoppingmallAdminInventorytransactionsController";
import { ShoppingmallSellerInventorytransactionsController } from "./controllers/shoppingMall/seller/inventoryTransactions/ShoppingmallSellerInventorytransactionsController";
import { ShoppingmallSellerSaleskusInventorytransactionsController } from "./controllers/shoppingMall/seller/saleSkus/inventoryTransactions/ShoppingmallSellerSaleskusInventorytransactionsController";
import { ShoppingmallAdminSaleskusInventorytransactionsController } from "./controllers/shoppingMall/admin/saleSkus/inventoryTransactions/ShoppingmallAdminSaleskusInventorytransactionsController";
import { ShoppingmallSellerInventoryreservationsController } from "./controllers/shoppingMall/seller/inventoryReservations/ShoppingmallSellerInventoryreservationsController";
import { ShoppingmallAdminInventoryreservationsController } from "./controllers/shoppingMall/admin/inventoryReservations/ShoppingmallAdminInventoryreservationsController";
import { ShoppingmallBuyerInventoryreservationsController } from "./controllers/shoppingMall/buyer/inventoryReservations/ShoppingmallBuyerInventoryreservationsController";
import { ShoppingmallInventoryreservationsController } from "./controllers/shoppingMall/inventoryReservations/ShoppingmallInventoryreservationsController";
import { ShoppingmallBuyerBuyersMeCartController } from "./controllers/shoppingMall/buyer/buyers/me/cart/ShoppingmallBuyerBuyersMeCartController";
import { ShoppingmallBuyerBuyersMeCartItemsController } from "./controllers/shoppingMall/buyer/buyers/me/cart/items/ShoppingmallBuyerBuyersMeCartItemsController";
import { ShoppingmallBuyerBuyersMeWishlistController } from "./controllers/shoppingMall/buyer/buyers/me/wishlist/ShoppingmallBuyerBuyersMeWishlistController";
import { ShoppingmallBuyerBuyersMeWishlistItemsController } from "./controllers/shoppingMall/buyer/buyers/me/wishlist/items/ShoppingmallBuyerBuyersMeWishlistItemsController";
import { ShoppingmallBuyerBuyersMeAddressesController } from "./controllers/shoppingMall/buyer/buyers/me/addresses/ShoppingmallBuyerBuyersMeAddressesController";
import { ShoppingmallBuyerOrdersController } from "./controllers/shoppingMall/buyer/orders/ShoppingmallBuyerOrdersController";
import { ShoppingmallSellerOrdersController } from "./controllers/shoppingMall/seller/orders/ShoppingmallSellerOrdersController";
import { ShoppingmallAdminOrdersController } from "./controllers/shoppingMall/admin/orders/ShoppingmallAdminOrdersController";
import { ShoppingmallBuyerOrdersSellersController } from "./controllers/shoppingMall/buyer/orders/sellers/ShoppingmallBuyerOrdersSellersController";
import { ShoppingmallSellerOrdersSellersController } from "./controllers/shoppingMall/seller/orders/sellers/ShoppingmallSellerOrdersSellersController";
import { ShoppingmallAdminOrdersSellersController } from "./controllers/shoppingMall/admin/orders/sellers/ShoppingmallAdminOrdersSellersController";
import { ShoppingmallBuyerOrdersItemsController } from "./controllers/shoppingMall/buyer/orders/items/ShoppingmallBuyerOrdersItemsController";
import { ShoppingmallSellerOrdersItemsController } from "./controllers/shoppingMall/seller/orders/items/ShoppingmallSellerOrdersItemsController";
import { ShoppingmallAdminOrdersItemsController } from "./controllers/shoppingMall/admin/orders/items/ShoppingmallAdminOrdersItemsController";
import { ShoppingmallBuyerOrdersStatushistoriesController } from "./controllers/shoppingMall/buyer/orders/statusHistories/ShoppingmallBuyerOrdersStatushistoriesController";
import { ShoppingmallSellerOrdersStatushistoriesController } from "./controllers/shoppingMall/seller/orders/statusHistories/ShoppingmallSellerOrdersStatushistoriesController";
import { ShoppingmallAdminOrdersStatushistoriesController } from "./controllers/shoppingMall/admin/orders/statusHistories/ShoppingmallAdminOrdersStatushistoriesController";
import { ShoppingmallAdminCancellationsController } from "./controllers/shoppingMall/admin/cancellations/ShoppingmallAdminCancellationsController";
import { ShoppingmallBuyerCancellationsController } from "./controllers/shoppingMall/buyer/cancellations/ShoppingmallBuyerCancellationsController";
import { ShoppingmallAdminRefundrequestsController } from "./controllers/shoppingMall/admin/refundRequests/ShoppingmallAdminRefundrequestsController";
import { ShoppingmallBuyerRefundrequestsController } from "./controllers/shoppingMall/buyer/refundRequests/ShoppingmallBuyerRefundrequestsController";
import { ShoppingmallBuyerPaymentmethodsController } from "./controllers/shoppingMall/buyer/paymentMethods/ShoppingmallBuyerPaymentmethodsController";
import { ShoppingmallAdminPaymenttransactionsController } from "./controllers/shoppingMall/admin/paymentTransactions/ShoppingmallAdminPaymenttransactionsController";
import { ShoppingmallBuyerOrdersPaymenttransactionsController } from "./controllers/shoppingMall/buyer/orders/paymentTransactions/ShoppingmallBuyerOrdersPaymenttransactionsController";
import { ShoppingmallSellerOrdersPaymenttransactionsController } from "./controllers/shoppingMall/seller/orders/paymentTransactions/ShoppingmallSellerOrdersPaymenttransactionsController";
import { ShoppingmallAdminOrdersPaymenttransactionsController } from "./controllers/shoppingMall/admin/orders/paymentTransactions/ShoppingmallAdminOrdersPaymenttransactionsController";
import { ShoppingmallAdminRefundtransactionsController } from "./controllers/shoppingMall/admin/refundTransactions/ShoppingmallAdminRefundtransactionsController";
import { ShoppingmallBuyerOrdersRefundtransactionsController } from "./controllers/shoppingMall/buyer/orders/refundTransactions/ShoppingmallBuyerOrdersRefundtransactionsController";
import { ShoppingmallAdminOrdersRefundtransactionsController } from "./controllers/shoppingMall/admin/orders/refundTransactions/ShoppingmallAdminOrdersRefundtransactionsController";
import { ShoppingmallSellerSellerpayoutsController } from "./controllers/shoppingMall/seller/sellerPayouts/ShoppingmallSellerSellerpayoutsController";
import { ShoppingmallAdminSellerpayoutsController } from "./controllers/shoppingMall/admin/sellerPayouts/ShoppingmallAdminSellerpayoutsController";
import { ShoppingmallAdminPlatformcommissionsController } from "./controllers/shoppingMall/admin/platformCommissions/ShoppingmallAdminPlatformcommissionsController";
import { ShoppingmallAdminOrdersPlatformcommissionsController } from "./controllers/shoppingMall/admin/orders/platformCommissions/ShoppingmallAdminOrdersPlatformcommissionsController";
import { ShoppingmallSellerSellersPlatformcommissionsController } from "./controllers/shoppingMall/seller/sellers/platformCommissions/ShoppingmallSellerSellersPlatformcommissionsController";
import { ShoppingmallAdminSellersPlatformcommissionsController } from "./controllers/shoppingMall/admin/sellers/platformCommissions/ShoppingmallAdminSellersPlatformcommissionsController";
import { ShoppingmallAdminStatisticsRevenueController } from "./controllers/shoppingMall/admin/statistics/revenue/ShoppingmallAdminStatisticsRevenueController";
import { ShoppingmallAdminStatisticsSeller_earningsController } from "./controllers/shoppingMall/admin/statistics/seller-earnings/ShoppingmallAdminStatisticsSeller_earningsController";
import { ShoppingmallReviewsController } from "./controllers/shoppingMall/reviews/ShoppingmallReviewsController";
import { ShoppingmallBuyerReviewsController } from "./controllers/shoppingMall/buyer/reviews/ShoppingmallBuyerReviewsController";
import { ShoppingmallAdminReviewsController } from "./controllers/shoppingMall/admin/reviews/ShoppingmallAdminReviewsController";
import { ShoppingmallReviewsImagesController } from "./controllers/shoppingMall/reviews/images/ShoppingmallReviewsImagesController";
import { ShoppingmallBuyerReviewsImagesController } from "./controllers/shoppingMall/buyer/reviews/images/ShoppingmallBuyerReviewsImagesController";
import { ShoppingmallReviewsSellerresponseController } from "./controllers/shoppingMall/reviews/sellerResponse/ShoppingmallReviewsSellerresponseController";
import { ShoppingmallSellerReviewsSellerresponseController } from "./controllers/shoppingMall/seller/reviews/sellerResponse/ShoppingmallSellerReviewsSellerresponseController";
import { ShoppingmallReviewsHelpfulnessvotesController } from "./controllers/shoppingMall/reviews/helpfulnessVotes/ShoppingmallReviewsHelpfulnessvotesController";
import { ShoppingmallBuyerReviewsHelpfulnessvotesController } from "./controllers/shoppingMall/buyer/reviews/helpfulnessVotes/ShoppingmallBuyerReviewsHelpfulnessvotesController";
import { ShoppingmallAdminReviewsReportsController } from "./controllers/shoppingMall/admin/reviews/reports/ShoppingmallAdminReviewsReportsController";
import { ShoppingmallBuyerReviewsReportsController } from "./controllers/shoppingMall/buyer/reviews/reports/ShoppingmallBuyerReviewsReportsController";
import { ShoppingmallAdminReviewsModerationlogsController } from "./controllers/shoppingMall/admin/reviews/moderationLogs/ShoppingmallAdminReviewsModerationlogsController";
import { ShoppingmallSalesReviewsController } from "./controllers/shoppingMall/sales/reviews/ShoppingmallSalesReviewsController";
import { ShoppingmallBuyerBuyersReviewsController } from "./controllers/shoppingMall/buyer/buyers/reviews/ShoppingmallBuyerBuyersReviewsController";
import { ShoppingmallAdminBuyersReviewsController } from "./controllers/shoppingMall/admin/buyers/reviews/ShoppingmallAdminBuyersReviewsController";
import { ShoppingmallSellerSellersReviewsController } from "./controllers/shoppingMall/seller/sellers/reviews/ShoppingmallSellerSellersReviewsController";

@Module({
  controllers: [
    AuthBuyerController,
    AuthSellerController,
    AuthAdminController,
    ShoppingmallAdminSystemconfigsController,
    ShoppingmallAdminBuyersController,
    ShoppingmallBuyerBuyersController,
    ShoppingmallAdminBuyersSessionsController,
    ShoppingmallBuyerBuyersSessionsController,
    ShoppingmallAdminSellersController,
    ShoppingmallSellerSellersController,
    ShoppingmallSellerSellersSessionsController,
    ShoppingmallAdminSellersSessionsController,
    ShoppingmallAdminAdminsController,
    ShoppingmallAdminAdminsSessionsController,
    ShoppingmallCategoriesController,
    ShoppingmallAdminCategoriesController,
    ShoppingmallCategoriesChildrenController,
    ShoppingmallSalesController,
    ShoppingmallSellerSalesController,
    ShoppingmallAdminSalesController,
    ShoppingmallSalesVariantattributesController,
    ShoppingmallSellerSalesVariantattributesController,
    ShoppingmallSellerSalesVariantattributesValuesController,
    ShoppingmallAdminSalesVariantattributesValuesController,
    ShoppingmallSalesVariantattributesValuesController,
    ShoppingmallSalesSkusController,
    ShoppingmallSellerSalesSkusController,
    ShoppingmallSellerSalesImagesController,
    ShoppingmallAdminSalesImagesController,
    ShoppingmallSalesImagesController,
    ShoppingmallSalesSkusImagesController,
    ShoppingmallSellerSalesSkusImagesController,
    ShoppingmallSalesQuestionsController,
    ShoppingmallBuyerSalesQuestionsController,
    ShoppingmallSellerSalesQuestionsController,
    ShoppingmallAdminSalesQuestionsController,
    ShoppingmallSalesQuestionsAnswerController,
    ShoppingmallSellerSalesQuestionsAnswerController,
    ShoppingmallSellerSalesSnapshotsController,
    ShoppingmallAdminSalesSnapshotsController,
    ShoppingmallSellerSaleskusInventorystockController,
    ShoppingmallAdminSaleskusInventorystockController,
    ShoppingmallAdminInventorytransactionsController,
    ShoppingmallSellerInventorytransactionsController,
    ShoppingmallSellerSaleskusInventorytransactionsController,
    ShoppingmallAdminSaleskusInventorytransactionsController,
    ShoppingmallSellerInventoryreservationsController,
    ShoppingmallAdminInventoryreservationsController,
    ShoppingmallBuyerInventoryreservationsController,
    ShoppingmallInventoryreservationsController,
    ShoppingmallBuyerBuyersMeCartController,
    ShoppingmallBuyerBuyersMeCartItemsController,
    ShoppingmallBuyerBuyersMeWishlistController,
    ShoppingmallBuyerBuyersMeWishlistItemsController,
    ShoppingmallBuyerBuyersMeAddressesController,
    ShoppingmallBuyerOrdersController,
    ShoppingmallSellerOrdersController,
    ShoppingmallAdminOrdersController,
    ShoppingmallBuyerOrdersSellersController,
    ShoppingmallSellerOrdersSellersController,
    ShoppingmallAdminOrdersSellersController,
    ShoppingmallBuyerOrdersItemsController,
    ShoppingmallSellerOrdersItemsController,
    ShoppingmallAdminOrdersItemsController,
    ShoppingmallBuyerOrdersStatushistoriesController,
    ShoppingmallSellerOrdersStatushistoriesController,
    ShoppingmallAdminOrdersStatushistoriesController,
    ShoppingmallAdminCancellationsController,
    ShoppingmallBuyerCancellationsController,
    ShoppingmallAdminRefundrequestsController,
    ShoppingmallBuyerRefundrequestsController,
    ShoppingmallBuyerPaymentmethodsController,
    ShoppingmallAdminPaymenttransactionsController,
    ShoppingmallBuyerOrdersPaymenttransactionsController,
    ShoppingmallSellerOrdersPaymenttransactionsController,
    ShoppingmallAdminOrdersPaymenttransactionsController,
    ShoppingmallAdminRefundtransactionsController,
    ShoppingmallBuyerOrdersRefundtransactionsController,
    ShoppingmallAdminOrdersRefundtransactionsController,
    ShoppingmallSellerSellerpayoutsController,
    ShoppingmallAdminSellerpayoutsController,
    ShoppingmallAdminPlatformcommissionsController,
    ShoppingmallAdminOrdersPlatformcommissionsController,
    ShoppingmallSellerSellersPlatformcommissionsController,
    ShoppingmallAdminSellersPlatformcommissionsController,
    ShoppingmallAdminStatisticsRevenueController,
    ShoppingmallAdminStatisticsSeller_earningsController,
    ShoppingmallReviewsController,
    ShoppingmallBuyerReviewsController,
    ShoppingmallAdminReviewsController,
    ShoppingmallReviewsImagesController,
    ShoppingmallBuyerReviewsImagesController,
    ShoppingmallReviewsSellerresponseController,
    ShoppingmallSellerReviewsSellerresponseController,
    ShoppingmallReviewsHelpfulnessvotesController,
    ShoppingmallBuyerReviewsHelpfulnessvotesController,
    ShoppingmallAdminReviewsReportsController,
    ShoppingmallBuyerReviewsReportsController,
    ShoppingmallAdminReviewsModerationlogsController,
    ShoppingmallSalesReviewsController,
    ShoppingmallBuyerBuyersReviewsController,
    ShoppingmallAdminBuyersReviewsController,
    ShoppingmallSellerSellersReviewsController,
  ],
})
export class MyModule {}
