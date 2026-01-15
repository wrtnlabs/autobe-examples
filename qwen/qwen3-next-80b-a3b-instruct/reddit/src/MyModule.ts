import { Module } from "@nestjs/common";

import { AuthGuestController } from "./controllers/auth/guest/AuthGuestController";
import { GuestController } from "./controllers/guest/GuestController";
import { AuthMemberController } from "./controllers/auth/member/AuthMemberController";
import { MyProfileController } from "./controllers/my/profile/MyProfileController";
import { AuthAdminController } from "./controllers/auth/admin/AuthAdminController";
import { CommunityplatformGuestsController } from "./controllers/communityPlatform/guests/CommunityplatformGuestsController";
import { CommunityplatformMemberMembersController } from "./controllers/communityPlatform/member/members/CommunityplatformMemberMembersController";
import { CommunityplatformAdminAdminsController } from "./controllers/communityPlatform/admin/admins/CommunityplatformAdminAdminsController";
import { CommunityplatformMemberChannelsController } from "./controllers/communityPlatform/member/channels/CommunityplatformMemberChannelsController";
import { CommunityplatformAdminChannelsController } from "./controllers/communityPlatform/admin/channels/CommunityplatformAdminChannelsController";
import { CommunityplatformChannelsController } from "./controllers/communityPlatform/channels/CommunityplatformChannelsController";
import { CommunityplatformSectionsController } from "./controllers/communityPlatform/sections/CommunityplatformSectionsController";
import { CommunityplatformMemberSectionsController } from "./controllers/communityPlatform/member/sections/CommunityplatformMemberSectionsController";
import { CommunityplatformAdminSectionsController } from "./controllers/communityPlatform/admin/sections/CommunityplatformAdminSectionsController";
import { CommunityplatformAdminConfigurationsController } from "./controllers/communityPlatform/admin/configurations/CommunityplatformAdminConfigurationsController";
import { CommunityplatformMemberConfigurationsController } from "./controllers/communityPlatform/member/configurations/CommunityplatformMemberConfigurationsController";
import { CommunityplatformAdminGuestsController } from "./controllers/communityPlatform/admin/guests/CommunityplatformAdminGuestsController";
import { CommunityplatformAdminMembersController } from "./controllers/communityPlatform/admin/members/CommunityplatformAdminMembersController";
import { CommunityplatformAdminGuestSessionsController } from "./controllers/communityPlatform/admin/guest/sessions/CommunityplatformAdminGuestSessionsController";
import { CommunityplatformGuestGuestSessionsController } from "./controllers/communityPlatform/guest/guest/sessions/CommunityplatformGuestGuestSessionsController";
import { CommunityplatformAdminMemberSessionsController } from "./controllers/communityPlatform/admin/member/sessions/CommunityplatformAdminMemberSessionsController";
import { CommunityplatformMemberMemberSessionsController } from "./controllers/communityPlatform/member/member/sessions/CommunityplatformMemberMemberSessionsController";
import { CommunityplatformAdminAdminSessionsController } from "./controllers/communityPlatform/admin/admin/sessions/CommunityplatformAdminAdminSessionsController";
import { CommunityplatformProductsController } from "./controllers/communityPlatform/products/CommunityplatformProductsController";
import { CommunityplatformMemberProductsController } from "./controllers/communityPlatform/member/products/CommunityplatformMemberProductsController";
import { CommunityplatformAdminProductsController } from "./controllers/communityPlatform/admin/products/CommunityplatformAdminProductsController";
import { CommunityplatformProductsVariantsController } from "./controllers/communityPlatform/products/variants/CommunityplatformProductsVariantsController";
import { CommunityplatformMemberProductsVariantsController } from "./controllers/communityPlatform/member/products/variants/CommunityplatformMemberProductsVariantsController";
import { CommunityplatformProductsImagesController } from "./controllers/communityPlatform/products/images/CommunityplatformProductsImagesController";
import { CommunityplatformMemberProductsImagesController } from "./controllers/communityPlatform/member/products/images/CommunityplatformMemberProductsImagesController";
import { CommunityplatformAdminProductsImagesController } from "./controllers/communityPlatform/admin/products/images/CommunityplatformAdminProductsImagesController";
import { CommunityplatformProductsSpecificationsController } from "./controllers/communityPlatform/products/specifications/CommunityplatformProductsSpecificationsController";
import { CommunityplatformMemberProductsSpecificationsController } from "./controllers/communityPlatform/member/products/specifications/CommunityplatformMemberProductsSpecificationsController";
import { CommunityplatformAdminProductsSpecificationsController } from "./controllers/communityPlatform/admin/products/specifications/CommunityplatformAdminProductsSpecificationsController";
import { CommunityplatformCategoriesController } from "./controllers/communityPlatform/categories/CommunityplatformCategoriesController";
import { CommunityplatformAdminCategoriesController } from "./controllers/communityPlatform/admin/categories/CommunityplatformAdminCategoriesController";
import { CommunityplatformMemberProductsReviewsController } from "./controllers/communityPlatform/member/products/reviews/CommunityplatformMemberProductsReviewsController";
import { CommunityplatformGuestProductsReviewsController } from "./controllers/communityPlatform/guest/products/reviews/CommunityplatformGuestProductsReviewsController";
import { CommunityplatformProductsReviewsController } from "./controllers/communityPlatform/products/reviews/CommunityplatformProductsReviewsController";
import { CommunityplatformAdminProductsReviewsController } from "./controllers/communityPlatform/admin/products/reviews/CommunityplatformAdminProductsReviewsController";
import { CommunityplatformProductsReviewsVotesController } from "./controllers/communityPlatform/products/reviews/votes/CommunityplatformProductsReviewsVotesController";
import { CommunityplatformMemberProductsReviewsVotesController } from "./controllers/communityPlatform/member/products/reviews/votes/CommunityplatformMemberProductsReviewsVotesController";
import { CommunityplatformAdminProductsReviewsVotesController } from "./controllers/communityPlatform/admin/products/reviews/votes/CommunityplatformAdminProductsReviewsVotesController";
import { CommunityplatformMemberProductsQuestionsController } from "./controllers/communityPlatform/member/products/questions/CommunityplatformMemberProductsQuestionsController";
import { CommunityplatformProductsQuestionsController } from "./controllers/communityPlatform/products/questions/CommunityplatformProductsQuestionsController";
import { CommunityplatformAdminProductsQuestionsController } from "./controllers/communityPlatform/admin/products/questions/CommunityplatformAdminProductsQuestionsController";
import { CommunityplatformProductsQuestionsAnswersController } from "./controllers/communityPlatform/products/questions/answers/CommunityplatformProductsQuestionsAnswersController";
import { CommunityplatformMemberProductsQuestionsAnswersController } from "./controllers/communityPlatform/member/products/questions/answers/CommunityplatformMemberProductsQuestionsAnswersController";
import { CommunityplatformProductsPricesController } from "./controllers/communityPlatform/products/prices/CommunityplatformProductsPricesController";
import { CommunityplatformMemberProductsPricesController } from "./controllers/communityPlatform/member/products/prices/CommunityplatformMemberProductsPricesController";
import { CommunityplatformAdminProductsPricesController } from "./controllers/communityPlatform/admin/products/prices/CommunityplatformAdminProductsPricesController";
import { CommunityplatformMemberProductsPricerulesController } from "./controllers/communityPlatform/member/products/pricerules/CommunityplatformMemberProductsPricerulesController";
import { CommunityplatformProductsPricerulesController } from "./controllers/communityPlatform/products/pricerules/CommunityplatformProductsPricerulesController";
import { CommunityplatformAdminProductsPricerulesController } from "./controllers/communityPlatform/admin/products/pricerules/CommunityplatformAdminProductsPricerulesController";
import { CommunityplatformPromotionsController } from "./controllers/communityPlatform/promotions/CommunityplatformPromotionsController";
import { CommunityplatformMemberPromotionsController } from "./controllers/communityPlatform/member/promotions/CommunityplatformMemberPromotionsController";
import { CommunityplatformAdminPromotionsController } from "./controllers/communityPlatform/admin/promotions/CommunityplatformAdminPromotionsController";
import { CommunityplatformSalesController } from "./controllers/communityPlatform/sales/CommunityplatformSalesController";
import { CommunityplatformMemberSalesController } from "./controllers/communityPlatform/member/sales/CommunityplatformMemberSalesController";
import { CommunityplatformAdminSalesController } from "./controllers/communityPlatform/admin/sales/CommunityplatformAdminSalesController";
import { CommunityplatformSalesItemsController } from "./controllers/communityPlatform/sales/items/CommunityplatformSalesItemsController";
import { CommunityplatformAdminSalesItemsController } from "./controllers/communityPlatform/admin/sales/items/CommunityplatformAdminSalesItemsController";
import { CommunityplatformMemberSalesItemsController } from "./controllers/communityPlatform/member/sales/items/CommunityplatformMemberSalesItemsController";
import { CommunityplatformMemberSalesSnapshotsController } from "./controllers/communityPlatform/member/sales/snapshots/CommunityplatformMemberSalesSnapshotsController";
import { CommunityplatformAdminSalesSnapshotsController } from "./controllers/communityPlatform/admin/sales/snapshots/CommunityplatformAdminSalesSnapshotsController";
import { CommunityplatformSalesSnapshotsController } from "./controllers/communityPlatform/sales/snapshots/CommunityplatformSalesSnapshotsController";
import { CommunityplatformMemberSalesShipmentsController } from "./controllers/communityPlatform/member/sales/shipments/CommunityplatformMemberSalesShipmentsController";
import { CommunityplatformSalesShipmentsController } from "./controllers/communityPlatform/sales/shipments/CommunityplatformSalesShipmentsController";
import { CommunityplatformAdminSalesShipmentsController } from "./controllers/communityPlatform/admin/sales/shipments/CommunityplatformAdminSalesShipmentsController";
import { CommunityplatformMemberSalesShipmentsTrackingsController } from "./controllers/communityPlatform/member/sales/shipments/trackings/CommunityplatformMemberSalesShipmentsTrackingsController";
import { CommunityplatformSalesShipmentsTrackingsController } from "./controllers/communityPlatform/sales/shipments/trackings/CommunityplatformSalesShipmentsTrackingsController";
import { CommunityplatformAdminSalesShipmentsTrackingsController } from "./controllers/communityPlatform/admin/sales/shipments/trackings/CommunityplatformAdminSalesShipmentsTrackingsController";
import { CommunityplatformMemberFavoritesController } from "./controllers/communityPlatform/member/favorites/CommunityplatformMemberFavoritesController";
import { CommunityplatformFavoritesController } from "./controllers/communityPlatform/favorites/CommunityplatformFavoritesController";
import { CommunityplatformSalestaxratesController } from "./controllers/communityPlatform/salestaxrates/CommunityplatformSalestaxratesController";
import { CommunityplatformAdminSalestaxratesController } from "./controllers/communityPlatform/admin/salestaxrates/CommunityplatformAdminSalestaxratesController";
import { CommunityplatformMemberSalestaxratesController } from "./controllers/communityPlatform/member/salestaxrates/CommunityplatformMemberSalestaxratesController";
import { CommunityplatformSalescurrencyratesController } from "./controllers/communityPlatform/salescurrencyrates/CommunityplatformSalescurrencyratesController";
import { CommunityplatformAdminSalescurrencyratesController } from "./controllers/communityPlatform/admin/salescurrencyrates/CommunityplatformAdminSalescurrencyratesController";
import { CommunityplatformSalesdiscountcodesController } from "./controllers/communityPlatform/salesdiscountcodes/CommunityplatformSalesdiscountcodesController";
import { CommunityplatformAdminSalesdiscountcodesController } from "./controllers/communityPlatform/admin/salesdiscountcodes/CommunityplatformAdminSalesdiscountcodesController";
import { CommunityplatformSalesdiscountusesController } from "./controllers/communityPlatform/salesdiscountuses/CommunityplatformSalesdiscountusesController";
import { CommunityplatformMemberSalesdiscountusesController } from "./controllers/communityPlatform/member/salesdiscountuses/CommunityplatformMemberSalesdiscountusesController";
import { CommunityplatformProductstocklevelsController } from "./controllers/communityPlatform/productstocklevels/CommunityplatformProductstocklevelsController";
import { CommunityplatformMemberProductstocklevelsController } from "./controllers/communityPlatform/member/productstocklevels/CommunityplatformMemberProductstocklevelsController";
import { CommunityplatformAdminProductstocklevelsController } from "./controllers/communityPlatform/admin/productstocklevels/CommunityplatformAdminProductstocklevelsController";
import { CommunityplatformMemberSalesordernotesController } from "./controllers/communityPlatform/member/salesordernotes/CommunityplatformMemberSalesordernotesController";
import { CommunityplatformAdminSalesordernotesController } from "./controllers/communityPlatform/admin/salesordernotes/CommunityplatformAdminSalesordernotesController";
import { CommunityplatformSalesrefundsController } from "./controllers/communityPlatform/salesrefunds/CommunityplatformSalesrefundsController";
import { CommunityplatformMemberSalesrefundsController } from "./controllers/communityPlatform/member/salesrefunds/CommunityplatformMemberSalesrefundsController";
import { CommunityplatformAdminSalesrefundsController } from "./controllers/communityPlatform/admin/salesrefunds/CommunityplatformAdminSalesrefundsController";
import { CommunityplatformProductwishlistsController } from "./controllers/communityPlatform/productwishlists/CommunityplatformProductwishlistsController";
import { CommunityplatformSaleviewstatsController } from "./controllers/communityPlatform/saleviewstats/CommunityplatformSaleviewstatsController";
import { CommunityplatformAdminSalesdiscountusesController } from "./controllers/communityPlatform/admin/salesdiscountuses/CommunityplatformAdminSalesdiscountusesController";
import { CommunityplatformMemberProductwishlistsController } from "./controllers/communityPlatform/member/productwishlists/CommunityplatformMemberProductwishlistsController";
import { CommunityplatformMemberCartsController } from "./controllers/communityPlatform/member/carts/CommunityplatformMemberCartsController";
import { CommunityplatformAdminCartsController } from "./controllers/communityPlatform/admin/carts/CommunityplatformAdminCartsController";
import { CommunityplatformCartsController } from "./controllers/communityPlatform/carts/CommunityplatformCartsController";
import { CommunityplatformCartsItemsController } from "./controllers/communityPlatform/carts/items/CommunityplatformCartsItemsController";
import { CommunityplatformMemberCartsItemsController } from "./controllers/communityPlatform/member/carts/items/CommunityplatformMemberCartsItemsController";
import { CommunityplatformAdminCartsItemsController } from "./controllers/communityPlatform/admin/carts/items/CommunityplatformAdminCartsItemsController";
import { CommunityplatformOrdersController } from "./controllers/communityPlatform/orders/CommunityplatformOrdersController";
import { CommunityplatformAdminOrdersController } from "./controllers/communityPlatform/admin/orders/CommunityplatformAdminOrdersController";
import { CommunityplatformMemberOrdersController } from "./controllers/communityPlatform/member/orders/CommunityplatformMemberOrdersController";
import { CommunityplatformMemberOrdersItemsController } from "./controllers/communityPlatform/member/orders/items/CommunityplatformMemberOrdersItemsController";
import { CommunityplatformAdminOrdersItemsController } from "./controllers/communityPlatform/admin/orders/items/CommunityplatformAdminOrdersItemsController";
import { CommunityplatformMemberOrdersPaymentsController } from "./controllers/communityPlatform/member/orders/payments/CommunityplatformMemberOrdersPaymentsController";
import { CommunityplatformAdminOrdersPaymentsController } from "./controllers/communityPlatform/admin/orders/payments/CommunityplatformAdminOrdersPaymentsController";
import { CommunityplatformOrdersShipmentsController } from "./controllers/communityPlatform/orders/shipments/CommunityplatformOrdersShipmentsController";
import { CommunityplatformMemberOrdersShipmentsController } from "./controllers/communityPlatform/member/orders/shipments/CommunityplatformMemberOrdersShipmentsController";
import { CommunityplatformAdminOrdersShipmentsController } from "./controllers/communityPlatform/admin/orders/shipments/CommunityplatformAdminOrdersShipmentsController";
import { CommunityplatformOrdersStatus_logsController } from "./controllers/communityPlatform/orders/status-logs/CommunityplatformOrdersStatus_logsController";
import { CommunityplatformAdminOrdersStatus_logsController } from "./controllers/communityPlatform/admin/orders/status-logs/CommunityplatformAdminOrdersStatus_logsController";
import { CommunityplatformMemberOrdersStatus_logsController } from "./controllers/communityPlatform/member/orders/status-logs/CommunityplatformMemberOrdersStatus_logsController";
import { CommunityplatformMemberOrdersReturnsController } from "./controllers/communityPlatform/member/orders/returns/CommunityplatformMemberOrdersReturnsController";
import { CommunityplatformOrdersReturnsController } from "./controllers/communityPlatform/orders/returns/CommunityplatformOrdersReturnsController";
import { CommunityplatformAdminOrdersReturnsController } from "./controllers/communityPlatform/admin/orders/returns/CommunityplatformAdminOrdersReturnsController";
import { CommunityplatformOrdersPromotionsController } from "./controllers/communityPlatform/orders/promotions/CommunityplatformOrdersPromotionsController";
import { CommunityplatformAdminOrdersPromotionsController } from "./controllers/communityPlatform/admin/orders/promotions/CommunityplatformAdminOrdersPromotionsController";
import { CommunityplatformMemberOrdersPromotionsController } from "./controllers/communityPlatform/member/orders/promotions/CommunityplatformMemberOrdersPromotionsController";
import { CommunityplatformMemberOrdersTax_calculationsController } from "./controllers/communityPlatform/member/orders/tax-calculations/CommunityplatformMemberOrdersTax_calculationsController";
import { CommunityplatformOrdersTax_calculationsController } from "./controllers/communityPlatform/orders/tax-calculations/CommunityplatformOrdersTax_calculationsController";
import { CommunityplatformAdminOrdersTax_calculationsController } from "./controllers/communityPlatform/admin/orders/tax-calculations/CommunityplatformAdminOrdersTax_calculationsController";
import { CommunityplatformOrdersNotesController } from "./controllers/communityPlatform/orders/notes/CommunityplatformOrdersNotesController";
import { CommunityplatformMemberOrdersNotesController } from "./controllers/communityPlatform/member/orders/notes/CommunityplatformMemberOrdersNotesController";
import { CommunityplatformAdminOrdersNotesController } from "./controllers/communityPlatform/admin/orders/notes/CommunityplatformAdminOrdersNotesController";
import { CommunityplatformMemberOrdersRefundsController } from "./controllers/communityPlatform/member/orders/refunds/CommunityplatformMemberOrdersRefundsController";
import { CommunityplatformAdminOrdersRefundsController } from "./controllers/communityPlatform/admin/orders/refunds/CommunityplatformAdminOrdersRefundsController";
import { CommunityplatformMemberOrdersCancellationsController } from "./controllers/communityPlatform/member/orders/cancellations/CommunityplatformMemberOrdersCancellationsController";
import { CommunityplatformAdminOrdersCancellationsController } from "./controllers/communityPlatform/admin/orders/cancellations/CommunityplatformAdminOrdersCancellationsController";
import { CommunityplatformShipmentsController } from "./controllers/communityPlatform/shipments/CommunityplatformShipmentsController";
import { CommunityplatformMemberShipmentsController } from "./controllers/communityPlatform/member/shipments/CommunityplatformMemberShipmentsController";
import { CommunityplatformMemberShipmentsAddressesController } from "./controllers/communityPlatform/member/shipments/addresses/CommunityplatformMemberShipmentsAddressesController";
import { CommunityplatformAdminShipmentsAddressesController } from "./controllers/communityPlatform/admin/shipments/addresses/CommunityplatformAdminShipmentsAddressesController";
import { CommunityplatformShipmentsAddressesController } from "./controllers/communityPlatform/shipments/addresses/CommunityplatformShipmentsAddressesController";
import { CommunityplatformDelivery_statusesController } from "./controllers/communityPlatform/delivery-statuses/CommunityplatformDelivery_statusesController";
import { CommunityplatformCarriersController } from "./controllers/communityPlatform/carriers/CommunityplatformCarriersController";
import { CommunityplatformShipmentsCostsController } from "./controllers/communityPlatform/shipments/costs/CommunityplatformShipmentsCostsController";
import { CommunityplatformMemberShipmentsCostsController } from "./controllers/communityPlatform/member/shipments/costs/CommunityplatformMemberShipmentsCostsController";
import { CommunityplatformAdminShipmentsCostsController } from "./controllers/communityPlatform/admin/shipments/costs/CommunityplatformAdminShipmentsCostsController";
import { CommunityplatformDelivery_windowsController } from "./controllers/communityPlatform/delivery-windows/CommunityplatformDelivery_windowsController";
import { CommunityplatformMemberDelivery_windowsController } from "./controllers/communityPlatform/member/delivery-windows/CommunityplatformMemberDelivery_windowsController";
import { CommunityplatformAdminDelivery_windowsController } from "./controllers/communityPlatform/admin/delivery-windows/CommunityplatformAdminDelivery_windowsController";
import { CommunityplatformMemberShipmentsNotesController } from "./controllers/communityPlatform/member/shipments/notes/CommunityplatformMemberShipmentsNotesController";
import { CommunityplatformAdminShipmentsNotesController } from "./controllers/communityPlatform/admin/shipments/notes/CommunityplatformAdminShipmentsNotesController";
import { CommunityplatformShipmentsNotesController } from "./controllers/communityPlatform/shipments/notes/CommunityplatformShipmentsNotesController";
import { CommunityplatformShipmentsPackagesController } from "./controllers/communityPlatform/shipments/packages/CommunityplatformShipmentsPackagesController";
import { CommunityplatformMemberShipmentsPackagesController } from "./controllers/communityPlatform/member/shipments/packages/CommunityplatformMemberShipmentsPackagesController";
import { CommunityplatformShipmentsTrackingsController } from "./controllers/communityPlatform/shipments/trackings/CommunityplatformShipmentsTrackingsController";
import { CommunityplatformMemberShipmentsTrackingsController } from "./controllers/communityPlatform/member/shipments/trackings/CommunityplatformMemberShipmentsTrackingsController";
import { CommunityplatformAdminShipmentsTrackingsController } from "./controllers/communityPlatform/admin/shipments/trackings/CommunityplatformAdminShipmentsTrackingsController";
import { CommunityplatformMemberShipmentsInsurancesController } from "./controllers/communityPlatform/member/shipments/insurances/CommunityplatformMemberShipmentsInsurancesController";
import { CommunityplatformAdminShipmentsInsurancesController } from "./controllers/communityPlatform/admin/shipments/insurances/CommunityplatformAdminShipmentsInsurancesController";
import { CommunityplatformShipmentsInsurancesController } from "./controllers/communityPlatform/shipments/insurances/CommunityplatformShipmentsInsurancesController";
import { CommunityplatformMemberShipmentsReturn_authorizationsController } from "./controllers/communityPlatform/member/shipments/return-authorizations/CommunityplatformMemberShipmentsReturn_authorizationsController";
import { CommunityplatformAdminShipmentsReturn_authorizationsController } from "./controllers/communityPlatform/admin/shipments/return-authorizations/CommunityplatformAdminShipmentsReturn_authorizationsController";
import { CommunityplatformShipmentsReturn_authorizationsController } from "./controllers/communityPlatform/shipments/return-authorizations/CommunityplatformShipmentsReturn_authorizationsController";
import { CommunityplatformMemberInventory_movementsController } from "./controllers/communityPlatform/member/inventory-movements/CommunityplatformMemberInventory_movementsController";
import { CommunityplatformWarehousesController } from "./controllers/communityPlatform/warehouses/CommunityplatformWarehousesController";
import { CommunityplatformAdminInventory_adjustmentsController } from "./controllers/communityPlatform/admin/inventory-adjustments/CommunityplatformAdminInventory_adjustmentsController";
import { CommunityplatformAdminInventory_alertsController } from "./controllers/communityPlatform/admin/inventory-alerts/CommunityplatformAdminInventory_alertsController";
import { CommunityplatformAdminInventory_batchesController } from "./controllers/communityPlatform/admin/inventory-batches/CommunityplatformAdminInventory_batchesController";
import { CommunityplatformAdminInventory_suppliersController } from "./controllers/communityPlatform/admin/inventory-suppliers/CommunityplatformAdminInventory_suppliersController";
import { CommunityplatformMemberInventory_procurement_ordersController } from "./controllers/communityPlatform/member/inventory-procurement-orders/CommunityplatformMemberInventory_procurement_ordersController";
import { CommunityplatformAdminInventory_reorder_settingsController } from "./controllers/communityPlatform/admin/inventory-reorder-settings/CommunityplatformAdminInventory_reorder_settingsController";
import { CommunityplatformAdminInventory_lifecycleController } from "./controllers/communityPlatform/admin/inventory-lifecycle/CommunityplatformAdminInventory_lifecycleController";
import { CommunityplatformInventory_movementsController } from "./controllers/communityPlatform/inventory-movements/CommunityplatformInventory_movementsController";
import { CommunityplatformAdminWarehousesController } from "./controllers/communityPlatform/admin/warehouses/CommunityplatformAdminWarehousesController";
import { CommunityplatformInventory_adjustmentsController } from "./controllers/communityPlatform/inventory-adjustments/CommunityplatformInventory_adjustmentsController";
import { CommunityplatformInventory_batchesController } from "./controllers/communityPlatform/inventory-batches/CommunityplatformInventory_batchesController";
import { CommunityplatformMemberInventory_suppliersController } from "./controllers/communityPlatform/member/inventory-suppliers/CommunityplatformMemberInventory_suppliersController";
import { CommunityplatformAdminInventory_procurement_ordersController } from "./controllers/communityPlatform/admin/inventory-procurement-orders/CommunityplatformAdminInventory_procurement_ordersController";
import { CommunityplatformInventory_lifecycle_eventsController } from "./controllers/communityPlatform/inventory-lifecycle-events/CommunityplatformInventory_lifecycle_eventsController";
import { CommunityplatformInventory_itemsController } from "./controllers/communityPlatform/inventory-items/CommunityplatformInventory_itemsController";
import { CommunityplatformMemberInventory_itemsController } from "./controllers/communityPlatform/member/inventory-items/CommunityplatformMemberInventory_itemsController";
import { CommunityplatformAdminInventory_itemsController } from "./controllers/communityPlatform/admin/inventory-items/CommunityplatformAdminInventory_itemsController";
import { CommunityplatformAdminInventory_movementsController } from "./controllers/communityPlatform/admin/inventory-movements/CommunityplatformAdminInventory_movementsController";
import { CommunityplatformMemberWarehousesController } from "./controllers/communityPlatform/member/warehouses/CommunityplatformMemberWarehousesController";
import { CommunityplatformMemberInventory_adjustmentsController } from "./controllers/communityPlatform/member/inventory-adjustments/CommunityplatformMemberInventory_adjustmentsController";
import { CommunityplatformMemberInventory_alertsController } from "./controllers/communityPlatform/member/inventory-alerts/CommunityplatformMemberInventory_alertsController";
import { CommunityplatformInventory_suppliersController } from "./controllers/communityPlatform/inventory-suppliers/CommunityplatformInventory_suppliersController";
import { CommunityplatformInventory_procurement_ordersController } from "./controllers/communityPlatform/inventory-procurement-orders/CommunityplatformInventory_procurement_ordersController";
import { CommunityplatformInventory_lifecycleController } from "./controllers/communityPlatform/inventory-lifecycle/CommunityplatformInventory_lifecycleController";
import { CommunityplatformMemberInventory_lifecycleController } from "./controllers/communityPlatform/member/inventory-lifecycle/CommunityplatformMemberInventory_lifecycleController";
import { CommunityplatformAdminNotification_templatesController } from "./controllers/communityPlatform/admin/notification-templates/CommunityplatformAdminNotification_templatesController";
import { CommunityplatformNotification_templatesController } from "./controllers/communityPlatform/notification-templates/CommunityplatformNotification_templatesController";
import { CommunityplatformMemberNotification_preferencesController } from "./controllers/communityPlatform/member/notification-preferences/CommunityplatformMemberNotification_preferencesController";
import { CommunityplatformMemberNotification_eventsController } from "./controllers/communityPlatform/member/notification-events/CommunityplatformMemberNotification_eventsController";
import { CommunityplatformAdminNotification_eventsController } from "./controllers/communityPlatform/admin/notification-events/CommunityplatformAdminNotification_eventsController";
import { CommunityplatformAdminSystem_alertsController } from "./controllers/communityPlatform/admin/system-alerts/CommunityplatformAdminSystem_alertsController";
import { CommunityplatformSystem_alertsController } from "./controllers/communityPlatform/system-alerts/CommunityplatformSystem_alertsController";
import { CommunityplatformMemberNotification_subscriptionsController } from "./controllers/communityPlatform/member/notification-subscriptions/CommunityplatformMemberNotification_subscriptionsController";
import { CommunityplatformAdminNotification_subscriptionsController } from "./controllers/communityPlatform/admin/notification-subscriptions/CommunityplatformAdminNotification_subscriptionsController";
import { CommunityplatformMemberEmail_notification_queueController } from "./controllers/communityPlatform/member/email-notification-queue/CommunityplatformMemberEmail_notification_queueController";
import { CommunityplatformAdminEmail_notification_queueController } from "./controllers/communityPlatform/admin/email-notification-queue/CommunityplatformAdminEmail_notification_queueController";
import { CommunityplatformEmail_notification_queueController } from "./controllers/communityPlatform/email-notification-queue/CommunityplatformEmail_notification_queueController";
import { CommunityplatformAdminFailed_notificationsController } from "./controllers/communityPlatform/admin/failed-notifications/CommunityplatformAdminFailed_notificationsController";
import { CommunityplatformFailed_notificationsController } from "./controllers/communityPlatform/failed-notifications/CommunityplatformFailed_notificationsController";
import { CommunityplatformMemberNotification_read_statusController } from "./controllers/communityPlatform/member/notification-read-status/CommunityplatformMemberNotification_read_statusController";
import { CommunityplatformAdminNotification_retention_policiesController } from "./controllers/communityPlatform/admin/notification-retention-policies/CommunityplatformAdminNotification_retention_policiesController";
import { CommunityplatformNotification_retention_policiesController } from "./controllers/communityPlatform/notification-retention-policies/CommunityplatformNotification_retention_policiesController";
import { CommunityplatformMemberNotification_optoutsController } from "./controllers/communityPlatform/member/notification-optouts/CommunityplatformMemberNotification_optoutsController";
import { CommunityplatformAdminNotification_optoutsController } from "./controllers/communityPlatform/admin/notification-optouts/CommunityplatformAdminNotification_optoutsController";
import { CommunityplatformGuestNotification_annotationsController } from "./controllers/communityPlatform/guest/notification-annotations/CommunityplatformGuestNotification_annotationsController";
import { CommunityplatformNotification_annotationsController } from "./controllers/communityPlatform/notification-annotations/CommunityplatformNotification_annotationsController";
import { CommunityplatformAdminNotification_annotationsController } from "./controllers/communityPlatform/admin/notification-annotations/CommunityplatformAdminNotification_annotationsController";
import { CommunityplatformMemberNotification_templatesController } from "./controllers/communityPlatform/member/notification-templates/CommunityplatformMemberNotification_templatesController";
import { CommunityplatformNotification_eventsController } from "./controllers/communityPlatform/notification-events/CommunityplatformNotification_eventsController";
import { CommunityplatformNotification_optoutsController } from "./controllers/communityPlatform/notification-optouts/CommunityplatformNotification_optoutsController";
import { CommunityplatformMemberReportsController } from "./controllers/communityPlatform/member/reports/CommunityplatformMemberReportsController";
import { CommunityplatformAdminReportsController } from "./controllers/communityPlatform/admin/reports/CommunityplatformAdminReportsController";
import { CommunityplatformAdminModerationActionsController } from "./controllers/communityPlatform/admin/moderation/actions/CommunityplatformAdminModerationActionsController";
import { CommunityplatformMemberReportDisputesController } from "./controllers/communityPlatform/member/report/disputes/CommunityplatformMemberReportDisputesController";
import { CommunityplatformAdminFlagsController } from "./controllers/communityPlatform/admin/flags/CommunityplatformAdminFlagsController";
import { CommunityplatformFlagsController } from "./controllers/communityPlatform/flags/CommunityplatformFlagsController";
import { CommunityplatformAdminReportTrackingController } from "./controllers/communityPlatform/admin/report/tracking/CommunityplatformAdminReportTrackingController";
import { CommunityplatformMemberReportTrackingController } from "./controllers/communityPlatform/member/report/tracking/CommunityplatformMemberReportTrackingController";
import { CommunityplatformReportOfGuestsController } from "./controllers/communityPlatform/report/of/guests/CommunityplatformReportOfGuestsController";
import { CommunityplatformMemberReportOfMembersController } from "./controllers/communityPlatform/member/report/of/members/CommunityplatformMemberReportOfMembersController";
import { CommunityplatformAdminReportOfAdminsController } from "./controllers/communityPlatform/admin/report/of/admins/CommunityplatformAdminReportOfAdminsController";
import { CommunityplatformAdminModerationLogsController } from "./controllers/communityPlatform/admin/moderation/logs/CommunityplatformAdminModerationLogsController";
import { CommunityplatformAdminReportDisputesController } from "./controllers/communityPlatform/admin/report/disputes/CommunityplatformAdminReportDisputesController";
import { CommunityplatformGuestReportOfGuestsController } from "./controllers/communityPlatform/guest/report/of/guests/CommunityplatformGuestReportOfGuestsController";
import { CommunityplatformAdminReportOfGuestsController } from "./controllers/communityPlatform/admin/report/of/guests/CommunityplatformAdminReportOfGuestsController";
import { CommunityplatformReportOfMembersController } from "./controllers/communityPlatform/report/of/members/CommunityplatformReportOfMembersController";
import { CommunityplatformAdminReportOfMembersController } from "./controllers/communityPlatform/admin/report/of/members/CommunityplatformAdminReportOfMembersController";
import { CommunityplatformAdminDashboardsSystemOverviewController } from "./controllers/communityPlatform/admin/dashboards/system/overview/CommunityplatformAdminDashboardsSystemOverviewController";
import { CommunityplatformMemberAnalyticsUsersActivityController } from "./controllers/communityPlatform/member/analytics/users/activity/CommunityplatformMemberAnalyticsUsersActivityController";
import { CommunityplatformAdminReportsConfigurationsAuditController } from "./controllers/communityPlatform/admin/reports/configurations/audit/CommunityplatformAdminReportsConfigurationsAuditController";
import { CommunityplatformAdminAnalyticsModerationMetricsController } from "./controllers/communityPlatform/admin/analytics/moderation/metrics/CommunityplatformAdminAnalyticsModerationMetricsController";
import { CommunityplatformMemberAnalyticsSalesDashboardController } from "./controllers/communityPlatform/member/analytics/sales/dashboard/CommunityplatformMemberAnalyticsSalesDashboardController";
import { CommunityplatformAdminAnalyticsSalesDashboardController } from "./controllers/communityPlatform/admin/analytics/sales/dashboard/CommunityplatformAdminAnalyticsSalesDashboardController";
import { CommunityplatformAdminAnalyticsInventoryStatusController } from "./controllers/communityPlatform/admin/analytics/inventory/status/CommunityplatformAdminAnalyticsInventoryStatusController";
import { CommunityplatformSearchProductsController } from "./controllers/communityPlatform/search/products/CommunityplatformSearchProductsController";
import { CommunityplatformAdminDashboardAdminCartsAnalyticsController } from "./controllers/communityPlatform/admin/dashboard/admin/carts/analytics/CommunityplatformAdminDashboardAdminCartsAnalyticsController";
import { CommunityplatformAnalyticsShipmentsStatusController } from "./controllers/communityPlatform/analytics/shipments/status/CommunityplatformAnalyticsShipmentsStatusController";
import { CommunityplatformAdminAnalyticsShipmentsDelivery_forecastController } from "./controllers/communityPlatform/admin/analytics/shipments/delivery-forecast/CommunityplatformAdminAnalyticsShipmentsDelivery_forecastController";
import { CommunityplatformAnalyticsShipmentsCost_breakdownController } from "./controllers/communityPlatform/analytics/shipments/cost-breakdown/CommunityplatformAnalyticsShipmentsCost_breakdownController";
import { CommunityplatformAdminAnalyticsShipmentsReturn_trendsController } from "./controllers/communityPlatform/admin/analytics/shipments/return-trends/CommunityplatformAdminAnalyticsShipmentsReturn_trendsController";
import { CommunityplatformMemberSearchShipmentsController } from "./controllers/communityPlatform/member/search/shipments/CommunityplatformMemberSearchShipmentsController";
import { CommunityplatformAdminSearchShipmentsController } from "./controllers/communityPlatform/admin/search/shipments/CommunityplatformAdminSearchShipmentsController";
import { CommunityplatformAdminDashboardLogisticsOverviewController } from "./controllers/communityPlatform/admin/dashboard/logistics/overview/CommunityplatformAdminDashboardLogisticsOverviewController";
import { CommunityplatformMemberShipmentsCompleteController } from "./controllers/communityPlatform/member/shipments/complete/CommunityplatformMemberShipmentsCompleteController";
import { CommunityplatformMemberInventoryMovementsTrendsController } from "./controllers/communityPlatform/member/inventory/movements/trends/CommunityplatformMemberInventoryMovementsTrendsController";
import { CommunityplatformAdminInventoryMovementsTrendsController } from "./controllers/communityPlatform/admin/inventory/movements/trends/CommunityplatformAdminInventoryMovementsTrendsController";
import { CommunityplatformInventoryStocksOverviewController } from "./controllers/communityPlatform/inventory/stocks/overview/CommunityplatformInventoryStocksOverviewController";
import { CommunityplatformAdminInventoryReordersTriggersController } from "./controllers/communityPlatform/admin/inventory/reorders/triggers/CommunityplatformAdminInventoryReordersTriggersController";
import { CommunityplatformMemberInventorySuppliersPerformanceController } from "./controllers/communityPlatform/member/inventory/suppliers/performance/CommunityplatformMemberInventorySuppliersPerformanceController";
import { CommunityplatformInventoryLifecyclesDistributionController } from "./controllers/communityPlatform/inventory/lifecycles/distribution/CommunityplatformInventoryLifecyclesDistributionController";
import { CommunityplatformInventoryTurnoversRatioController } from "./controllers/communityPlatform/inventory/turnovers/ratio/CommunityplatformInventoryTurnoversRatioController";
import { CommunityplatformInventoryAdjustmentsAnomaliesController } from "./controllers/communityPlatform/inventory/adjustments/anomalies/CommunityplatformInventoryAdjustmentsAnomaliesController";
import { CommunityplatformAdminInventoryDemandsForecastController } from "./controllers/communityPlatform/admin/inventory/demands/forecast/CommunityplatformAdminInventoryDemandsForecastController";
import { CommunityplatformAdminReportsAdminReviewsController } from "./controllers/communityPlatform/admin/reports/admin/reviews/CommunityplatformAdminReportsAdminReviewsController";
import { CommunityplatformReportsSystemFlagsController } from "./controllers/communityPlatform/reports/system/flags/CommunityplatformReportsSystemFlagsController";
import { CommunityplatformAdminModerationsActionsController } from "./controllers/communityPlatform/admin/moderations/actions/CommunityplatformAdminModerationsActionsController";
import { CommunityplatformReportsTrackingAnalyticsController } from "./controllers/communityPlatform/reports/tracking/analytics/CommunityplatformReportsTrackingAnalyticsController";
import { CommunityplatformMemberReportsDisputesController } from "./controllers/communityPlatform/member/reports/disputes/CommunityplatformMemberReportsDisputesController";
import { CommunityplatformAdminReportsDisputesController } from "./controllers/communityPlatform/admin/reports/disputes/CommunityplatformAdminReportsDisputesController";

@Module({
  controllers: [
    AuthGuestController,
    GuestController,
    AuthMemberController,
    MyProfileController,
    AuthAdminController,
    CommunityplatformGuestsController,
    CommunityplatformMemberMembersController,
    CommunityplatformAdminAdminsController,
    CommunityplatformMemberChannelsController,
    CommunityplatformAdminChannelsController,
    CommunityplatformChannelsController,
    CommunityplatformSectionsController,
    CommunityplatformMemberSectionsController,
    CommunityplatformAdminSectionsController,
    CommunityplatformAdminConfigurationsController,
    CommunityplatformMemberConfigurationsController,
    CommunityplatformAdminGuestsController,
    CommunityplatformAdminMembersController,
    CommunityplatformAdminGuestSessionsController,
    CommunityplatformGuestGuestSessionsController,
    CommunityplatformAdminMemberSessionsController,
    CommunityplatformMemberMemberSessionsController,
    CommunityplatformAdminAdminSessionsController,
    CommunityplatformProductsController,
    CommunityplatformMemberProductsController,
    CommunityplatformAdminProductsController,
    CommunityplatformProductsVariantsController,
    CommunityplatformMemberProductsVariantsController,
    CommunityplatformProductsImagesController,
    CommunityplatformMemberProductsImagesController,
    CommunityplatformAdminProductsImagesController,
    CommunityplatformProductsSpecificationsController,
    CommunityplatformMemberProductsSpecificationsController,
    CommunityplatformAdminProductsSpecificationsController,
    CommunityplatformCategoriesController,
    CommunityplatformAdminCategoriesController,
    CommunityplatformMemberProductsReviewsController,
    CommunityplatformGuestProductsReviewsController,
    CommunityplatformProductsReviewsController,
    CommunityplatformAdminProductsReviewsController,
    CommunityplatformProductsReviewsVotesController,
    CommunityplatformMemberProductsReviewsVotesController,
    CommunityplatformAdminProductsReviewsVotesController,
    CommunityplatformMemberProductsQuestionsController,
    CommunityplatformProductsQuestionsController,
    CommunityplatformAdminProductsQuestionsController,
    CommunityplatformProductsQuestionsAnswersController,
    CommunityplatformMemberProductsQuestionsAnswersController,
    CommunityplatformProductsPricesController,
    CommunityplatformMemberProductsPricesController,
    CommunityplatformAdminProductsPricesController,
    CommunityplatformMemberProductsPricerulesController,
    CommunityplatformProductsPricerulesController,
    CommunityplatformAdminProductsPricerulesController,
    CommunityplatformPromotionsController,
    CommunityplatformMemberPromotionsController,
    CommunityplatformAdminPromotionsController,
    CommunityplatformSalesController,
    CommunityplatformMemberSalesController,
    CommunityplatformAdminSalesController,
    CommunityplatformSalesItemsController,
    CommunityplatformAdminSalesItemsController,
    CommunityplatformMemberSalesItemsController,
    CommunityplatformMemberSalesSnapshotsController,
    CommunityplatformAdminSalesSnapshotsController,
    CommunityplatformSalesSnapshotsController,
    CommunityplatformMemberSalesShipmentsController,
    CommunityplatformSalesShipmentsController,
    CommunityplatformAdminSalesShipmentsController,
    CommunityplatformMemberSalesShipmentsTrackingsController,
    CommunityplatformSalesShipmentsTrackingsController,
    CommunityplatformAdminSalesShipmentsTrackingsController,
    CommunityplatformMemberFavoritesController,
    CommunityplatformFavoritesController,
    CommunityplatformSalestaxratesController,
    CommunityplatformAdminSalestaxratesController,
    CommunityplatformMemberSalestaxratesController,
    CommunityplatformSalescurrencyratesController,
    CommunityplatformAdminSalescurrencyratesController,
    CommunityplatformSalesdiscountcodesController,
    CommunityplatformAdminSalesdiscountcodesController,
    CommunityplatformSalesdiscountusesController,
    CommunityplatformMemberSalesdiscountusesController,
    CommunityplatformProductstocklevelsController,
    CommunityplatformMemberProductstocklevelsController,
    CommunityplatformAdminProductstocklevelsController,
    CommunityplatformMemberSalesordernotesController,
    CommunityplatformAdminSalesordernotesController,
    CommunityplatformSalesrefundsController,
    CommunityplatformMemberSalesrefundsController,
    CommunityplatformAdminSalesrefundsController,
    CommunityplatformProductwishlistsController,
    CommunityplatformSaleviewstatsController,
    CommunityplatformAdminSalesdiscountusesController,
    CommunityplatformMemberProductwishlistsController,
    CommunityplatformMemberCartsController,
    CommunityplatformAdminCartsController,
    CommunityplatformCartsController,
    CommunityplatformCartsItemsController,
    CommunityplatformMemberCartsItemsController,
    CommunityplatformAdminCartsItemsController,
    CommunityplatformOrdersController,
    CommunityplatformAdminOrdersController,
    CommunityplatformMemberOrdersController,
    CommunityplatformMemberOrdersItemsController,
    CommunityplatformAdminOrdersItemsController,
    CommunityplatformMemberOrdersPaymentsController,
    CommunityplatformAdminOrdersPaymentsController,
    CommunityplatformOrdersShipmentsController,
    CommunityplatformMemberOrdersShipmentsController,
    CommunityplatformAdminOrdersShipmentsController,
    CommunityplatformOrdersStatus_logsController,
    CommunityplatformAdminOrdersStatus_logsController,
    CommunityplatformMemberOrdersStatus_logsController,
    CommunityplatformMemberOrdersReturnsController,
    CommunityplatformOrdersReturnsController,
    CommunityplatformAdminOrdersReturnsController,
    CommunityplatformOrdersPromotionsController,
    CommunityplatformAdminOrdersPromotionsController,
    CommunityplatformMemberOrdersPromotionsController,
    CommunityplatformMemberOrdersTax_calculationsController,
    CommunityplatformOrdersTax_calculationsController,
    CommunityplatformAdminOrdersTax_calculationsController,
    CommunityplatformOrdersNotesController,
    CommunityplatformMemberOrdersNotesController,
    CommunityplatformAdminOrdersNotesController,
    CommunityplatformMemberOrdersRefundsController,
    CommunityplatformAdminOrdersRefundsController,
    CommunityplatformMemberOrdersCancellationsController,
    CommunityplatformAdminOrdersCancellationsController,
    CommunityplatformShipmentsController,
    CommunityplatformMemberShipmentsController,
    CommunityplatformMemberShipmentsAddressesController,
    CommunityplatformAdminShipmentsAddressesController,
    CommunityplatformShipmentsAddressesController,
    CommunityplatformDelivery_statusesController,
    CommunityplatformCarriersController,
    CommunityplatformShipmentsCostsController,
    CommunityplatformMemberShipmentsCostsController,
    CommunityplatformAdminShipmentsCostsController,
    CommunityplatformDelivery_windowsController,
    CommunityplatformMemberDelivery_windowsController,
    CommunityplatformAdminDelivery_windowsController,
    CommunityplatformMemberShipmentsNotesController,
    CommunityplatformAdminShipmentsNotesController,
    CommunityplatformShipmentsNotesController,
    CommunityplatformShipmentsPackagesController,
    CommunityplatformMemberShipmentsPackagesController,
    CommunityplatformShipmentsTrackingsController,
    CommunityplatformMemberShipmentsTrackingsController,
    CommunityplatformAdminShipmentsTrackingsController,
    CommunityplatformMemberShipmentsInsurancesController,
    CommunityplatformAdminShipmentsInsurancesController,
    CommunityplatformShipmentsInsurancesController,
    CommunityplatformMemberShipmentsReturn_authorizationsController,
    CommunityplatformAdminShipmentsReturn_authorizationsController,
    CommunityplatformShipmentsReturn_authorizationsController,
    CommunityplatformMemberInventory_movementsController,
    CommunityplatformWarehousesController,
    CommunityplatformAdminInventory_adjustmentsController,
    CommunityplatformAdminInventory_alertsController,
    CommunityplatformAdminInventory_batchesController,
    CommunityplatformAdminInventory_suppliersController,
    CommunityplatformMemberInventory_procurement_ordersController,
    CommunityplatformAdminInventory_reorder_settingsController,
    CommunityplatformAdminInventory_lifecycleController,
    CommunityplatformInventory_movementsController,
    CommunityplatformAdminWarehousesController,
    CommunityplatformInventory_adjustmentsController,
    CommunityplatformInventory_batchesController,
    CommunityplatformMemberInventory_suppliersController,
    CommunityplatformAdminInventory_procurement_ordersController,
    CommunityplatformInventory_lifecycle_eventsController,
    CommunityplatformInventory_itemsController,
    CommunityplatformMemberInventory_itemsController,
    CommunityplatformAdminInventory_itemsController,
    CommunityplatformAdminInventory_movementsController,
    CommunityplatformMemberWarehousesController,
    CommunityplatformMemberInventory_adjustmentsController,
    CommunityplatformMemberInventory_alertsController,
    CommunityplatformInventory_suppliersController,
    CommunityplatformInventory_procurement_ordersController,
    CommunityplatformInventory_lifecycleController,
    CommunityplatformMemberInventory_lifecycleController,
    CommunityplatformAdminNotification_templatesController,
    CommunityplatformNotification_templatesController,
    CommunityplatformMemberNotification_preferencesController,
    CommunityplatformMemberNotification_eventsController,
    CommunityplatformAdminNotification_eventsController,
    CommunityplatformAdminSystem_alertsController,
    CommunityplatformSystem_alertsController,
    CommunityplatformMemberNotification_subscriptionsController,
    CommunityplatformAdminNotification_subscriptionsController,
    CommunityplatformMemberEmail_notification_queueController,
    CommunityplatformAdminEmail_notification_queueController,
    CommunityplatformEmail_notification_queueController,
    CommunityplatformAdminFailed_notificationsController,
    CommunityplatformFailed_notificationsController,
    CommunityplatformMemberNotification_read_statusController,
    CommunityplatformAdminNotification_retention_policiesController,
    CommunityplatformNotification_retention_policiesController,
    CommunityplatformMemberNotification_optoutsController,
    CommunityplatformAdminNotification_optoutsController,
    CommunityplatformGuestNotification_annotationsController,
    CommunityplatformNotification_annotationsController,
    CommunityplatformAdminNotification_annotationsController,
    CommunityplatformMemberNotification_templatesController,
    CommunityplatformNotification_eventsController,
    CommunityplatformNotification_optoutsController,
    CommunityplatformMemberReportsController,
    CommunityplatformAdminReportsController,
    CommunityplatformAdminModerationActionsController,
    CommunityplatformMemberReportDisputesController,
    CommunityplatformAdminFlagsController,
    CommunityplatformFlagsController,
    CommunityplatformAdminReportTrackingController,
    CommunityplatformMemberReportTrackingController,
    CommunityplatformReportOfGuestsController,
    CommunityplatformMemberReportOfMembersController,
    CommunityplatformAdminReportOfAdminsController,
    CommunityplatformAdminModerationLogsController,
    CommunityplatformAdminReportDisputesController,
    CommunityplatformGuestReportOfGuestsController,
    CommunityplatformAdminReportOfGuestsController,
    CommunityplatformReportOfMembersController,
    CommunityplatformAdminReportOfMembersController,
    CommunityplatformAdminDashboardsSystemOverviewController,
    CommunityplatformMemberAnalyticsUsersActivityController,
    CommunityplatformAdminReportsConfigurationsAuditController,
    CommunityplatformAdminAnalyticsModerationMetricsController,
    CommunityplatformMemberAnalyticsSalesDashboardController,
    CommunityplatformAdminAnalyticsSalesDashboardController,
    CommunityplatformAdminAnalyticsInventoryStatusController,
    CommunityplatformSearchProductsController,
    CommunityplatformAdminDashboardAdminCartsAnalyticsController,
    CommunityplatformAnalyticsShipmentsStatusController,
    CommunityplatformAdminAnalyticsShipmentsDelivery_forecastController,
    CommunityplatformAnalyticsShipmentsCost_breakdownController,
    CommunityplatformAdminAnalyticsShipmentsReturn_trendsController,
    CommunityplatformMemberSearchShipmentsController,
    CommunityplatformAdminSearchShipmentsController,
    CommunityplatformAdminDashboardLogisticsOverviewController,
    CommunityplatformMemberShipmentsCompleteController,
    CommunityplatformMemberInventoryMovementsTrendsController,
    CommunityplatformAdminInventoryMovementsTrendsController,
    CommunityplatformInventoryStocksOverviewController,
    CommunityplatformAdminInventoryReordersTriggersController,
    CommunityplatformMemberInventorySuppliersPerformanceController,
    CommunityplatformInventoryLifecyclesDistributionController,
    CommunityplatformInventoryTurnoversRatioController,
    CommunityplatformInventoryAdjustmentsAnomaliesController,
    CommunityplatformAdminInventoryDemandsForecastController,
    CommunityplatformAdminReportsAdminReviewsController,
    CommunityplatformReportsSystemFlagsController,
    CommunityplatformAdminModerationsActionsController,
    CommunityplatformReportsTrackingAnalyticsController,
    CommunityplatformMemberReportsDisputesController,
    CommunityplatformAdminReportsDisputesController,
  ],
})
export class MyModule {}
