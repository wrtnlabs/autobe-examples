import { Module } from "@nestjs/common";

import { AuthGuestController } from "./controllers/auth/guest/AuthGuestController";
import { AuthCustomerController } from "./controllers/auth/customer/AuthCustomerController";
import { AuthSellerController } from "./controllers/auth/seller/AuthSellerController";
import { AuthAdminController } from "./controllers/auth/admin/AuthAdminController";
import { ShoppingmallGuestsController } from "./controllers/shoppingMall/guests/ShoppingmallGuestsController";
import { ShoppingmallAdminGuestsController } from "./controllers/shoppingMall/admin/guests/ShoppingmallAdminGuestsController";
import { ShoppingmallAdminGuestsGuestsessionsController } from "./controllers/shoppingMall/admin/guests/guestSessions/ShoppingmallAdminGuestsGuestsessionsController";
import { ShoppingmallGuestsGuestsessionsController } from "./controllers/shoppingMall/guests/guestSessions/ShoppingmallGuestsGuestsessionsController";
import { ShoppingmallAdminCustomersController } from "./controllers/shoppingMall/admin/customers/ShoppingmallAdminCustomersController";
import { ShoppingmallCustomersController } from "./controllers/shoppingMall/customers/ShoppingmallCustomersController";
import { ShoppingmallGuestCustomersController } from "./controllers/shoppingMall/guest/customers/ShoppingmallGuestCustomersController";
import { ShoppingmallCustomerCustomersController } from "./controllers/shoppingMall/customer/customers/ShoppingmallCustomerCustomersController";
import { ShoppingmallAdminCustomersCustomersessionsController } from "./controllers/shoppingMall/admin/customers/customerSessions/ShoppingmallAdminCustomersCustomersessionsController";
import { ShoppingmallCustomerCustomersCustomersessionsController } from "./controllers/shoppingMall/customer/customers/customerSessions/ShoppingmallCustomerCustomersCustomersessionsController";
import { ShoppingmallAdminSellersController } from "./controllers/shoppingMall/admin/sellers/ShoppingmallAdminSellersController";
import { ShoppingmallAdminSellersSellersessionsController } from "./controllers/shoppingMall/admin/sellers/sellerSessions/ShoppingmallAdminSellersSellersessionsController";
import { ShoppingmallSellerSellersSellersessionsController } from "./controllers/shoppingMall/seller/sellers/sellerSessions/ShoppingmallSellerSellersSellersessionsController";
import { ShoppingmallAdminAdminsController } from "./controllers/shoppingMall/admin/admins/ShoppingmallAdminAdminsController";
import { ShoppingmallAdminAdminsAdminsessionsController } from "./controllers/shoppingMall/admin/admins/adminSessions/ShoppingmallAdminAdminsAdminsessionsController";
import { ShoppingmallShoppingmallchannelsController } from "./controllers/shoppingMall/shoppingMallChannels/ShoppingmallShoppingmallchannelsController";
import { ShoppingmallAdminShoppingmallchannelsController } from "./controllers/shoppingMall/admin/shoppingMallChannels/ShoppingmallAdminShoppingmallchannelsController";
import { ShoppingmallAdminShoppingmallchannelsShoppingmallsectionsController } from "./controllers/shoppingMall/admin/shoppingMallChannels/shoppingMallSections/ShoppingmallAdminShoppingmallchannelsShoppingmallsectionsController";
import { ShoppingmallShoppingmallchannelsShoppingmallsectionsController } from "./controllers/shoppingMall/shoppingMallChannels/shoppingMallSections/ShoppingmallShoppingmallchannelsShoppingmallsectionsController";
import { ShoppingmallShoppingmallchannelsShoppingmallchannelcategoriesController } from "./controllers/shoppingMall/shoppingMallChannels/shoppingMallChannelCategories/ShoppingmallShoppingmallchannelsShoppingmallchannelcategoriesController";
import { ShoppingmallAdminShoppingmallchannelsShoppingmallchannelcategoriesController } from "./controllers/shoppingMall/admin/shoppingMallChannels/shoppingMallChannelCategories/ShoppingmallAdminShoppingmallchannelsShoppingmallchannelcategoriesController";
import { ShoppingmallAdminShoppingmallconfigurationsController } from "./controllers/shoppingMall/admin/shoppingMallConfigurations/ShoppingmallAdminShoppingmallconfigurationsController";
import { ShoppingmallShoppingmallconfigurationsController } from "./controllers/shoppingMall/shoppingMallConfigurations/ShoppingmallShoppingmallconfigurationsController";
import { ShoppingmallCustomerShoppingmallproductsController } from "./controllers/shoppingMall/customer/shoppingMallProducts/ShoppingmallCustomerShoppingmallproductsController";
import { ShoppingmallGuestShoppingmallproductsController } from "./controllers/shoppingMall/guest/shoppingMallProducts/ShoppingmallGuestShoppingmallproductsController";
import { ShoppingmallSellerShoppingmallproductsController } from "./controllers/shoppingMall/seller/shoppingMallProducts/ShoppingmallSellerShoppingmallproductsController";
import { ShoppingmallAdminShoppingmallproductsController } from "./controllers/shoppingMall/admin/shoppingMallProducts/ShoppingmallAdminShoppingmallproductsController";
import { ShoppingmallCustomerShoppingmallproductsShoppingmallproductskusController } from "./controllers/shoppingMall/customer/shoppingMallProducts/shoppingMallProductSkus/ShoppingmallCustomerShoppingmallproductsShoppingmallproductskusController";
import { ShoppingmallSellerShoppingmallproductsShoppingmallproductskusController } from "./controllers/shoppingMall/seller/shoppingMallProducts/shoppingMallProductSkus/ShoppingmallSellerShoppingmallproductsShoppingmallproductskusController";
import { ShoppingmallAdminShoppingmallproductsShoppingmallproductskusController } from "./controllers/shoppingMall/admin/shoppingMallProducts/shoppingMallProductSkus/ShoppingmallAdminShoppingmallproductsShoppingmallproductskusController";
import { ShoppingmallShoppingmallproductcategoriesController } from "./controllers/shoppingMall/shoppingMallProductCategories/ShoppingmallShoppingmallproductcategoriesController";
import { ShoppingmallAdminShoppingmallproductcategoriesController } from "./controllers/shoppingMall/admin/shoppingMallProductCategories/ShoppingmallAdminShoppingmallproductcategoriesController";
import { ShoppingmallShoppingmallskuattributesController } from "./controllers/shoppingMall/shoppingMallSkuAttributes/ShoppingmallShoppingmallskuattributesController";
import { ShoppingmallCustomerShoppingmallskuattributesController } from "./controllers/shoppingMall/customer/shoppingMallSkuAttributes/ShoppingmallCustomerShoppingmallskuattributesController";
import { ShoppingmallAdminShoppingmallskuattributesController } from "./controllers/shoppingMall/admin/shoppingMallSkuAttributes/ShoppingmallAdminShoppingmallskuattributesController";
import { ShoppingmallCustomerShoppingmallskuattributevaluesController } from "./controllers/shoppingMall/customer/shoppingMallSkuAttributeValues/ShoppingmallCustomerShoppingmallskuattributevaluesController";
import { ShoppingmallSellerShoppingmallskuattributevaluesController } from "./controllers/shoppingMall/seller/shoppingMallSkuAttributeValues/ShoppingmallSellerShoppingmallskuattributevaluesController";
import { ShoppingmallAdminShoppingmallskuattributevaluesController } from "./controllers/shoppingMall/admin/shoppingMallSkuAttributeValues/ShoppingmallAdminShoppingmallskuattributevaluesController";
import { ShoppingmallCustomerShoppingmallskuoptiongroupsController } from "./controllers/shoppingMall/customer/shoppingMallSkuOptionGroups/ShoppingmallCustomerShoppingmallskuoptiongroupsController";
import { ShoppingmallShoppingmallskuoptiongroupsController } from "./controllers/shoppingMall/shoppingMallSkuOptionGroups/ShoppingmallShoppingmallskuoptiongroupsController";
import { ShoppingmallAdminShoppingmallskuoptiongroupsController } from "./controllers/shoppingMall/admin/shoppingMallSkuOptionGroups/ShoppingmallAdminShoppingmallskuoptiongroupsController";
import { ShoppingmallShoppingmallskuoptionsController } from "./controllers/shoppingMall/shoppingMallSkuOptions/ShoppingmallShoppingmallskuoptionsController";
import { ShoppingmallCustomerShoppingmallskuoptionsController } from "./controllers/shoppingMall/customer/shoppingMallSkuOptions/ShoppingmallCustomerShoppingmallskuoptionsController";
import { ShoppingmallSellerShoppingmallskuoptionsController } from "./controllers/shoppingMall/seller/shoppingMallSkuOptions/ShoppingmallSellerShoppingmallskuoptionsController";
import { ShoppingmallAdminShoppingmallskuoptionsController } from "./controllers/shoppingMall/admin/shoppingMallSkuOptions/ShoppingmallAdminShoppingmallskuoptionsController";
import { ShoppingmallAdminShoppingmallsalessnapshotsController } from "./controllers/shoppingMall/admin/shoppingMallSalesSnapshots/ShoppingmallAdminShoppingmallsalessnapshotsController";
import { ShoppingmallAdminShoppingcartsController } from "./controllers/shoppingMall/admin/shoppingCarts/ShoppingmallAdminShoppingcartsController";
import { ShoppingmallCustomerShoppingcartsController } from "./controllers/shoppingMall/customer/shoppingCarts/ShoppingmallCustomerShoppingcartsController";
import { ShoppingmallCustomerShoppingcartsCartitemsController } from "./controllers/shoppingMall/customer/shoppingCarts/cartItems/ShoppingmallCustomerShoppingcartsCartitemsController";
import { ShoppingmallCustomerWishlistsController } from "./controllers/shoppingMall/customer/wishlists/ShoppingmallCustomerWishlistsController";
import { ShoppingmallCustomerWishlistsWishlistitemsController } from "./controllers/shoppingMall/customer/wishlists/wishlistItems/ShoppingmallCustomerWishlistsWishlistitemsController";
import { ShoppingmallCustomerShoppingmallordersController } from "./controllers/shoppingMall/customer/shoppingMallOrders/ShoppingmallCustomerShoppingmallordersController";
import { ShoppingmallCustomerShoppingmallordersOrderitemsController } from "./controllers/shoppingMall/customer/shoppingMallOrders/orderItems/ShoppingmallCustomerShoppingmallordersOrderitemsController";
import { ShoppingmallAdminShoppingmallordersOrderitemsController } from "./controllers/shoppingMall/admin/shoppingMallOrders/orderItems/ShoppingmallAdminShoppingmallordersOrderitemsController";
import { ShoppingmallAdminShoppingmallpaymentsController } from "./controllers/shoppingMall/admin/shoppingMallPayments/ShoppingmallAdminShoppingmallpaymentsController";
import { ShoppingmallCustomerShoppingmallpaymentsController } from "./controllers/shoppingMall/customer/shoppingMallPayments/ShoppingmallCustomerShoppingmallpaymentsController";
import { ShoppingmallCustomerShoppingmallshipmentsController } from "./controllers/shoppingMall/customer/shoppingMallShipments/ShoppingmallCustomerShoppingmallshipmentsController";
import { ShoppingmallAdminShoppingmallshipmentsController } from "./controllers/shoppingMall/admin/shoppingMallShipments/ShoppingmallAdminShoppingmallshipmentsController";
import { ShoppingmallAdminShoppingmallordercancellationsController } from "./controllers/shoppingMall/admin/shoppingMallOrderCancellations/ShoppingmallAdminShoppingmallordercancellationsController";
import { ShoppingmallCustomerShoppingmallordercancellationsController } from "./controllers/shoppingMall/customer/shoppingMallOrderCancellations/ShoppingmallCustomerShoppingmallordercancellationsController";
import { ShoppingmallSellerShoppingmallordercancellationsController } from "./controllers/shoppingMall/seller/shoppingMallOrderCancellations/ShoppingmallSellerShoppingmallordercancellationsController";
import { ShoppingmallAdminShoppingmallorderrefundsController } from "./controllers/shoppingMall/admin/shoppingMallOrderRefunds/ShoppingmallAdminShoppingmallorderrefundsController";
import { ShoppingmallCustomerShoppingmallorderrefundsController } from "./controllers/shoppingMall/customer/shoppingMallOrderRefunds/ShoppingmallCustomerShoppingmallorderrefundsController";
import { ShoppingmallAdminCouponsController } from "./controllers/shoppingMall/admin/coupons/ShoppingmallAdminCouponsController";
import { ShoppingmallAdminCouponsRedemptionsController } from "./controllers/shoppingMall/admin/coupons/redemptions/ShoppingmallAdminCouponsRedemptionsController";
import { ShoppingmallCustomerCouponsRedemptionsController } from "./controllers/shoppingMall/customer/coupons/redemptions/ShoppingmallCustomerCouponsRedemptionsController";
import { ShoppingmallAdminShoppingmallcoinsController } from "./controllers/shoppingMall/admin/shoppingMallCoins/ShoppingmallAdminShoppingmallcoinsController";
import { ShoppingmallCustomerShoppingmallcoinsController } from "./controllers/shoppingMall/customer/shoppingMallCoins/ShoppingmallCustomerShoppingmallcoinsController";
import { ShoppingmallAdminShoppingmallmileagetransactionsController } from "./controllers/shoppingMall/admin/shoppingMallMileageTransactions/ShoppingmallAdminShoppingmallmileagetransactionsController";
import { ShoppingmallAdminCustomerinquiriesController } from "./controllers/shoppingMall/admin/customerInquiries/ShoppingmallAdminCustomerinquiriesController";
import { ShoppingmallCustomerCustomerinquiriesController } from "./controllers/shoppingMall/customer/customerInquiries/ShoppingmallCustomerCustomerinquiriesController";
import { ShoppingmallFaqsController } from "./controllers/shoppingMall/faqs/ShoppingmallFaqsController";
import { ShoppingmallCustomerFaqsController } from "./controllers/shoppingMall/customer/faqs/ShoppingmallCustomerFaqsController";
import { ShoppingmallAdminFaqsController } from "./controllers/shoppingMall/admin/faqs/ShoppingmallAdminFaqsController";
import { ShoppingmallCustomerShoppingmallFavoriteproductsController } from "./controllers/shoppingMall/customer/shoppingMall/favoriteProducts/ShoppingmallCustomerShoppingmallFavoriteproductsController";
import { ShoppingmallCustomerShoppingmallFavoritesellersController } from "./controllers/shoppingMall/customer/shoppingMall/favoriteSellers/ShoppingmallCustomerShoppingmallFavoritesellersController";
import { ShoppingmallCustomerShoppingmallarticlesController } from "./controllers/shoppingMall/customer/shoppingMallArticles/ShoppingmallCustomerShoppingmallarticlesController";
import { ShoppingmallShoppingmallarticlesController } from "./controllers/shoppingMall/shoppingMallArticles/ShoppingmallShoppingmallarticlesController";
import { ShoppingmallShoppingmallarticlecategoriesController } from "./controllers/shoppingMall/shoppingMallArticleCategories/ShoppingmallShoppingmallarticlecategoriesController";
import { ShoppingmallCustomerShoppingmallarticlecategoriesController } from "./controllers/shoppingMall/customer/shoppingMallArticleCategories/ShoppingmallCustomerShoppingmallarticlecategoriesController";
import { ShoppingmallSellerShoppingmallarticlecategoriesController } from "./controllers/shoppingMall/seller/shoppingMallArticleCategories/ShoppingmallSellerShoppingmallarticlecategoriesController";
import { ShoppingmallAdminShoppingmallarticlecategoriesController } from "./controllers/shoppingMall/admin/shoppingMallArticleCategories/ShoppingmallAdminShoppingmallarticlecategoriesController";
import { ShoppingmallShoppingmallarticlecategoriesCommentsController } from "./controllers/shoppingMall/shoppingMallArticleCategories/comments/ShoppingmallShoppingmallarticlecategoriesCommentsController";
import { ShoppingmallCustomerShoppingmallarticlecategoriesCommentsController } from "./controllers/shoppingMall/customer/shoppingMallArticleCategories/comments/ShoppingmallCustomerShoppingmallarticlecategoriesCommentsController";
import { ShoppingmallAdminShoppingmallarticlecategoriesCommentsController } from "./controllers/shoppingMall/admin/shoppingMallArticleCategories/comments/ShoppingmallAdminShoppingmallarticlecategoriesCommentsController";

@Module({
  controllers: [
    AuthGuestController,
    AuthCustomerController,
    AuthSellerController,
    AuthAdminController,
    ShoppingmallGuestsController,
    ShoppingmallAdminGuestsController,
    ShoppingmallAdminGuestsGuestsessionsController,
    ShoppingmallGuestsGuestsessionsController,
    ShoppingmallAdminCustomersController,
    ShoppingmallCustomersController,
    ShoppingmallGuestCustomersController,
    ShoppingmallCustomerCustomersController,
    ShoppingmallAdminCustomersCustomersessionsController,
    ShoppingmallCustomerCustomersCustomersessionsController,
    ShoppingmallAdminSellersController,
    ShoppingmallAdminSellersSellersessionsController,
    ShoppingmallSellerSellersSellersessionsController,
    ShoppingmallAdminAdminsController,
    ShoppingmallAdminAdminsAdminsessionsController,
    ShoppingmallShoppingmallchannelsController,
    ShoppingmallAdminShoppingmallchannelsController,
    ShoppingmallAdminShoppingmallchannelsShoppingmallsectionsController,
    ShoppingmallShoppingmallchannelsShoppingmallsectionsController,
    ShoppingmallShoppingmallchannelsShoppingmallchannelcategoriesController,
    ShoppingmallAdminShoppingmallchannelsShoppingmallchannelcategoriesController,
    ShoppingmallAdminShoppingmallconfigurationsController,
    ShoppingmallShoppingmallconfigurationsController,
    ShoppingmallCustomerShoppingmallproductsController,
    ShoppingmallGuestShoppingmallproductsController,
    ShoppingmallSellerShoppingmallproductsController,
    ShoppingmallAdminShoppingmallproductsController,
    ShoppingmallCustomerShoppingmallproductsShoppingmallproductskusController,
    ShoppingmallSellerShoppingmallproductsShoppingmallproductskusController,
    ShoppingmallAdminShoppingmallproductsShoppingmallproductskusController,
    ShoppingmallShoppingmallproductcategoriesController,
    ShoppingmallAdminShoppingmallproductcategoriesController,
    ShoppingmallShoppingmallskuattributesController,
    ShoppingmallCustomerShoppingmallskuattributesController,
    ShoppingmallAdminShoppingmallskuattributesController,
    ShoppingmallCustomerShoppingmallskuattributevaluesController,
    ShoppingmallSellerShoppingmallskuattributevaluesController,
    ShoppingmallAdminShoppingmallskuattributevaluesController,
    ShoppingmallCustomerShoppingmallskuoptiongroupsController,
    ShoppingmallShoppingmallskuoptiongroupsController,
    ShoppingmallAdminShoppingmallskuoptiongroupsController,
    ShoppingmallShoppingmallskuoptionsController,
    ShoppingmallCustomerShoppingmallskuoptionsController,
    ShoppingmallSellerShoppingmallskuoptionsController,
    ShoppingmallAdminShoppingmallskuoptionsController,
    ShoppingmallAdminShoppingmallsalessnapshotsController,
    ShoppingmallAdminShoppingcartsController,
    ShoppingmallCustomerShoppingcartsController,
    ShoppingmallCustomerShoppingcartsCartitemsController,
    ShoppingmallCustomerWishlistsController,
    ShoppingmallCustomerWishlistsWishlistitemsController,
    ShoppingmallCustomerShoppingmallordersController,
    ShoppingmallCustomerShoppingmallordersOrderitemsController,
    ShoppingmallAdminShoppingmallordersOrderitemsController,
    ShoppingmallAdminShoppingmallpaymentsController,
    ShoppingmallCustomerShoppingmallpaymentsController,
    ShoppingmallCustomerShoppingmallshipmentsController,
    ShoppingmallAdminShoppingmallshipmentsController,
    ShoppingmallAdminShoppingmallordercancellationsController,
    ShoppingmallCustomerShoppingmallordercancellationsController,
    ShoppingmallSellerShoppingmallordercancellationsController,
    ShoppingmallAdminShoppingmallorderrefundsController,
    ShoppingmallCustomerShoppingmallorderrefundsController,
    ShoppingmallAdminCouponsController,
    ShoppingmallAdminCouponsRedemptionsController,
    ShoppingmallCustomerCouponsRedemptionsController,
    ShoppingmallAdminShoppingmallcoinsController,
    ShoppingmallCustomerShoppingmallcoinsController,
    ShoppingmallAdminShoppingmallmileagetransactionsController,
    ShoppingmallAdminCustomerinquiriesController,
    ShoppingmallCustomerCustomerinquiriesController,
    ShoppingmallFaqsController,
    ShoppingmallCustomerFaqsController,
    ShoppingmallAdminFaqsController,
    ShoppingmallCustomerShoppingmallFavoriteproductsController,
    ShoppingmallCustomerShoppingmallFavoritesellersController,
    ShoppingmallCustomerShoppingmallarticlesController,
    ShoppingmallShoppingmallarticlesController,
    ShoppingmallShoppingmallarticlecategoriesController,
    ShoppingmallCustomerShoppingmallarticlecategoriesController,
    ShoppingmallSellerShoppingmallarticlecategoriesController,
    ShoppingmallAdminShoppingmallarticlecategoriesController,
    ShoppingmallShoppingmallarticlecategoriesCommentsController,
    ShoppingmallCustomerShoppingmallarticlecategoriesCommentsController,
    ShoppingmallAdminShoppingmallarticlecategoriesCommentsController,
  ],
})
export class MyModule {}
