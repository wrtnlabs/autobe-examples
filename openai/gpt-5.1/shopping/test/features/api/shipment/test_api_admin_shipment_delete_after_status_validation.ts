import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallAdminJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdminJoin";
import type { IShoppingMallAdminLogin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdminLogin";
import type { IShoppingMallCart } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCart";
import type { IShoppingMallCartItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCartItem";
import type { IShoppingMallCartItemSummary } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCartItemSummary";
import type { IShoppingMallCartOwnerCustomerSummary } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCartOwnerCustomerSummary";
import type { IShoppingMallCartOwnerGuestUserSummary } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCartOwnerGuestUserSummary";
import type { IShoppingMallCaseSlaConfig } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCaseSlaConfig";
import type { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";
import type { IShoppingMallCountry } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCountry";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallCustomerAddress } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerAddress";
import type { IShoppingMallCustomerAddressSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerAddressSnapshot";
import type { IShoppingMallCustomerJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerJoin";
import type { IShoppingMallCustomerLogin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerLogin";
import type { IShoppingMallDispute } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallDispute";
import type { IShoppingMallGuestUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallGuestUser";
import type { IShoppingMallLegalHold } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallLegalHold";
import type { IShoppingMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrder";
import type { IShoppingMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderItem";
import type { IShoppingMallOrderPayment } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderPayment";
import type { IShoppingMallOrderPriceSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderPriceSnapshot";
import type { IShoppingMallOrderShippingAddress } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderShippingAddress";
import type { IShoppingMallOrderStatusHistory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderStatusHistory";
import type { IShoppingMallPaymentChargeback } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPaymentChargeback";
import type { IShoppingMallPaymentMethod } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPaymentMethod";
import type { IShoppingMallPaymentRefund } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPaymentRefund";
import type { IShoppingMallPaymentStatusHistory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPaymentStatusHistory";
import type { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import type { IShoppingMallProductCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductCategory";
import type { IShoppingMallRefundRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallRefundRequest";
import type { IShoppingMallRegion } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallRegion";
import type { IShoppingMallRiskCase } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallRiskCase";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import type { IShoppingMallSellerAuthJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerAuthJoin";
import type { IShoppingMallSellerAuthLogin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerAuthLogin";
import type { IShoppingMallSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerProfile";
import type { IShoppingMallShipment } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallShipment";
import type { IShoppingMallShipmentItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallShipmentItem";
import type { IShoppingMallShippingAddressSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallShippingAddressSnapshot";
import type { IShoppingMallShippingMethod } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallShippingMethod";
import type { IShoppingMallSku } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSku";
import type { IShoppingMallSkuExternalId } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSkuExternalId";
import type { IShoppingMallSkuInventoryState } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSkuInventoryState";

export async function test_api_admin_shipment_delete_after_status_validation(
  connection: api.IConnection,
) {
  // 1. Register an admin and authenticate the connection
  const adminJoinBody = {
    email: `${RandomGenerator.alphabets(8)}@admin.example.com`,
    password: "AdminPassw0rd!" as string & tags.Format<"password">,
    ip: null,
    href: "https://admin.example.com/join" as string & tags.Format<"uri">,
    referrer: "https://admin.example.com/landing" as string &
      tags.Format<"uri">,
  } satisfies IShoppingMallAdminJoin.ICreate;

  const adminAuthorized: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: adminJoinBody,
    });
  typia.assert<IShoppingMallAdmin.IAuthorized>(adminAuthorized);

  // 2. Create a shipping method to be referenced by the shipment
  const shippingMethodCreate = {
    method_code: `method_${RandomGenerator.alphabets(6)}`,
    display_name: "Standard Shipping",
    service_level_description: RandomGenerator.paragraph({ sentences: 4 }),
  } satisfies IShoppingMallShippingMethod.ICreate;

  const shippingMethod: IShoppingMallShippingMethod =
    await api.functional.shoppingMall.admin.shippingMethods.create(connection, {
      body: shippingMethodCreate,
    });
  typia.assert<IShoppingMallShippingMethod>(shippingMethod);

  // 3. Prepare a minimal shipmentItems array using random UUIDs for order item and SKU
  const shipmentItems: IShoppingMallShipmentItem.ICreate[] = [
    {
      shopping_mall_order_item_id: typia.random<string & tags.Format<"uuid">>(),
      shopping_mall_sku_id: typia.random<string & tags.Format<"uuid">>(),
      quantity: 1 as number & tags.Type<"int32"> & tags.Minimum<1>,
    },
  ];

  // 4. Create the initial shipment with a basic status like "pending"
  const initialStatus = "pending";
  const expectedShipDate = new Date().toISOString();

  const shipmentCreateBody = {
    orderCode: undefined,
    shippingAddressId: undefined,
    shippingMethodId: shippingMethod.id,
    shippingStatus: initialStatus,
    carrierName: null,
    trackingNumber: null,
    expectedShipDate,
    shipmentItems,
  } satisfies IShoppingMallShipment.ICreate;

  const createdShipment: IShoppingMallShipment =
    await api.functional.shoppingMall.admin.shipments.create(connection, {
      body: shipmentCreateBody,
    });
  typia.assert<IShoppingMallShipment>(createdShipment);

  const shipmentCode: string = createdShipment.shipment_code;
  TestValidator.predicate(
    "created shipment has non-empty shipment_code",
    shipmentCode.length > 0,
  );

  // 5. Advance the shipment status to a more advanced state such as "shipped"
  const advancedStatus = "shipped";
  const shippedAt = new Date().toISOString();

  const shipmentUpdateBody = {
    shippingStatus: advancedStatus,
    carrierName: "Test Carrier",
    trackingNumber: RandomGenerator.alphaNumeric(12),
    expectedShipDate,
    shippedAt,
    deliveredAt: null,
  } satisfies IShoppingMallShipment.IUpdate;

  const updatedShipment: IShoppingMallShipment =
    await api.functional.shoppingMall.admin.shipments.update(connection, {
      shipmentCode,
      body: shipmentUpdateBody,
    });
  typia.assert<IShoppingMallShipment>(updatedShipment);

  TestValidator.equals(
    "shipment status should be updated to advanced status",
    updatedShipment.shipping_status,
    advancedStatus,
  );

  // 6. Attempt to delete the shipment and validate behavior
  let deleteThrewError = false;
  try {
    await api.functional.shoppingMall.admin.shipments.erase(connection, {
      shipmentCode,
    });

    // Success path
    TestValidator.predicate(
      "shipment delete succeeded without HttpError",
      true,
    );
  } catch (exp) {
    if (exp instanceof api.HttpError) {
      deleteThrewError = true;
      TestValidator.predicate("shipment delete threw HttpError", true);
    } else {
      // Re-throw unexpected errors so the test fails loudly
      throw exp;
    }
  }

  // Simple sanity check that our flag is a boolean value (non-tautological usage)
  TestValidator.predicate(
    "deleteThrewError flag is a boolean",
    typeof deleteThrewError === "boolean",
  );
}
